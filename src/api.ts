import type { Filters, Listing, ApiResponse } from "./types";

interface SiteEvent {
  site: string;
  listings: Listing[];
  error: string | null;
  done: boolean;
}

export async function fetchListings(
  filters: Filters,
  onSiteResult: (data: ApiResponse) => void,
): Promise<ApiResponse> {
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

  const contentType = res.headers.get("content-type") || "";

  // Cached response comes as plain JSON
  if (contentType.includes("application/json")) {
    const data = await res.json();
    onSiteResult(data);
    return data;
  }

  // SSE stream — parse incrementally
  const allListings: Listing[] = [];
  const sites: Record<string, { count: number; error: string | null }> = {};

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event: SiteEvent = JSON.parse(line.slice(6));

      sites[event.site] = { count: event.listings.length, error: event.error };
      allListings.push(...event.listings);

      onSiteResult({
        total: allListings.length,
        sites: { ...sites },
        listings: [...allListings],
      });
    }
  }

  return { total: allListings.length, sites, listings: allListings };
}
