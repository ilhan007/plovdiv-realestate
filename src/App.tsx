import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchListings } from "./api";
import type {
  Filters,

  LocationScope,
  SortBy,
  Listing,
  ApiResponse,
} from "./types";
import { DEFAULT_FILTERS, SITE_COLORS } from "./types";
import "./App.css";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='280' height='200' fill='%23e0e0e0'%3E%3Crect width='280' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='14'%3EНяма снимка%3C/text%3E%3C/svg%3E";

function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSiteFilter, setActiveSiteFilter] = useState<string | null>(null);
  const [activeLocationFilter, setActiveLocationFilter] = useState<string | null>(null);

  // Well-known neighborhoods/villages to always show as quick chips
  const PINNED_LOCATIONS = [
    "Марково", "Остромила", "Беломорски", "Белащица", "Брестник",
    "Тракия", "Кършияка", "Център", "Смирненски", "Кючук Париж",
    "Каменица", "Южен", "Гагарин", "Куклен", "Храбрино",
    "Бойково", "Дедево", "Златитрап", "Брестовица",
    "Първенец", "Крумово", "Ягодово", "Цалапица", "Труд",
  ];

  const updateFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSortBy("newest");
    setActiveSiteFilter(null);
    setActiveLocationFilter(null);
  }, []);

  // Fetch listings when filters change (debounced) - sortBy is client-only, no refetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchListings(filters)
        .then((res) => {
          setData(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  // Sort and filter listings client-side
  const displayListings = useMemo(() => {
    if (!data) return [];
    let items = [...data.listings];

    // Filter by site
    if (activeSiteFilter) {
      items = items.filter((l) => l.site === activeSiteFilter);
    }

    // Filter by location
    if (activeLocationFilter) {
      const q = activeLocationFilter.toLowerCase();
      items = items.filter((l) => {
        const loc = (l.location + " " + l.title).toLowerCase();
        return loc.includes(q);
      });
    }

    // Sort
    if (sortBy === "price-asc") {
      items.sort((a, b) => (a.priceNum ?? Infinity) - (b.priceNum ?? Infinity));
    } else if (sortBy === "price-desc") {
      items.sort((a, b) => (b.priceNum ?? 0) - (a.priceNum ?? 0));
    }

    return items;
  }, [data, sortBy, activeSiteFilter, activeLocationFilter]);

  // Count listings per pinned location (from all listings, not filtered)
  const locationCounts = useMemo(() => {
    if (!data) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const loc of PINNED_LOCATIONS) {
      const q = loc.toLowerCase();
      let count = 0;
      for (const l of data.listings) {
        if ((l.location + " " + l.title).toLowerCase().includes(q)) count++;
      }
      if (count > 0) counts.set(loc, count);
    }
    return counts;
  }, [data]);


  return (
    <div className="app">
      {/* Header */}
      <ui5-shellbar
        primary-title={filters.propertyType === "land" ? "Парцели Пловдив" : "Къщи Пловдив"}
        secondary-title={
          data
            ? `${data.total} обяви от ${Object.keys(data.sites).length} сайта`
            : "Зареждане..."
        }
      />

      <div className="layout">
        {/* Sidebar Filters */}
        <aside className="sidebar">
          <div className="filters-panel">
            {/* Property Type Switch: Къщи / Парцели */}
            <div className="type-switch">
              <button
                className={`type-switch-btn ${filters.propertyType === "house" ? "active" : ""}`}
                onClick={() => { updateFilter("propertyType", "house"); setActiveSiteFilter(null); setActiveLocationFilter(null); }}
              >
                Къщи
              </button>
              <button
                className={`type-switch-btn ${filters.propertyType === "land" ? "active" : ""}`}
                onClick={() => { updateFilter("propertyType", "land"); setActiveSiteFilter(null); setActiveLocationFilter(null); }}
              >
                Парцели
              </button>
            </div>

            <div className="filters-header">
              <ui5-title level="H5">Филтри</ui5-title>
              <ui5-button
                design="Transparent"
                icon="reset"
                tooltip="Нулиране"
                onClick={resetFilters}
              />
            </div>

            {/* Location */}
            <div className="filter-group">
              <ui5-label show-colon>Локация</ui5-label>
              <ui5-segmented-button
                onSelectionChange={(e: any) => {
                  const sel = e.detail.selectedItems?.[0];
                  if (sel) updateFilter("locationScope", sel.getAttribute("data-value") as LocationScope);
                }}
              >
                <ui5-segmented-button-item data-value="city" selected={filters.locationScope === "city" || undefined}>
                  гр. Пловдив
                </ui5-segmented-button-item>
                <ui5-segmented-button-item data-value="region" selected={filters.locationScope === "region" || undefined} icon="map">
                  Област (~50 км)
                </ui5-segmented-button-item>
              </ui5-segmented-button>
            </div>

            {/* Price Range */}
            <div className="filter-group">
              <ui5-label show-colon>Цена (EUR)</ui5-label>
              <div className="price-chips">
                {([
                  { label: "Всички", min: 0, max: 300000 },
                  { label: "< 100k", min: 0, max: 100000 },
                  { label: "100–200k", min: 100000, max: 200000 },
                  { label: "200–300k", min: 200000, max: 300000 },
                  { label: "300k+", min: 300000, max: 9999999 },
                ] as const).map((range) => (
                  <button
                    key={range.label}
                    className={`price-chip ${filters.priceMin === range.min && filters.priceMax === range.max ? "active" : ""}`}
                    onClick={() => {
                      updateFilter("priceMin", range.min);
                      updateFilter("priceMax", range.max);
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="filter-group">
              <ui5-label show-colon>Сортиране</ui5-label>
              <ui5-segmented-button
                onSelectionChange={(e: any) => {
                  const sel = e.detail.selectedItems?.[0];
                  if (sel) setSortBy(sel.getAttribute("data-value") as SortBy);
                }}
              >
                <ui5-segmented-button-item data-value="newest" selected={sortBy === "newest" || undefined}>
                  Най-нови
                </ui5-segmented-button-item>
                <ui5-segmented-button-item data-value="price-asc" selected={sortBy === "price-asc" || undefined}>
                  Цена ↑
                </ui5-segmented-button-item>
                <ui5-segmented-button-item data-value="price-desc" selected={sortBy === "price-desc" || undefined}>
                  Цена ↓
                </ui5-segmented-button-item>
              </ui5-segmented-button>
            </div>

            {/* Site Status */}
            {data && (
              <div className="filter-group site-chips">
                <ui5-label show-colon>Сайтове</ui5-label>
                <div className="chip-list">
                  {Object.entries(data.sites).map(([site, info]) => (
                    <button
                      key={site}
                      className={`site-chip ${activeSiteFilter === site ? "active" : ""} ${info.error ? "error" : ""}`}
                      style={{ "--chip-color": SITE_COLORS[site] || "#666" } as React.CSSProperties}
                      onClick={() => setActiveSiteFilter(activeSiteFilter === site ? null : site)}
                    >
                      <span className="chip-name">{site}</span>
                      <span className="chip-count">{info.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Quick location chips */}
          {data && locationCounts.size > 0 && (
            <div className="location-chips">
              <button
                className={`loc-chip ${activeLocationFilter === null ? "active" : ""}`}
                onClick={() => setActiveLocationFilter(null)}
              >
                Всички
              </button>
              {[...locationCounts.entries()]
                .sort((a, b) => b[1] - a[1]) // most listings first
                .map(([loc, count]) => (
                  <button
                    key={loc}
                    className={`loc-chip ${activeLocationFilter === loc ? "active" : ""}`}
                    onClick={() => setActiveLocationFilter(activeLocationFilter === loc ? null : loc)}
                  >
                    {loc} <span className="loc-count">{count}</span>
                  </button>
                ))}
            </div>
          )}

          {loading && (
            <div className="loading-bar">
              <ui5-button design="Transparent" disabled>
                Търсене в 6 сайта...
              </ui5-button>
              <div className="progress-track"><div className="progress-fill" /></div>
            </div>
          )}

          {error && (
            <div className="error-msg">Грешка: {error}</div>
          )}

          {!loading && data && displayListings.length === 0 && (
            <div className="empty-state">
              <ui5-icon name="search" style={{ fontSize: "3rem", opacity: 0.3, marginBottom: "1rem" }} />
              <p>Няма намерени обяви с тези филтри</p>
            </div>
          )}

          <div className="listings-grid">
            {displayListings.map((listing, i) => (
              <ListingCard key={`${listing.id}-${i}`} listing={listing} />
            ))}
          </div>

          {!loading && data && (
            <div className="results-summary">
              Показани: {displayListings.length} от {data.total} обяви
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const siteColor = SITE_COLORS[listing.site] || "#666";

  return (
    <div className="listing-card">
      {/* Image */}
      <div className="listing-img-wrap">
        <img
          src={listing.image || PLACEHOLDER_IMG}
          alt={listing.title}
          className="listing-img"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMG; }}
        />
        {/* Site badge */}
        <span className="site-badge" style={{ background: siteColor }}>
          {listing.site}
        </span>
        {/* Altitude badge */}
        {listing.altitude && (
          <span className={`altitude-badge altitude-${listing.altitude.category}`}>
            {listing.altitude.meters} м
          </span>
        )}
      </div>

      {/* Content */}
      <div className="listing-body">
        {/* Price - prominent */}
        <div className="listing-price">
          {listing.price || "Цена при запитване"}
        </div>

        {/* Title */}
        <h3 className="listing-title">{listing.title}</h3>

        {/* Location */}
        {listing.location && (
          <div className="listing-location">
            <ui5-icon name="map" /> {listing.location}
          </div>
        )}

        {/* Meta row */}
        <div className="listing-meta">
          {listing.area && (
            <ui5-tag design="Set2" color-scheme="6">{listing.area} м²</ui5-tag>
          )}
          {listing.altitude && (
            <ui5-tag design="Set2" color-scheme={listing.altitude.category === "mountain" ? "1" : listing.altitude.category === "high" ? "2" : listing.altitude.category === "mid" ? "8" : "6"}>
              {listing.altitude.text} ({listing.altitude.settlement})
            </ui5-tag>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <p className="listing-desc">{listing.description}</p>
        )}

        {/* Link to original */}
        {listing.url && (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="listing-link"
          >
            Виж в {listing.site} →
          </a>
        )}
      </div>
    </div>
  );
}

export default App;
