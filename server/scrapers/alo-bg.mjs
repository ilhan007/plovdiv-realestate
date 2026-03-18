import * as cheerio from "cheerio";

const SITE = "alo.bg";
const PAGES = 3;

const PLOVDIV_KEYWORDS = [
  "пловдив", "plovdiv", "асеновград", "карлово", "хисаря", "сопот",
  "кричим", "перущица", "стамболийски", "раковски", "куклен", "садово",
  "родопи", "марково", "белащица", "брестник", "труд", "първенец",
  "крумово", "ягодово", "костиево", "цалапица", "браниполе",
  "остромила", "беломорски", "тракия", "кършияка", "южен", "център",
  "смирненски", "каменица", "гагарин", "кючук париж",
];

export async function scrape(filters) {
  const listings = [];
  const seenIds = new Set();

  let subcat = "";
  if (filters.propertyType === "apartment") subcat = "/apartamenti-stai";
  else if (filters.propertyType === "house") subcat = "/kashti-vili";
  else if (filters.propertyType === "land") subcat = "/partseli-zemya";

  const pageUrls = [];
  for (let p = 1; p <= PAGES; p++) {
    const url = `https://www.alo.bg/obiavi/imoti-prodajbi${subcat}/?region_id=16&order_by=time-desc${p > 1 ? `&page=${p}` : ""}`;
    pageUrls.push(url);
  }

  const results = await Promise.allSettled(pageUrls.map((url) => fetchAndParse(url, filters)));

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

    $('[id^="adrows_"]').each((i, el) => {
      const $item = $(el);
      const id = $item.attr("id")?.replace("adrows_", "");
      const title = $item.find("a.avn_seo").text().trim();
      const href = $item.find("a.avn_seo").attr("href") || $item.find("a.avn_image").attr("href");
      const itemUrl = href ? `https://www.alo.bg${href}` : null;

      const imgEl = $item.find("a.avn_image img");
      const imgSrc = imgEl.attr("src");
      const image = imgSrc ? (imgSrc.startsWith("http") ? imgSrc : `https://www.alo.bg/${imgSrc}`) : null;

      const priceText = $item.find("span.avn_price").text().trim();
      const eurMatch = priceText.match(/([\d\s]+)\s*€/);
      const priceEur = eurMatch ? eurMatch[1].trim() + " €" : priceText;

      const location = $item.find("span.avn_location").text().trim();

      // Skip non-Plovdiv
      const locLower = (location + " " + title).toLowerCase();
      if (!PLOVDIV_KEYWORDS.some((kw) => locLower.includes(kw))) return;

      const altText = imgEl.attr("alt") || "";
      const areaMatch = altText.match(/([\d.,]+)\s*кв\.?\s*м/);
      const area = areaMatch ? areaMatch[1] : null;

      const priceNum = parsePrice(priceEur);
      if (filters.priceMin > 0 && priceNum && priceNum < filters.priceMin) return;
      if (filters.priceMax < 300000 && priceNum && priceNum > filters.priceMax) return;

      if (title) {
        items.push({
          id: `alo-${id || i}`,
          site: "alo.bg",
          title,
          location,
          price: priceEur || "Цена при запитване",
          priceNum,
          image,
          url: itemUrl,
          area,
          description: "",
        });
      }
    });
  } catch (err) {
    console.error(`[alo.bg] page error:`, err.message);
  }
  return items;
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = text.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : null;
}
