import express from "express";
import { scrape as scrapeImotBg } from "./scrapers/imot-bg.mjs";
import { scrape as scrapeOlx } from "./scrapers/olx-bg.mjs";
import { scrape as scrapeAlo } from "./scrapers/alo-bg.mjs";
import { scrape as scrapeBazar } from "./scrapers/bazar-bg.mjs";
import { scrape as scrapeImotiNet } from "./scrapers/imoti-net.mjs";
import { scrape as scrapeHome2u } from "./scrapers/home2u.mjs";
import { getAltitude, getAltitudeBadge } from "./altitude.mjs";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(filters) {
  return JSON.stringify(filters);
}

// All scrapers with their names
const SCRAPERS = [
  { name: "imot.bg", fn: scrapeImotBg },
  { name: "olx.bg", fn: scrapeOlx },
  { name: "alo.bg", fn: scrapeAlo },
  { name: "bazar.bg", fn: scrapeBazar },
  { name: "imoti.net", fn: scrapeImotiNet },
  { name: "home2u.bg", fn: scrapeHome2u },
];

// SSE endpoint — streams results as each scraper finishes
app.get("/api/listings", async (req, res) => {
  const filters = {
    propertyType: req.query.type || "all",
    priceMin: parseInt(req.query.priceMin) || 0,
    priceMax: parseInt(req.query.priceMax) || 300000,
    locationScope: req.query.scope || "region",
  };

  const sitesParam = req.query.sites;
  const requestedSites = sitesParam ? sitesParam.split(",") : null;
  const key = getCacheKey({ ...filters, sites: requestedSites });

  // If cached, return full JSON (not SSE)
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return res.json(cached.data);
  }

  const scrapers = requestedSites
    ? SCRAPERS.filter((s) => requestedSites.includes(s.name))
    : SCRAPERS;

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  console.log(`[API] Streaming ${scrapers.map((s) => s.name).join(", ")}...`);

  const allListings = [];
  const siteStatus = {};
  let completed = 0;

  // Run all scrapers in parallel, stream each result as it arrives
  await Promise.allSettled(
    scrapers.map(async (s) => {
      let site = s.name;
      let listings = [];
      let error = null;
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000),
        );
        listings = await Promise.race([s.fn(filters), timeout]);
      } catch (err) {
        error = err.message;
      }

      // Add altitude info
      for (const listing of listings) {
        const alt = getAltitude(listing.location);
        if (alt) listing.altitude = getAltitudeBadge(alt);
        allListings.push(listing);
      }

      siteStatus[site] = { count: listings.length, error };
      completed++;

      // Send this batch to the client
      const event = { site, listings, error, done: completed === scrapers.length };
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }),
  );

  // Cache the full result
  const fullResponse = { total: allListings.length, sites: siteStatus, listings: allListings };
  cache.set(key, { data: fullResponse, time: Date.now() });
  console.log(`[API] Total: ${allListings.length} listings from ${Object.keys(siteStatus).length} sites`);

  res.end();
});

// Health check
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", scrapers: SCRAPERS.map((s) => s.name) });
});

// Serve built React frontend in production
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath, {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".css")) res.setHeader("Content-Type", "text/css");
    if (filePath.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
  },
}));
app.get("*path", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  Plovdiv RE API running on http://localhost:${PORT}`);
  console.log(`  Scrapers: ${SCRAPERS.map((s) => s.name).join(", ")}\n`);
});
