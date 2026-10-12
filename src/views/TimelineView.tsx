import { TripCover } from '../components/TripCover';
import { StarRating } from '../components/StarRating';
import { tripCountries, tripYear, sortByDateDesc } from '../lib/filter';
import { countryName, flag } from '../lib/countries';
import { formatRange, formatNumber } from '../lib/format';
import { tripDays, tripDistanceKm } from '../lib/geo';
import { navigate } from '../lib/hooks';
import type { Settings, Trip } from '../lib/types';

export default function TimelineView({ trips, settings }: { trips: Trip[]; settings?: Settings }) {
  const sorted = sortByDateDesc(trips);
  const byYear = new Map<number, Trip[]>();
  for (const t of sorted) byYear.set(tripYear(t), [...(byYear.get(tripYear(t)) ?? []), t]);

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
    <div className="page timeline">
      {[...byYear.entries()].map(([year, list]) => (
        <section key={year} className="timeline-year">
          <h2 className="timeline-year-label">
            {year}
            <small>
              {list.length} Reise{list.length > 1 ? 'n' : ''} · {list.reduce((s, t) => s + tripDays(t), 0)} Tage
            </small>
          </h2>
          <ol className="timeline-list">
            {list.map((t) => (
              <li key={t.id} className="timeline-item">
                <span className="timeline-dot" aria-hidden />
                <a className="timeline-card card" href={`#/trip/${t.id}`}>
                  <TripCover trip={t} />
                  <div className="timeline-body">
                    <div className="timeline-date">{formatRange(t.startDate, t.endDate)}</div>
                    <h3>{t.title}</h3>
                    <div className="timeline-meta">
                      <span title={tripCountries(t).map(countryName).join(', ')}>
                        {tripCountries(t).map(flag).join(' ')}
                      </span>
                      <span>{tripDays(t)} Tage</span>
                      {t.stops.length > 1 && <span>{t.stops.length} Stopps</span>}
                      <span>{formatNumber(tripDistanceKm(t, settings?.home))} km</span>
                      <StarRating value={t.rating} size="sm" />
                    </div>
                    {t.description && <p className="timeline-desc">{t.description}</p>}
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
  );
}
