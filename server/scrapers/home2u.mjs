import * as cheerio from "cheerio";

const SITE = "home2u.bg";
const PAGES = 10;

const TYPE_URLS = {
  apartment: "https://home2u.bg/apartamenti-plovdiv/",
  house: "https://home2u.bg/kashti-plovdiv/",
  land: "https://home2u.bg/partseli-plovdiv/",
  all: "https://home2u.bg/nedvizhimi-imoti-plovdiv/",
};

export async function scrape(filters) {
  const listings = [];
  const seenUrls = new Set();

  const baseUrl = TYPE_URLS[filters.propertyType] || TYPE_URLS.all;

  // Fetch pages in parallel
  const pageUrls = [];
  for (let p = 1; p <= PAGES; p++) {
    pageUrls.push(p === 1 ? baseUrl : `${baseUrl}page/${p}/`);
  }

  const results = await Promise.allSettled(pageUrls.map((url) => fetchAndParse(url, filters)));

  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          listings.push(item);
        }
      }
    }
  }

  return listings;
}

async function fetchAndParse(url, filters) {
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

    $("article.article-catalog").each((i, el) => {
      const $article = $(el);

      const title = $article.find(".article-catalog__body-title h3 a").text().trim();
      const itemUrl = $article.find(".article-catalog__body-title h3 a").attr("href");
      const priceText = $article.find(".article-catalog__body-foot h4").text().trim();
      const imgSrc = $article.find(".article-catalog__image img").attr("src");
      const location = $article.find(".article-catalog__body-meta li").first().find("p").text().replace(/\s+/g, " ").trim();
      const areaText = $article.find(".article-catalog__body-meta li").eq(1).find("p").text().trim();
      const areaMatch = areaText.match(/([\d.,]+)/);
      const area = areaMatch ? areaMatch[1] : null;
      const description = $article.find(".article-catalog__body-content").text().trim();

      let image = imgSrc || null;
      if (image) image = image.replace(/-\d+x\d+\./, ".");

      const priceNum = parsePrice(priceText);
      if (filters.priceMin > 0 && priceNum && priceNum < filters.priceMin) return;
      if (filters.priceMax < 300000 && priceNum && priceNum > filters.priceMax) return;

      if (title) {
        items.push({
          id: `home2u-${itemUrl || i}`,
          site: "home2u.bg",
          title,
          location,
          price: priceText || "Цена при запитване",
          priceNum,
          image,
          url: itemUrl,
          area,
          description: description.substring(0, 200),
        });
      }
    });
  } catch (err) {
    console.error(`[home2u.bg] page error:`, err.message);
  }
  return items;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : null;
}
