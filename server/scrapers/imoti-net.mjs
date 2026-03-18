import * as cheerio from "cheerio";

const SITE = "imoti.net";
const PAGES = 3;

export async function scrape(filters) {
  const listings = [];
  const seenIds = new Set();

  try {
    const formParams = new URLSearchParams();
    formParams.set("ad_type_id", "2");
    formParams.set("world_area_id", filters.locationScope === "city" ? "2" : "38");

    if (filters.propertyType === "apartment") {
      for (const id of ["5", "6", "9", "27", "10", "8"]) {
        formParams.append("property_type_id[]", id);
      }
    } else if (filters.propertyType === "house") {
      formParams.append("property_type_id[]", "14");
      formParams.append("property_type_id[]", "25");
    } else if (filters.propertyType === "land") {
      formParams.append("property_type_id[]", "15");
      formParams.append("property_type_id[]", "16");
    }

    if (filters.priceMin > 0) formParams.set("price-range-from", String(filters.priceMin));
    if (filters.priceMax < 300000) formParams.set("price-range-to", String(filters.priceMax));
    formParams.set("price-range-currency", "eur");
    formParams.set("items_per_page", "30");

    // Page 1: POST to get session
    const res = await fetch("https://www.imoti.net/bg/obiavi/r", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "bg-BG,bg;q=0.9",
      },
      body: formParams.toString(),
      redirect: "follow",
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    parsePage($, listings, seenIds, 0);

    // Extract sid from pagination links for subsequent pages
    const nextLink = $("nav.paginator a.next-page-btn").attr("href");
    if (nextLink) {
      const sidMatch = nextLink.match(/sid=([^&]+)/);
      const pathMatch = nextLink.match(/^(\/bg\/obiavi\/r\/[^?]+)/);
      if (sidMatch && pathMatch) {
        const sid = sidMatch[1];
        const basePath = pathMatch[1];

        // Fetch remaining pages in parallel
        const pageUrls = [];
        for (let p = 2; p <= PAGES; p++) {
          pageUrls.push(`https://www.imoti.net${basePath}?page=${p}&sid=${sid}`);
        }

        const pageResults = await Promise.allSettled(
          pageUrls.map(async (url) => {
            const r = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept-Language": "bg-BG,bg;q=0.9",
              },
            });
            return cheerio.load(await r.text());
          }),
        );

        for (const r of pageResults) {
          if (r.status === "fulfilled") {
            parsePage(r.value, listings, seenIds, listings.length);
          }
        }
      }
    }
  } catch (err) {
    console.error(`[${SITE}] scrape error:`, err.message);
  }

  return listings;
}

function parsePage($, listings, seenIds, offset) {
  $("ul.list-view.real-estates > li").each((i, el) => {
    const $el = $(el);
    const link = $el.find("a.box-link").attr("href");
    const idMatch = link?.match(/\/(\d+)\//);
    const listingId = idMatch ? idMatch[1] : `${offset + i}`;

    if (seenIds.has(listingId)) return;
    seenIds.add(listingId);

    const itemUrl = link ? `https://www.imoti.net${link}` : null;
    const titleRaw = $el.find(".real-estate-text h3").text().trim();
    const location = $el.find("span.location").text().trim();

    const priceText = $el.find("strong.price").text().trim();
    const eurMatch = priceText.match(/([\d\s]+)\s*€/);
    const priceEur = eurMatch ? eurMatch[1].trim() + " €" : priceText;

    const imgSrc = $el.find(".mini-re-pic img").attr("src");
    const image = imgSrc ? `https://www.imoti.net${imgSrc}` : null;

    const areaEl = $el.find(".real-estate-text h3 > span").text().trim();
    const areaMatch = areaEl.match(/([\d.,]+)/);
    const area = areaMatch ? areaMatch[1] : null;

    const floorText = $el.find("ul.parameters li").filter((_, li) =>
      $(li).text().includes("Етаж:")
    ).text().trim();

    const description = $el.find(".real-estate-text > p:last-of-type").text().trim();

    if (titleRaw) {
      listings.push({
        id: `imotinet-${listingId}`,
        site: "imoti.net",
        title: titleRaw.replace(/^продава\s*/i, "").trim(),
        location,
        price: priceEur,
        priceNum: parsePrice(priceEur),
        image,
        url: itemUrl,
        area,
        description: (floorText ? floorText + " | " : "") + description.substring(0, 200),
      });
    }
  });
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : null;
}
