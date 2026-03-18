import type { Filters, ApiResponse } from "./types";

export async function fetchListings(filters: Filters): Promise<ApiResponse> {
  const params = new URLSearchParams({
    type: filters.propertyType,
    priceMin: String(filters.priceMin),
    priceMax: String(filters.priceMax),
    scope: filters.locationScope,
  });

  const res = await fetch(`/api/listings?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}
