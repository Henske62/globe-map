import { geoBounds, geoContains, geoEquirectangular, geoPath } from 'd3-geo';
import { BufferGeometry, CanvasTexture, Float32BufferAttribute, LineBasicMaterial, LineSegments, SRGBColorSpace } from 'three';
import type { Position } from 'geojson';
import type { CountryFeature } from './worldGeo';

/**
 * Performance-Bausteine für den Globus: Statt hunderter Länder-Meshes (je ein Draw-Call)
 * gibt es eine einzige Textur für die Flächen und ein einziges Linienobjekt für die Grenzen.
 */

/** Länderflächen als equirektanguläre Textur (passt direkt auf die Globus-Kugel). */
export function drawCountryTexture(
  countries: CountryFeature[],
  fill: (f: CountryFeature) => string,
  ocean: string,
  width = 4096,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width / 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, width / 4]);
  const path = geoPath(projection, ctx);
  for (const f of countries) {
    ctx.beginPath();
    path(f);
    ctx.fillStyle = fill(f);
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function rings(f: CountryFeature): Position[][] {
  const g = f.geometry;
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.flat();
  return [];
}

/** Alle Ländergrenzen als ein LineSegments-Objekt, knapp über der Oberfläche. */
export function buildBorderLines(
  countries: CountryFeature[],
  toXYZ: (lat: number, lng: number) => { x: number; y: number; z: number },
  color: string,
): LineSegments {
  const positions: number[] = [];
  for (const f of countries) {
    for (const ring of rings(f)) {
      for (let i = 1; i < ring.length; i++) {
        const a = toXYZ(ring[i - 1][1], ring[i - 1][0]);
        const b = toXYZ(ring[i][1], ring[i][0]);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new LineSegments(geometry, new LineBasicMaterial({ color, transparent: true, opacity: 0.85 }));
}

/** Schnelle Land-Suche per Koordinate (Bounding-Box-Vorfilter, dann exakter Test). */
export function countryLocator(countries: CountryFeature[]) {
  const boxes = countries.map((f) => ({ f, b: geoBounds(f) }));
  return (lat: number, lng: number): CountryFeature | undefined => {
    for (const { f, b } of boxes) {
      const [[w, s], [e, n]] = b;
      if (lat < s || lat > n) continue;
      const inLng = w <= e ? lng >= w && lng <= e : lng >= w || lng <= e; // über die Datumsgrenze
      if (inLng && geoContains(f, [lng, lat])) return f;
    }
    return undefined;
  };
}
