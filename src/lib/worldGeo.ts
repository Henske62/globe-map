import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import { numericToAlpha2 } from './countries';

export type CountryFeature = Feature<Geometry, { name: string; code?: string }>;

let cache: Promise<CountryFeature[]> | undefined;

/** Länderumrisse (Natural Earth 1:50m) werden erst geladen, wenn der Globus gebraucht wird. */
export function loadCountries(): Promise<CountryFeature[]> {
  cache ??= import('world-atlas/countries-50m.json').then((mod) => {
    const topo = (mod.default ?? mod) as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
    const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
    return fc.features
      .filter((f) => f.properties.name !== 'Antarctica')
      .map((f) => ({ ...f, properties: { ...f.properties, code: numericToAlpha2(f.id) } }));
  });
  return cache;
}
