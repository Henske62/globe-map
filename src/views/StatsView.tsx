import { useMemo, useState } from 'react';
import { computeStats } from '../lib/stats';
import { CONTINENTS, TOTAL_COUNTRIES, countryName, flag } from '../lib/countries';
import { formatMoney, formatNumber } from '../lib/format';
import { TRANSPORTS, type Settings, type Trip } from '../lib/types';

type YearMetric = 'days' | 'trips' | 'km';
const METRIC_LABEL: Record<YearMetric, string> = { days: 'Reisetage', trips: 'Reisen', km: 'Kilometer' };

export default function StatsView({ trips, settings }: { trips: Trip[]; settings?: Settings }) {
  const s = useMemo(() => computeStats(trips, settings?.home), [trips, settings?.home]);
  const [metric, setMetric] = useState<YearMetric>('days');

  if (!trips.length) {
    return (
      <div className="page">
        <div className="empty card">
          <h2>Noch keine Daten</h2>
          <p className="muted">Sobald du Reisen einträgst (oder die Filter lockerst), erscheinen hier deine Statistiken.</p>
        </div>
      </div>
    );
  }

  const countryList = [...s.countries.entries()].sort((a, b) => b[1] - a[1] || countryName(a[0]).localeCompare(countryName(b[0]), 'de'));
  const maxYear = Math.max(...s.byYear.map((y) => y[metric]), 1);
  const transportList = [...s.byTransport.entries()].sort((a, b) => b[1] - a[1]);
  const maxTransport = Math.max(...transportList.map((t) => t[1]), 1);
  const visitedContinents = CONTINENTS.filter((c) => c !== 'Antarktis' || s.continents.has(c));

  return (
    <div className="page stats">
      <section className="kpis">
        <Kpi value={s.countries.size} label="Länder" sub={`${Math.round((s.countries.size / TOTAL_COUNTRIES) * 100)} % der Welt`} />
        <Kpi value={s.continents.size} label="Kontinente" sub={`von ${visitedContinents.length}`} />
        <Kpi value={s.cities} label="Orte" />
        <Kpi value={s.trips} label="Reisen" />
        <Kpi value={s.days} label="Reisetage" sub={`≈ ${(s.days / 7).toFixed(1).replace('.', ',')} Wochen`} />
        <Kpi
          value={formatNumber(s.km)}
          label="Kilometer"
          sub={`${s.earthLaps.toFixed(2).replace('.', ',')}× um die Erde${settings?.home ? '' : ' (ohne Wohnort)'}`}
        />
      </section>

      <div className="stats-grid">
        <section className="card chart-card wide">
          <header className="chart-head">
            <h3>{METRIC_LABEL[metric]} pro Jahr</h3>
            <div className="segmented" role="tablist">
              {(Object.keys(METRIC_LABEL) as YearMetric[]).map((m) => (
                <button key={m} role="tab" aria-selected={metric === m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
                  {METRIC_LABEL[m]}
                </button>
              ))}
            </div>
          </header>
          <div className="year-chart" role="img" aria-label={`${METRIC_LABEL[metric]} pro Jahr`}>
            {s.byYear.map((y) => (
              <div key={y.year} className="year-col" tabIndex={0}>
                <span className="year-tip">
                  <b>{y.year}</b>
                  {y.trips} Reisen · {y.days} Tage · {formatNumber(y.km)} km
                </span>
                <span className="year-area">
                  <span className="year-value">{y[metric] ? formatNumber(y[metric]) : ''}</span>
                  <span className="year-bar" style={{ height: `${(y[metric] / maxYear) * 100}%` }} />
                </span>
                <span className="year-label">{String(y.year)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card chart-card">
          <h3>Kontinente</h3>
          <ul className="hbars">
            {visitedContinents.map((c) => {
              const n = s.continents.get(c) ?? 0;
              return (
                <li key={c} title={`${c}: ${n} Länder`}>
                  <span className="hbar-label">{c}</span>
                  <span className="hbar-track">
                    <span className="hbar" style={{ width: `${(n / Math.max(...s.continents.values(), 1)) * 100}%` }} />
                  </span>
                  <span className="hbar-value">{n}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card chart-card">
          <h3>Kilometer nach Verkehrsmittel</h3>
          {transportList.length ? (
            <ul className="hbars">
              {transportList.map(([t, km]) => (
                <li key={t} title={`${TRANSPORTS[t].label}: ${formatNumber(km)} km`}>
                  <span className="hbar-label">
                    {TRANSPORTS[t].icon} {TRANSPORTS[t].label}
                  </span>
                  <span className="hbar-track">
                    <span className="hbar" style={{ width: `${(km / maxTransport) * 100}%` }} />
                  </span>
                  <span className="hbar-value">{formatNumber(km)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Noch keine Etappen.</p>
          )}
        </section>

        <section className="card chart-card">
          <h3>Länder ({s.countries.size})</h3>
          <ul className="country-list">
            {countryList.map(([code, n]) => (
              <li key={code}>
                <span>
                  {flag(code)} {countryName(code)}
                </span>
                <span className="muted">{n}×</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card chart-card">
          <h3>Rekorde</h3>
          <dl className="records">
            {s.longestTrip && (
              <>
                <dt>Längste Reise</dt>
                <dd>
                  <a href={`#/trip/${s.longestTrip.trip.id}`}>{s.longestTrip.trip.title}</a> · {s.longestTrip.days} Tage
                </dd>
              </>
            )}
            {s.farthestTrip && s.farthestTrip.km > 0 && (
              <>
                <dt>Weiteste Reise</dt>
                <dd>
                  <a href={`#/trip/${s.farthestTrip.trip.id}`}>{s.farthestTrip.trip.title}</a> · {formatNumber(s.farthestTrip.km)} km
                </dd>
              </>
            )}
            {countryList[0] && countryList[0][1] > 1 && (
              <>
                <dt>Lieblingsland</dt>
                <dd>
                  {flag(countryList[0][0])} {countryName(countryList[0][0])} · {countryList[0][1]}×
                </dd>
              </>
            )}
            {s.totalCosts.size > 0 && (
              <>
                <dt>Ausgaben gesamt</dt>
                <dd>{[...s.totalCosts.entries()].map(([cur, sum]) => formatMoney(sum, cur)).join(' + ')}</dd>
              </>
            )}
          </dl>
        </section>
      </div>

      <details className="card table-view">
        <summary>Als Tabelle anzeigen</summary>
        <table>
          <thead>
            <tr>
              <th>Jahr</th>
              <th>Reisen</th>
              <th>Tage</th>
              <th>km</th>
            </tr>
          </thead>
          <tbody>
            {s.byYear.map((y) => (
              <tr key={y.year}>
                <td>{y.year}</td>
                <td>{y.trips}</td>
                <td>{y.days}</td>
                <td>{formatNumber(y.km)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Kpi({ value, label, sub }: { value: number | string; label: string; sub?: string }) {
  return (
    <div className="kpi card">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}
