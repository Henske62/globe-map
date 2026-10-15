import { useEffect, useRef } from 'react';
import { TripCover } from '../components/TripCover';
import { StarRating } from '../components/StarRating';
import { tripCountries, tripYear } from '../lib/filter';
import { countryName, flag } from '../lib/countries';
import { formatRange, formatNumber } from '../lib/format';
import { tripDays, tripDistanceKm } from '../lib/geo';
import { navigate } from '../lib/hooks';
import type { Settings, Trip } from '../lib/types';

/**
 * Waagerechte Timeline: links alt, rechts neu, startet beim neuesten Eintrag.
 * Bedienung: Wischen/Trackpad, Mausrad (vertikal -> horizontal), Ziehen mit der Maus,
 * Pfeiltasten, Pfeil-Buttons und Sprung zu einem Jahr.
 */
export default function TimelineView({ trips, settings }: { trips: Trip[]; settings?: Settings }) {
  const scroller = useRef<HTMLDivElement>(null);
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const byYear = new Map<number, Trip[]>();
  for (const t of sorted) byYear.set(tripYear(t), [...(byYear.get(tripYear(t)) ?? []), t]);

  // Beim Öffnen ans Ende (neueste Reise) springen.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [trips.length]);

  // Mausrad scrollt waagerecht; Ziehen mit gedrückter Maustaste.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
      const max = el.scrollWidth - el.clientWidth;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    let drag: { x: number; left: number; moved: boolean } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft, moved: false };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 5) {
        drag.moved = true;
        el.classList.add('dragging');
      }
      if (drag.moved) el.scrollLeft = drag.left - dx;
    };
    const onUp = () => {
      el.classList.remove('dragging');
      setTimeout(() => (drag = null));
    };
    // Nach dem Ziehen keinen Klick auf eine Karte auslösen.
    const onClick = (e: MouseEvent) => {
      if (drag?.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('click', onClick, true);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const el = scroller.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  const jumpTo = (year: number) => {
    const el = scroller.current;
    const target = el?.querySelector<HTMLElement>(`[data-year="${year}"]`);
    if (el && target) el.scrollTo({ left: target.offsetLeft - 8, behavior: 'smooth' });
  };

  if (!trips.length) {
    return (
      <div className="page">
        <div className="empty card">
          <h2>Keine Reisen gefunden</h2>
          <p className="muted">Passe die Filter an oder lege eine neue Reise an.</p>
          <button className="btn btn-primary" onClick={() => navigate('edit/new')}>
            + Neue Reise
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="htl">
      <div className="htl-nav">
        <div className="htl-years" role="group" aria-label="Zu Jahr springen">
          {[...byYear.keys()].map((y) => (
            <button key={y} className="chip-btn" onClick={() => jumpTo(y)}>
              {y}
            </button>
          ))}
        </div>
        <div className="row nowrap">
          <button className="icon-btn" aria-label="Zurück (ältere Reisen)" onClick={() => scrollBy(-1)}>
            ‹
          </button>
          <button className="icon-btn" aria-label="Weiter (neuere Reisen)" onClick={() => scrollBy(1)}>
            ›
          </button>
        </div>
      </div>

      <div className="htl-scroller" ref={scroller} tabIndex={0} aria-label="Timeline, waagerecht scrollbar">
        <div className="htl-track">
          {[...byYear.entries()].map(([year, list]) => (
            <section key={year} className="htl-year" data-year={year} aria-label={String(year)}>
              <header className="htl-year-head">
                <span className="htl-year-label">{year}</span>
                <small>
                  {list.length} Reise{list.length > 1 ? 'n' : ''} · {list.reduce((s, t) => s + tripDays(t), 0)} Tage
                </small>
              </header>
              <ol className="htl-items">
                {list.map((t) => (
                  <li key={t.id} className="htl-item">
                    <span className="htl-tick" aria-hidden />
                    <span className="htl-date">{formatRange(t.startDate, t.endDate)}</span>
                    <a className="htl-card card" href={`#/trip/${t.id}`} draggable={false}>
                      <TripCover trip={t} />
                      <div className="htl-body">
                        <h3>{t.title}</h3>
                        <div className="timeline-meta">
                          <span title={tripCountries(t).map(countryName).join(', ')}>{tripCountries(t).map(flag).join(' ')}</span>
                          <span>{tripDays(t)} Tage</span>
                          <span>{formatNumber(tripDistanceKm(t, settings?.home))} km</span>
                        </div>
                        <StarRating value={t.rating} size="sm" />
                        {t.stops.length > 0 && <p className="timeline-route muted">{t.stops.map((s) => s.name).join(' → ')}</p>}
                        {t.tags.length > 0 && (
                          <div className="tags">
                            {t.tags.map((tag) => (
                              <span key={tag} className="tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
