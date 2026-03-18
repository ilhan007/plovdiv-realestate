export interface Listing {
  id: string;
  site: string;
  title: string;
  location: string;
  price: string;
  priceNum: number | null;
  image: string | null;
  url: string | null;
  area: string | null;
  description: string;
  altitude?: {
    text: string;
    settlement: string;
    category: "low" | "mid" | "high" | "mountain";
    meters: number;
  } | null;
}

export interface ApiResponse {
  total: number;
  sites: Record<string, { count: number; error: string | null }>;
  listings: Listing[];
}

export type PropertyType = "apartment" | "house" | "land" | "all";
export type LocationScope = "city" | "region";
export type SortBy = "newest" | "price-asc" | "price-desc";

export interface Filters {
  propertyType: PropertyType;
  priceMin: number;
  priceMax: number;
  locationScope: LocationScope;
}

export const DEFAULT_FILTERS: Filters = {
  propertyType: "house",
  priceMin: 0,
  priceMax: 300000,
  locationScope: "region",
};

export const SITE_COLORS: Record<string, string> = {
  "imot.bg": "#1a5276",
  "olx.bg": "#002f34",
  "alo.bg": "#e67e22",
  "bazar.bg": "#27ae60",
  "imoti.net": "#c0392b",
  "home2u.bg": "#8e44ad",
};
