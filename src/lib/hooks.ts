import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { Photo } from './types';

export interface Route {
  view: 'globe' | 'timeline' | 'stats' | 'data' | 'trip' | 'edit';
  id?: string;
  params: URLSearchParams;
}

function parseHash(): Route {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const [view, id] = path.split('/');
  const known: Route['view'][] = ['globe', 'timeline', 'stats', 'data', 'trip', 'edit'];
  return {
    view: known.includes(view as Route['view']) ? (view as Route['view']) : 'globe',
    id: id ? decodeURIComponent(id) : undefined,
    params: new URLSearchParams(query),
  };
}

/** Hash-Routing, damit die App auf jedem statischen Hoster ohne Server-Rewrites läuft. */
export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  location.hash = '#/' + path.replace(/^\/+/, '');
}

export function useTrips() {
  return useLiveQuery(() => db.trips.toArray(), []);
}

export function useSettings() {
  return useLiveQuery(() => db.settings.get('settings'), []);
}

export function useTripPhotos(tripId?: string) {
  return useLiveQuery(
    () => (tripId ? db.photos.where('tripId').equals(tripId).toArray() : Promise.resolve([] as Photo[])),
    [tripId],
  );
}

/** Object-URL für einen Blob, wird beim Unmount wieder freigegeben. */
export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function useElementSize<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size] as const;
}

export function useDarkMode(): boolean {
  const query = '(prefers-color-scheme: dark)';
  const [dark, setDark] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}
