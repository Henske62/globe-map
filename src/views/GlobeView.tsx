import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial, type LineSegments } from 'three';
import { buildBorderLines, countryLocator, drawCountryTexture } from '../lib/globeLayers';
import { loadCountries, type CountryFeature } from '../lib/worldGeo';
import { countryName, flag } from '../lib/countries';
import { tripCountries } from '../lib/filter';
import { formatRange } from '../lib/format';
import { navigate, useDarkMode, useElementSize } from '../lib/hooks';
import { FOCUS_REGION } from '../lib/region';
import type { Settings, Trip } from '../lib/types';

// Besuchte Länder: sequentielle Violett-Rampe (1, 2, 3, 4+ Reisen).
const PALETTE = {
  dark: { ocean: '#0d1b2e', land: '#1f2f45', border: '#3b5372', atmosphere: '#5aa9ff', place: '#f8fafc', placeDim: '#f8fafc44', visited: ['#5b4fb0', '#7a6ee0', '#9d93ec', '#c4bdf5'] },
  light: { ocean: '#c9dcef', land: '#f4f1ea', border: '#9fb3c8', atmosphere: '#9cc7ff', place: '#1e293b', placeDim: '#1e293b44', visited: ['#b4abf2', '#8f84e6', '#6a5cd0', '#4b3fa5'] },
};
const HOME_COLOR = '#22c55e';

interface Place {
  key: string;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  trips: Trip[];
  isHome?: boolean;
}

type Selection = { kind: 'place'; place: Place } | { kind: 'country'; code: string } | null;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

interface Props {
  trips: Trip[];
  settings?: Settings;
  focusTripId?: string;
  onFilterCountry: (code: string) => void;
}

/**
 * Performance (Ziel: 60 fps auch auf schwächeren Geräten):
 * - Länderflächen sind EINE Textur, Grenzen EIN Linienobjekt -> wenige Draw-Calls statt tausender.
 * - Hover/Klick auf Länder per Koordinaten-Lookup statt Raycasting gegen hunderte Meshes.
 * - Alle Accessoren memoisiert, keine Animationen, Pixel-Ratio gedeckelt.
 * - Keine Routen-Bögen; die zeigt die Reise-Detailseite als Karte.
 */
