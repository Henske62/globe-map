/**
 * Fokusregion der App: Europa bis in den Nahen Osten (Israel).
 * Bestimmt Startansicht des Globus, die Länder-Checkliste in der Statistik
 * und welche Orte die Ortssuche bevorzugt (und in welcher Detailtiefe sie sie kennt).
 */
export const FOCUS_REGION = {
  name: 'Europa & Nahost',
  /** Souveräne Staaten Europas inkl. Kaukasus, Türkei, Zypern und Levante. */
  countries: (
    'AD AL AT BA BE BG BY CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SK SM UA VA XK ' +
    'TR GE AM AZ IL PS JO LB'
  ).split(' '),
  /** Kamera-Position für die Startansicht. */
  view: { lat: 44, lng: 17, altitude: 1.15 },
} as const;

const FOCUS_SET = new Set<string>(FOCUS_REGION.countries);

export function inFocus(countryCode: string): boolean {
  return FOCUS_SET.has(countryCode.toUpperCase());
}
