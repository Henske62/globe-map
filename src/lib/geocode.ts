export interface Place {
  name: string;
  label: string;
  lat: number;
  lng: number;
  countryCode: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: { country_code?: string; city?: string; town?: string; village?: string; state?: string; country?: string };
}

/**
 * Ortssuche über OpenStreetMap Nominatim (kostenlos, ohne API-Key).
 * Nutzungsbedingungen: max. 1 Anfrage/Sekunde -> die Suche ist im UI gedrosselt.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    'accept-language': 'de',
  }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Ortssuche fehlgeschlagen (${res.status})`);
  const results = (await res.json()) as NominatimResult[];
  return results.map((r) => {
    const a = r.address ?? {};
    const name = r.name || a.city || a.town || a.village || r.display_name.split(',')[0];
    return {
      name,
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      countryCode: (a.country_code ?? '').toUpperCase(),
    };
  });
}
