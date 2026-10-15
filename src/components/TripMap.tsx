import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath, geoInterpolate } from 'd3-geo';
import type { Feature, LineString, MultiPoint } from 'geojson';
import { loadCountries, type CountryFeature } from '../lib/worldGeo';
import { tripLegs, type Leg } from '../lib/geo';
import { tripCountries } from '../lib/filter';
import { useDarkMode, useElementSize } from '../lib/hooks';
import { TRANSPORT_COLORS } from '../lib/transportColors';
import { TRANSPORTS, type Settings, type Trip } from '../lib/types';
import { formatNumber } from '../lib/format';

interface Props {
  trip: Trip;
  home?: Settings['home'];
}

/** Routenkarte einer Reise: Länder, Etappen (Flüge gestrichelt als Großkreis), nummerierte Stopps. Läuft komplett offline. */
export function TripMap({ trip, home }: Props) {
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [ref, size] = useElementSize<HTMLElement>();
  const dark = useDarkMode();
  const colors = dark ? TRANSPORT_COLORS.dark : TRANSPORT_COLORS.light;

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  const legs = useMemo(() => tripLegs(trip, home), [trip, home]);
  const useHome = trip.fromHome && home && trip.stops.length > 0;
  const width = size.width;
  const height = Math.round(Math.min(440, Math.max(260, width * 0.55)));

  const projection = useMemo(() => {
    // Ausschnitt nur über die Stopps; Hin-/Rückreise läuft aus dem Bild Richtung Zuhause.
    const pts: [number, number][] = trip.stops.map((s) => [s.lng, s.lat]);
    if (!pts.length || !width) return null;
    // Mindestens ~4° × 3° zeigen, damit nahe Stopps nicht auf Straßenniveau gezoomt werden.
    const lngs = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    const cx = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
    const halfW = Math.max(2, (Math.max(...lngs) - Math.min(...lngs)) / 2);
    const halfH = Math.max(1.5, (Math.max(...lats) - Math.min(...lats)) / 2);
    const box: [number, number][] = [[cx - halfW, cy - halfH], [cx + halfW, cy + halfH]];
    const target: Feature<MultiPoint> = { type: 'Feature', properties: {}, geometry: { type: 'MultiPoint', coordinates: box } };
    const pad = Math.min(56, width * 0.1);
    return geoMercator()
      .fitExtent([[pad, pad], [width - pad, height - pad]], target)
      .clipExtent([[0, 0], [width, height]]);
  }, [trip.stops, width, height]);

  const path = useMemo(() => (projection ? geoPath(projection) : null), [projection]);
  const visited = useMemo(() => new Set(tripCountries(trip)), [trip]);

  if (!trip.stops.length) return null;

  const legLine = (l: Leg): Feature<LineString> => {
    // Flüge als Großkreis (fein interpoliert), Landwege als direkte Linie.
    const coords: [number, number][] =
      l.transport === 'flight'
        ? Array.from({ length: 33 }, (_, i) => geoInterpolate([l.from.lng, l.from.lat], [l.to.lng, l.to.lat])(i / 32))
        : [[l.from.lng, l.from.lat], [l.to.lng, l.to.lat]];
    return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
  };

  const usedTransports = [...new Set(legs.map((l) => l.transport))];

  // Beschriftungen ohne Überlappung: je Stopp rechts, links, oben oder unten – die erste freie Position gewinnt.
  const labels = (() => {
    if (!projection) return [];
    const placed: { x: number; y: number; w: number; h: number }[] = trip.stops.map((s) => {
      const [x, y] = projection([s.lng, s.lat]) ?? [-99, -99];
      return { x: x - 11, y: y - 11, w: 22, h: 22 }; // Kreise selbst freihalten
    });
    const overlaps = (r: { x: number; y: number; w: number; h: number }) =>
      placed.some((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y) ||
      r.x < 2 || r.y < 2 || r.x + r.w > width - 2 || r.y + r.h > height - 2;
    return trip.stops.map((s) => {
      const [x, y] = projection([s.lng, s.lat]) ?? [-99, -99];
      const w = s.name.length * 7.4 + 6;
      const h = 16;
      const options = [
        { anchor: 'start' as const, tx: 14, ty: 4, box: { x: x + 12, y: y - 8, w, h } },
        { anchor: 'end' as const, tx: -14, ty: 4, box: { x: x - 12 - w, y: y - 8, w, h } },
        { anchor: 'middle' as const, tx: 0, ty: -16, box: { x: x - w / 2, y: y - 28, w, h } },
        { anchor: 'middle' as const, tx: 0, ty: 25, box: { x: x - w / 2, y: y + 12, w, h } },
      ];
      const pick = options.find((o) => !overlaps(o.box));
      if (!pick) return null; // kein Platz: Name steht in der Liste darunter und im Tooltip
      placed.push(pick.box);
      return pick;
    });
  })();
  const homeXY = useHome && projection ? projection([home!.lng, home!.lat]) : null;
  const homeVisible = !!homeXY && homeXY[0] >= 0 && homeXY[0] <= width && homeXY[1] >= 0 && homeXY[1] <= height;

  return (
    <figure className="trip-map" ref={ref}>
      {projection && path && (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Routenkarte: ${trip.stops.map((s) => s.name).join(', ')}`}>
          <rect width={width} height={height} className="map-ocean" />
          <g>
            {countries.map((f, i) => {
              const d = path(f);
              if (!d) return null;
              return <path key={f.properties.code ?? i} d={d} className={f.properties.code && visited.has(f.properties.code) ? 'map-land visited' : 'map-land'} />;
            })}
          </g>
          <g fill="none" strokeLinecap="round">
            {legs.map((l, i) => (
              <path
                key={i}
                d={path(legLine(l)) ?? ''}
                stroke={colors[l.transport]}
                strokeWidth={2.5}
                strokeDasharray={l.transport === 'flight' ? '6 5' : undefined}
              >
                <title>
                  {TRANSPORTS[l.transport].label}: {l.from.name} → {l.to.name}, {formatNumber(l.km)} km
                </title>
              </path>
            ))}
          </g>
          {homeVisible && (() => {
            const [x, y] = homeXY!;
            return (
              <g transform={`translate(${x},${y})`} className="map-home">
                <rect x={-7} y={-7} width={14} height={14} rx={3} />
                <text x={11} y={4} className="map-label">
                  {home!.name}
                </text>
              </g>
            );
          })()}
          {trip.stops.map((s, i) => {
            const [x, y] = projection([s.lng, s.lat]) ?? [-99, -99];
            const label = labels[i];
            return (
              <g key={s.id} transform={`translate(${x},${y})`} className="map-stop">
                <title>{`${i + 1}. ${s.name}`}</title>
                <circle r={10} />
                <text className="map-num" textAnchor="middle" y={4}>
                  {i + 1}
                </text>
                {label && (
                  <text className="map-label" x={label.tx} y={label.ty} textAnchor={label.anchor}>
                    {s.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {usedTransports.length > 0 && (
        <figcaption className="map-legend">
          {usedTransports.map((t) => (
            <span key={t}>
              <svg width="22" height="6" aria-hidden>
                <line x1="1" y1="3" x2="21" y2="3" stroke={colors[t]} strokeWidth="2.5" strokeDasharray={t === 'flight' ? '5 4' : undefined} />
              </svg>
              {TRANSPORTS[t].label}
            </span>
          ))}
          {useHome && <span>{homeVisible ? '■ Zuhause' : `Hin- und Rückreise ab ${home!.name}`}</span>}
        </figcaption>
      )}
    </figure>
  );
}
