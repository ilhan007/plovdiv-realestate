import * as cheerio from "cheerio";

const SITE = "bazar.bg";
const PAGES = 10;

export async function scrape(filters) {
  const listings = [];
  const seenIds = new Set();

  let typePath = "imoti";
  if (filters.propertyType === "apartment") typePath = "apartamenti";
  else if (filters.propertyType === "house") typePath = "kashti-vili";
  else if (filters.propertyType === "land") typePath = "partseli";

  const params = new URLSearchParams();
  if (filters.priceMin > 0) params.set("price_from", String(filters.priceMin));
  if (filters.priceMax < 300000) params.set("price_to", String(filters.priceMax));
  params.set("sort", "date");

  const pageUrls = [];
  for (let p = 1; p <= PAGES; p++) {
    const pParams = new URLSearchParams(params);
    if (p > 1) pParams.set("page", String(p));
    pageUrls.push(`https://bazar.bg/obiavi/${typePath}/plovdiv?${pParams.toString()}`);
  }

  const results = await Promise.allSettled(pageUrls.map((url) => fetchAndParse(url)));

  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          listings.push(item);
        }
      }
    }
  }

  return listings;
}

async function fetchAndParse(url) {
  const items = [];
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept-Language": "bg-BG,bg;q=0.9",
      },
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    $("div.listItemContainer").each((i, el) => {
      const $el = $(el);
      const $link = $el.find("a.listItemLink");

      const id = $link.attr("data-id");
      const title = $link.find("div.title > span.title").text().trim();
      const itemUrl = $link.attr("href");
      const location = $link.find("span.location").text().trim();
      const date = $link.find("span.date").text().trim();

      const imgDataSrc = $link.find("img.cover").attr("data-src");
      const image = imgDataSrc
        ? (imgDataSrc.startsWith("//") ? "https:" + imgDataSrc : imgDataSrc)
        : null;

      const priceEurText = $link.find("span.price").eq(0).contents().first().text().trim();
      const currency = $link.find("span.price").eq(0).find("span.currency").text().trim();
      const priceDisplay = priceEurText ? `${priceEurText} ${currency}` : "Цена при запитване";

      if (title) {
        items.push({
          id: `bazar-${id || i}`,
          site: SITE,
          title,
          location,
          price: priceDisplay,
          priceNum: parsePrice(priceEurText),
          image,
          url: itemUrl || null,
          area: null,
          description: date ? `Публикувано: ${date}` : "",
        });
      }
    });
  } catch (err) {
    console.error(`[${SITE}] page error:`, err.message);
  }
  return items;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : null;
}
