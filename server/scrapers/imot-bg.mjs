import * as cheerio from "cheerio";
import iconv from "iconv-lite";

const SITE = "imot.bg";
const PAGES = 10;

const TYPE_MAP = {
  apartment: "1,2,3,4,5,6",
  house: "10,11",
  land: "7,9,12",
  all: "",
};

export async function scrape(filters) {
  const listings = [];
  const seenIds = new Set();

  const params = new URLSearchParams();
  params.set("act", "3");
  params.set("rub", "1");
  params.set("f1", "1");
  params.set("f4", "1");
  params.set("f41", "2");

  if (TYPE_MAP[filters.propertyType]) {
    params.set("f7", TYPE_MAP[filters.propertyType]);
  }
  if (filters.priceMin > 0) params.set("f28", String(filters.priceMin));
  if (filters.priceMax < 300000) params.set("f29", String(filters.priceMax));
  params.set("f30", "EUR");

  const locationText = filters.locationScope === "city" ? "град Пловдив" : "област Пловдив";
  const locationEncoded = iconv.encode(locationText, "win1251");
  let encodedStr = "";
  for (const byte of locationEncoded) {
    if ((byte >= 0x41 && byte <= 0x5a) || (byte >= 0x61 && byte <= 0x7a) || (byte >= 0x30 && byte <= 0x39)) {
      encodedStr += String.fromCharCode(byte);
    } else if (byte === 0x20) {
      encodedStr += "+";
    } else {
      encodedStr += "%" + byte.toString(16).toUpperCase().padStart(2, "0");
    }
  }

  // Page 1: POST request
  try {
    const body = params.toString() + "&f38=" + encodedStr;
    const res = await fetch("https://www.imot.bg/pcgi/imot.cgi", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      body,
    });

    const buffer = Buffer.from(await res.arrayBuffer());
    const html = iconv.decode(buffer, "win1251");
    const $ = cheerio.load(html);
    parsePage($, listings, seenIds);

    // Find next page URLs from pagination
    const nextUrls = [];
    $("div.pagination a.saveSlink").each((i, el) => {
      const href = $(el).attr("href");
      if (href && nextUrls.length < PAGES - 1) {
        nextUrls.push(href.startsWith("http") ? href : "https:" + href);
      }
    });

    // Fetch remaining pages in parallel
    if (nextUrls.length > 0) {
      const pageResults = await Promise.allSettled(
        nextUrls.map((url) => fetchPage(url)),
      );
      for (const r of pageResults) {
        if (r.status === "fulfilled" && r.value) {
          parsePage(r.value, listings, seenIds);
        }
      }
    }
  } catch (err) {
    console.error(`[${SITE}] scrape error:`, err.message);
  }

  return listings;
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
  });
  const buffer = Buffer.from(await res.arrayBuffer());
  const html = iconv.decode(buffer, "win1251");
  return cheerio.load(html);
}

function parsePage($, listings, seenIds) {
  $("div.ads2023 > div.item:not(.fakti)").each((i, el) => {
    const $el = $(el);
    const elId = $el.attr("id") || `p${listings.length}-${i}`;
    if (seenIds.has(elId)) return;
    seenIds.add(elId);

    const titleEl = $el.find("a.title.saveSlink");
    const title = titleEl.contents().first().text().trim();
    const location = titleEl.find("location").text().trim();
    const href = titleEl.attr("href");
    const url = href ? (href.startsWith("http") ? href : "https:" + href) : null;
    const imgSrc = $el.find("div.photo div.big img.pic").attr("src");
    const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : "https:" + imgSrc) : null;

    const priceHtml = $el.find("div.price div").html() || "";
    const priceEur = priceHtml.split("<br")[0]?.trim() || "";
    const info = $el.find("div.info").text().trim();
    const areaMatch = info.match(/([\d.,]+)\s*кв\.?\s*м/);
    const area = areaMatch ? areaMatch[1] : null;

    if (title || priceEur) {
      listings.push({
        id: `imot-${elId}`,
        site: "imot.bg",
        title,
        location,
        price: priceEur,
        priceNum: parsePrice(priceEur),
        image,
        url,
        area,
        description: info.substring(0, 200),
      });
    }
  });
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : null;
}