export default function GlobeView({ trips, settings, focusTripId, onFilterCountry }: Props) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const hoveringPoint = useRef(false);
  const dark = useDarkMode();
  const colors = dark ? PALETTE.dark : PALETTE.light;
  const home = settings?.home;

  useEffect(() => {
    loadCountries().then(setCountries);
  }, []);

  const material = useMemo(() => new MeshPhongMaterial({ shininess: 6 }), []);
  const locate = useMemo(() => countryLocator(countries), [countries]);
  const rendererConfig = useMemo(() => ({ antialias: true, alpha: true, powerPreference: 'high-performance' as const }), []);

  const visits = useMemo(() => {
    const m = new Map<string, Trip[]>();
    for (const t of trips) for (const c of tripCountries(t)) m.set(c, [...(m.get(c) ?? []), t]);
    return m;
  }, [trips]);

  const places = useMemo(() => {
    const m = new Map<string, Place>();
    for (const t of trips) {
      for (const s of t.stops) {
        const key = `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`;
        const p = m.get(key) ?? { key, name: s.name, countryCode: s.countryCode, lat: s.lat, lng: s.lng, trips: [] };
        if (!p.trips.includes(t)) p.trips.push(t);
        m.set(key, p);
      }
    }
    const list = [...m.values()];
    if (home) list.push({ key: 'home', name: home.name, countryCode: home.countryCode, lat: home.lat, lng: home.lng, trips: [], isHome: true });
    return list;
  }, [trips, home]);

  // Pixel-Ratio deckeln: Retina-Displays rendern sonst bis zu 9× so viele Pixel.
  useEffect(() => {
    globeRef.current?.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }, [size.width > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Startansicht bzw. auf eine Reise zoomen (#/globe?trip=…).
  // Bewusst nicht von trips abhängig: Filtern soll die Kamera nicht zurücksetzen.
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const trip = focusTripId ? trips.find((t) => t.id === focusTripId) : undefined;
    if (trip && trip.stops.length) {
      const lat = trip.stops.reduce((s, x) => s + x.lat, 0) / trip.stops.length;
      const lng = trip.stops.reduce((s, x) => s + x.lng, 0) / trip.stops.length;
      g.pointOfView({ lat, lng, altitude: 1.1 }, 1500);
    } else {
      g.pointOfView(FOCUS_REGION.view, 0);
    }
  }, [focusTripId, size.width > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Länderflächen-Textur bei Daten- oder Themewechsel neu zeichnen (~50 ms, nicht pro Frame).
  useEffect(() => {
    if (!countries.length) return;
    const texture = drawCountryTexture(
      countries,
      (f) => {
        const n = f.properties.code ? (visits.get(f.properties.code)?.length ?? 0) : 0;
        return n ? colors.visited[Math.min(n, colors.visited.length) - 1] : colors.land;
      },
      colors.ocean,
    );
    material.map?.dispose();
    material.map = texture;
    material.color.set('#ffffff');
    material.needsUpdate = true;
  }, [countries, visits, colors, material]);

  // Grenzen als ein einziges Linienobjekt in die Szene.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !countries.length) return;
    const lines: LineSegments = buildBorderLines(countries, (lat, lng) => g.getCoords(lat, lng, 0.0015), colors.border);
    g.scene().add(lines);
    return () => {
      g.scene().remove(lines);
      lines.geometry.dispose();
      (lines.material as { dispose(): void }).dispose();
    };
  }, [countries, colors.border, size.width > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const countryTip = (code: string | undefined, fallback: string) => {
    const n = code ? (visits.get(code)?.length ?? 0) : 0;
    return `${code ? flag(code) : ''} <b>${esc(code ? countryName(code) : fallback)}</b><br/>${n ? `${n} Reise${n > 1 ? 'n' : ''}` : 'noch nicht besucht'}`;
  };

  // Tooltip für Länder: Mausposition -> Koordinate -> Land (gedrosselt auf einen Frame).
  const pending = useRef<number>(0);
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(() => {
      const g = globeRef.current;
      const c = g && !hoveringPoint.current ? g.toGlobeCoords(x, y) : null;
      const f = c ? locate(c.lat, c.lng) : undefined;
      setTip(f ? { x, y, html: countryTip(f.properties.code, f.properties.name) } : null);
    });
  };

  const onGlobeClick = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      const code = locate(lat, lng)?.properties.code;
      setSelection(code ? { kind: 'country', code } : null);
    },
    [locate],
  );

  const pointColor = useCallback(
    (p: object) => {
      const place = p as Place;
      if (place.isHome) return HOME_COLOR;
      if (focusTripId && !place.trips.some((t) => t.id === focusTripId)) return colors.placeDim;
      return colors.place;
    },
    [focusTripId, colors],
  );
  const pointRadius = useCallback((p: object) => ((p as Place).isHome ? 0.45 : 0.22 + Math.min(0.25, (p as Place).trips.length * 0.05)), []);
  const pointLabel = useCallback((p: object) => {
    const place = p as Place;
    if (place.isHome) return `<div class="globe-tip">🏠 <b>${esc(place.name)}</b><br/>Zuhause</div>`;
    return `<div class="globe-tip">${flag(place.countryCode)} <b>${esc(place.name)}</b><br/>${place.trips.map((t) => esc(t.title)).join('<br/>')}</div>`;
  }, []);
  const onPointHover = useCallback((p: object | null) => {
    hoveringPoint.current = !!p;
    if (p) setTip(null);
  }, []);
  const onPointClick = useCallback((p: object) => {
    if (!(p as Place).isHome) setSelection({ kind: 'place', place: p as Place });
  }, []);

  const selectedCountryTrips = selection?.kind === 'country' ? (visits.get(selection.code) ?? []) : [];
  const maxVisits = Math.max(0, ...[...visits.values()].map((v) => v.length));

  return (
    <div className="globe-wrap" ref={containerRef} onPointerMove={onPointerMove} onPointerLeave={() => setTip(null)}>
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          rendererConfig={rendererConfig}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={colors.atmosphere}
          atmosphereAltitude={0.16}
          onGlobeClick={onGlobeClick}
          pointsData={places}
          pointLat="lat"
          pointLng="lng"
          pointAltitude={0.012}
          pointRadius={pointRadius}
          pointResolution={8}
          pointColor={pointColor}
          pointsTransitionDuration={0}
          pointLabel={pointLabel}
          onPointHover={onPointHover}
          onPointClick={onPointClick}
        />
      )}

      {tip && (
        <div className="globe-tip globe-tip-float" style={{ left: tip.x + 14, top: tip.y + 14 }} dangerouslySetInnerHTML={{ __html: tip.html }} />
      )}

      <div className="globe-views" role="group" aria-label="Ansicht">
        <button className="btn btn-small" onClick={() => globeRef.current?.pointOfView(FOCUS_REGION.view, 1200)}>
          {FOCUS_REGION.name}
        </button>
        <button className="btn btn-small" onClick={() => globeRef.current?.pointOfView({ ...FOCUS_REGION.view, altitude: 2.6 }, 1200)}>
          Welt
        </button>
      </div>

      {trips.length > 0 && (
        <div className="globe-legend" aria-label="Legende">
          <span>
            <i className="dot" style={{ background: colors.place }} />
            Orte
          </span>
          {home && (
            <span>
              <i className="dot" style={{ background: HOME_COLOR }} />
              Zuhause
            </span>
          )}
          <span>
            Länder:
            {colors.visited.slice(0, Math.max(1, Math.min(maxVisits, colors.visited.length))).map((c, i, arr) => (
              <span key={c} className="legend-step">
                <i className="swatch" style={{ background: c }} />
                {i === arr.length - 1 && i === colors.visited.length - 1 ? `${i + 1}+` : i + 1}×
              </span>
            ))}
          </span>
        </div>
      )}

      {trips.length === 0 && (
        <div className="globe-empty card">
          <h2>Noch keine Reisen</h2>
          <p className="muted">Lege deine erste Reise an oder lade Demo-Daten, um alles auszuprobieren.</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => navigate('edit/new')}>
              + Erste Reise anlegen
            </button>
            <button className="btn" onClick={() => navigate('data')}>
              Demo-Daten
            </button>
          </div>
        </div>
      )}

      {selection && (
        <aside className="globe-panel card">
          <button className="panel-close" aria-label="Schließen" onClick={() => setSelection(null)}>
            ×
          </button>
          {selection.kind === 'place' ? (
            <>
              <h3>
                {flag(selection.place.countryCode)} {selection.place.name}
              </h3>
              <p className="muted">{countryName(selection.place.countryCode)}</p>
              <TripList trips={selection.place.trips} />
            </>
          ) : (
            <>
              <h3>
                {flag(selection.code)} {countryName(selection.code)}
              </h3>
              <p className="muted">
                {selectedCountryTrips.length ? `${selectedCountryTrips.length} Reise(n)` : 'Hier warst du noch nicht.'}
              </p>
              <TripList trips={selectedCountryTrips} />
              {selectedCountryTrips.length > 0 && (
                <button className="btn" onClick={() => onFilterCountry(selection.code)}>
                  Nach diesem Land filtern
                </button>
              )}
            </>
          )}
        </aside>
      )}
    </div>
  );
}

function TripList({ trips }: { trips: Trip[] }) {
  return (
    <ul className="panel-trips">
      {[...trips]
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((t) => (
          <li key={t.id}>
            <a href={`#/trip/${t.id}`}>
              <strong>{t.title}</strong>
              <small>{formatRange(t.startDate, t.endDate)}</small>
            </a>
          </li>
        ))}
    </ul>
  );
}
