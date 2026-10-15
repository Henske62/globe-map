import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { createBackup, downloadBlob, restoreBackup } from '../lib/backup';
import { loadDemoData, removeDemoData } from '../lib/demo';
import { PlaceSearch } from '../components/PlaceSearch';
import { flag } from '../lib/countries';
import type { Settings } from '../lib/types';
import { choose } from '../components/Dialog';

function formatBytes(n: number) {
  if (n > 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  return `${Math.round(n / 1e3)} KB`;
}

export default function DataView({ settings }: { settings?: Settings }) {
  const counts = useLiveQuery(async () => ({
    trips: await db.trips.count(),
    photos: await db.photos.count(),
    demo: await db.trips.where('tags').equals('Demo').count(),
  }));
  const [storage, setStorage] = useState<{ usage?: number; quota?: number; persisted?: boolean }>({});
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = await navigator.storage?.persisted?.();
      setStorage({ usage: est?.usage, quota: est?.quota, persisted });
    })();
  }, [counts?.photos]);

  const run = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      const msg = await fn();
      if (msg) setMessage(msg);
    } catch (e) {
      setMessage(`Fehler: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const home = settings?.home;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page data">
      <h1>Daten & Einstellungen</h1>
      {message && (
        <p className="alert info" role="status">
          {message}
        </p>
      )}

      <section className="card">
        <h2>Zuhause</h2>
        <p className="muted">Dein Wohnort ist Start- und Endpunkt deiner Reisen (für Routen auf dem Globus und die Kilometer-Statistik).</p>
        {home && (
          <p>
            🏠 <strong>{home.name}</strong> {flag(home.countryCode)}{' '}
            <button className="btn btn-ghost btn-small" onClick={() => db.settings.put({ ...settings, id: 'settings', home: undefined })}>
              entfernen
            </button>
          </p>
        )}
        <PlaceSearch
          placeholder={home ? 'Anderen Wohnort suchen…' : 'Wohnort suchen…'}
          onSelect={(p) => db.settings.put({ ...settings, id: 'settings', home: { name: p.name, lat: p.lat, lng: p.lng, countryCode: p.countryCode } })}
        />
      </section>

      <section className="card">
        <h2>Sicherung</h2>
        <p className="muted">
          Alle Daten liegen nur hier im Browser auf diesem Gerät. Exportiere regelmäßig eine Sicherung, z. B. in deine Cloud. Damit kannst du
          die Daten auch auf ein anderes Gerät übertragen.
        </p>
        <div className="row">
          <button
            className="btn btn-primary"
            disabled={busy}
            onClick={() => run(async () => downloadBlob(await createBackup(true), `travel-atlas-${today}.json`))}
          >
            Export mit Fotos
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => run(async () => downloadBlob(await createBackup(false), `travel-atlas-${today}-ohne-fotos.json`))}
          >
            Export ohne Fotos
          </button>
          <label className="btn">
            Importieren…
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                run(async () => {
                  const mode = await choose({
                    title: 'Sicherung importieren',
                    message: `„${file.name}“\n\nZusammenführen: Reisen aus der Datei kommen dazu, gleiche Reisen werden aktualisiert.\nErsetzen: Alles hier wird durch die Datei ersetzt.`,
                    options: [
                      { label: 'Ersetzen', value: 'replace' as const, variant: 'danger' },
                      { label: 'Zusammenführen', value: 'merge' as const, variant: 'primary' },
                    ],
                  });
                  if (!mode) return;
                  const r = await restoreBackup(file, mode);
                  return `${r.trips} Reisen und ${r.photos} Fotos importiert.`;
                });
              }}
            />
          </label>
        </div>
        <dl className="kv small">
          <dt>Reisen</dt>
          <dd>{counts?.trips ?? '–'}</dd>
          <dt>Fotos</dt>
          <dd>{counts?.photos ?? '–'}</dd>
          {storage.usage !== undefined && (
            <>
              <dt>Speicher</dt>
              <dd>
                {formatBytes(storage.usage)}
                {storage.quota ? ` von ${formatBytes(storage.quota)}` : ''}
              </dd>
            </>
          )}
          <dt>Dauerhaft gespeichert</dt>
          <dd>
            {storage.persisted ? 'ja' : 'nein'}
            {!storage.persisted && (
              <button
                className="btn btn-ghost btn-small"
                onClick={async () => {
                  const ok = await navigator.storage?.persist?.();
                  setStorage((s) => ({ ...s, persisted: ok }));
                  if (!ok) setMessage('Der Browser hat dauerhaften Speicher abgelehnt. Tipp: Seite als Lesezeichen speichern oder installieren.');
                }}
              >
                anfordern
              </button>
            )}
          </dd>
        </dl>
      </section>

      <section className="card">
        <h2>Demo-Daten</h2>
        <p className="muted">Sieben Beispielreisen in Europa und Nahost zum Ausprobieren. Sie tragen den Tag #Demo und lassen sich mit einem Klick wieder entfernen.</p>
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => run(async () => (await loadDemoData(), 'Demo-Daten geladen.'))}>
            Demo-Daten laden
          </button>
          {!!counts?.demo && (
            <button className="btn btn-danger" disabled={busy} onClick={() => run(async () => (await removeDemoData(), 'Demo-Daten entfernt.'))}>
              Demo-Daten entfernen ({counts.demo})
            </button>
          )}
        </div>
      </section>

      <section className="card danger-zone">
        <h2>Alles löschen</h2>
        <p className="muted">Löscht alle Reisen, Fotos und Einstellungen in diesem Browser. Mach vorher eine Sicherung!</p>
        <button
          className="btn btn-danger"
          disabled={busy}
          onClick={async () => {
            const ok = await choose({
              title: 'Alle Daten löschen?',
              message: 'Alle Reisen, Fotos und Einstellungen in diesem Browser werden gelöscht.',
              requireText: 'LÖSCHEN',
              options: [{ label: 'Endgültig löschen', value: true, variant: 'danger' }],
            });
            if (!ok) return;
            run(async () => {
              await Promise.all([db.trips.clear(), db.photos.clear(), db.settings.clear()]);
              return 'Alle Daten gelöscht.';
            });
          }}
        >
          Alle Daten löschen
        </button>
      </section>

      <p className="muted small">
        Ortssuche: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende (Nominatim). Ländergrenzen: Natural Earth.
      </p>
    </div>
  );
}
