import countries from 'i18n-iso-countries';
import de from 'i18n-iso-countries/langs/de.json';

countries.registerLocale(de);

export function countryName(code: string): string {
  return countries.getName(code, 'de') ?? code;
}

export function flag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '🏳️';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** world-atlas nutzt numerische ISO-Codes (z. B. "276"). */
export function numericToAlpha2(numeric: string | number | undefined): string | undefined {
  if (numeric === undefined) return undefined;
  return countries.numericToAlpha2(String(numeric)) ?? undefined;
}

export const TOTAL_COUNTRIES = 195; // UN-Mitglieder + Vatikan + Palästina

export type Continent = 'Europa' | 'Asien' | 'Afrika' | 'Nordamerika' | 'Südamerika' | 'Ozeanien' | 'Antarktis';

const CONTINENT_CODES: Record<Continent, string> = {
  Europa:
    'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  Asien:
    'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  Afrika:
    'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  Nordamerika:
    'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI',
  Südamerika: 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  Ozeanien: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS',
  Antarktis: 'AQ BV GS HM TF',
};

const CONTINENT_BY_CODE = new Map<string, Continent>();
for (const [continent, codes] of Object.entries(CONTINENT_CODES)) {
  for (const code of codes.split(' ')) CONTINENT_BY_CODE.set(code, continent as Continent);
}

export function continentOf(code: string): Continent | undefined {
  return CONTINENT_BY_CODE.get(code.toUpperCase());
}

export const CONTINENTS = Object.keys(CONTINENT_CODES) as Continent[];
