import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { numericToAlpha2 } from './countries';
import { inFocus } from './region';

export type CountryFeature = Feature<Geometry, { name: string; code?: string }>;

type WorldTopo = Topology<{ countries: GeometryCollection<{ name: string }> }>;

function toFeatures(mod: unknown): CountryFeature[] {
  const topo = ((mod as { default?: unknown }).default ?? mod) as WorldTopo;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  return fc.features
    .filter((f) => f.properties.name !== 'Antarctica')
    .map((f) => ({ ...f, properties: { ...f.properties, code: numericToAlpha2(f.id) } }));
}

let cache: Promise<CountryFeature[]> | undefined;

/**
 * Ländergrenzen, erst bei Bedarf geladen: Europa & Nahost detailliert (Natural Earth 1:50m),
 * der Rest der Welt grob (1:110m). Spart viel Geometrie und hält den Globus flüssig.
 */
export function loadCountries(): Promise<CountryFeature[]> {
  cache ??= Promise.all([import('world-atlas/countries-50m.json'), import('world-atlas/countries-110m.json')]).then(
    ([fine, coarse]) => {
      const detailed = toFeatures(fine).filter((f) => f.properties.code && inFocus(f.properties.code));
      const covered = new Set(detailed.map((f) => f.properties.code));
      return [...detailed, ...toFeatures(coarse).filter((f) => !f.properties.code || !covered.has(f.properties.code))];
    },
  );
  return cache;
}
