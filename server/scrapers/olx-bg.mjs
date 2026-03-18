import * as cheerio from "cheerio";

const SITE = "olx.bg";
const PAGES = 3;

export async function scrape(filters) {
  const listings = [];
  const seenIds = new Set();

  let typePath = "";
  if (filters.propertyType === "apartment") typePath = "apartamenti/";
  else if (filters.propertyType === "house") typePath = "kaschi-vili/";
  else if (filters.propertyType === "land") typePath = "polya-gradini-zemya/";

  const location = filters.locationScope === "city" ? "plovdiv/" : "oblast-plovdiv/";
  const params = new URLSearchParams();
  if (filters.priceMin > 0) params.set("search[filter_float_price:from]", String(filters.priceMin));
  if (filters.priceMax < 300000) params.set("search[filter_float_price:to]", String(filters.priceMax));
  params.set("search[order]", "created_at:desc");

  const baseUrl = `https://www.olx.bg/nedvizhimi-imoti/prodazhbi/${typePath}${location}`;

  // Fetch pages in parallel
  const pageUrls = [];
  for (let p = 1; p <= PAGES; p++) {
    const u = new URL(baseUrl);
    u.search = params.toString() + (p > 1 ? `&page=${p}` : "");
    pageUrls.push(u.toString());
  }

  const results = await Promise.allSettled(
    pageUrls.map((url) => fetchAndParse(url)),
  );

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

    $('div[data-cy="l-card"]').each((i, el) => {
      const $card = $(el);
      const id = $card.attr("id");
      const title = $card.find('[data-cy="ad-card-title"] h4').text().trim();
      const priceText = $card.find('[data-testid="ad-price"]').text().trim();
      const href = $card.find('[data-cy="ad-card-title"] a').attr("href");
      const cardUrl = href ? `https://www.olx.bg${href.split("?")[0]}` : null;
      const imgSrc = $card.find("img").attr("src");
      const locationDate = $card.find('[data-testid="location-date"]').text().trim();
      const [loc] = locationDate.split(" - ");
      const paramsText = $card.find('[data-nx-name="P5"]').text().trim();

      const eurMatch = priceText.match(/([\d\s]+)\s*€/);
      const priceEur = eurMatch ? eurMatch[0].trim() : priceText;
      const areaMatch = paramsText.match(/([\d.,]+)\s*кв/);
      const area = areaMatch ? areaMatch[1] : null;

      if (title) {
        items.push({
          id: `olx-${id || i}`,
          site: SITE,
          title,
          location: loc?.trim() || "",
          price: priceEur,
          priceNum: parsePrice(priceEur),
          image: imgSrc || null,
          url: cardUrl,
          area,
          description: paramsText || "",
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
