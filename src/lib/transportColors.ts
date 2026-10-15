import type { Transport } from './types';

// Verkehrsmittel in 5 Gruppen (validierte kategoriale Reihenfolge, je Modus eigene Stufen).
// Flüge werden zusätzlich gestrichelt gezeichnet, damit Farbe nicht das einzige Merkmal ist.
export const TRANSPORT_COLORS: Record<'dark' | 'light', Record<Transport, string>> = {
  dark: { flight: '#3987e5', train: '#d95926', car: '#199e70', bus: '#199e70', ferry: '#c98500', bike: '#d55181', walk: '#d55181', other: '#8b8f98' },
  light: { flight: '#2a78d6', train: '#eb6834', car: '#1baf7a', bus: '#1baf7a', ferry: '#eda100', bike: '#e87ba4', walk: '#e87ba4', other: '#6b7280' },
};
