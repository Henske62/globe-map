export type Transport = 'flight' | 'train' | 'car' | 'bus' | 'ferry' | 'bike' | 'walk' | 'other';

export const TRANSPORTS: Record<Transport, { label: string; icon: string }> = {
  flight: { label: 'Flug', icon: '✈️' },
  train: { label: 'Zug', icon: '🚆' },
  car: { label: 'Auto', icon: '🚗' },
  bus: { label: 'Bus', icon: '🚌' },
  ferry: { label: 'Fähre/Schiff', icon: '⛴️' },
  bike: { label: 'Fahrrad', icon: '🚲' },
  walk: { label: 'Zu Fuß', icon: '🥾' },
  other: { label: 'Sonstiges', icon: '🧭' },
};

export interface Stop {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2, z. B. "DE" */
  countryCode: string;
  lat: number;
  lng: number;
  arrival?: string; // YYYY-MM-DD
  departure?: string;
  /** Wie man zu diesem Stopp gekommen ist (vom vorherigen Stopp bzw. von zu Hause). */
  transport: Transport;
  accommodation?: string;
  notes?: string;
  rating?: number; // 1-5
}

export interface Trip {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  description?: string;
  /** Tagebuch / Notizen in Freitext */
  journal?: string;
  rating?: number; // 1-5
  tags: string[];
  companions: string[];
  stops: Stop[];
  /** Hin- und Rückreise ab Wohnort in Routen und Kilometer einbeziehen */
  fromHome: boolean;
  returnTransport?: Transport;
  costs?: number;
  currency?: string;
  coverPhotoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  tripId: string;
  stopId?: string;
  caption?: string;
  takenAt?: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

export interface Settings {
  id: 'settings';
  home?: { name: string; lat: number; lng: number; countryCode: string };
}

export interface Filters {
  query: string;
  yearFrom?: number;
  yearTo?: number;
  countries: string[];
  tags: string[];
  companions: string[];
  transports: Transport[];
  minRating: number;
}

export const EMPTY_FILTERS: Filters = {
  query: '',
  countries: [],
  tags: [],
  companions: [],
  transports: [],
  minRating: 0,
};
