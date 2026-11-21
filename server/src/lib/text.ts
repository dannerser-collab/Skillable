/**
 * Utilidades de texto en español: normalización (tildes/mayúsculas), tokenización
 * y coincidencia tolerante a flexiones (plural, género, derivados cercanos).
 */

const DIACRITICS = /[̀-ͯ]/g;

/** Minúsculas, sin tildes (ñ → n) y solo [a-z0-9] separados por un espacio. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}

/** Raíz aproximada: quita plural y vocal final ("dioses" → "dios", "historia" → "histori"). */
function root(word: string): string {
  let r = word;
  if (r.length > 5 && r.endsWith('es')) r = r.slice(0, -2);
  else if (r.length > 4 && r.endsWith('s')) r = r.slice(0, -1);
  if (r.length > 4 && /[aeiou]$/.test(r)) r = r.slice(0, -1);
  return r;
}

/** Prefijo que debe tener un token para considerarse flexión del término. */
function termPrefix(term: string): string {
  if (/(ar|er|ir)$/.test(term) && term.length >= 6) {
    const stem = term.slice(0, -2);
    return stem.length >= 6 ? stem : term.slice(0, -1);
  }
  const r = root(term);
  return term.length >= 8 && r.length > 6 ? r.slice(0, -1) : r;
}

/** ¿El token (normalizado) es el término o una flexión válida del término (normalizado, 1 palabra)? */
function tokenMatches(token: string, term: string): boolean {
  if (token === term) return true;
  if (term.length <= 4) return token === `${term}s` || token === `${term}es`;
  const prefix = termPrefix(term);
  return token.startsWith(prefix) && token.length <= term.length + 5;
}

/** ¿El texto contiene el término (o una flexión)? Admite términos de varias palabras. */
export function containsTerm(text: string, term: string): boolean {
  const t = normalize(term);
  if (!t) return false;
  if (t.includes(' ')) return ` ${normalize(text)} `.includes(` ${t} `);
  return tokenize(text).some((tok) => tokenMatches(tok, t));
}

/** Cuenta cuántas raíces semánticas (ya normalizadas) aparecen en los tokens. */
export function countStemHits(tokens: string[], stems: string[], exclude: string[] = []): number {
  const ex = exclude.map(normalize);
  let hits = 0;
  for (const stem of stems) {
    if (stem.length < 3) continue;
    const found = tokens.some(
      (tok) => tok.startsWith(stem) && !ex.some((e) => e && tokenMatches(tok, e)),
    );
    if (found) hits++;
  }
  return hits;
}

export const STOPWORDS = new Set(
  `a al algo algun alguna algunas alguno algunos ante antes aqui asi aun cada como con contra cual cuales cuando de del desde donde dos e el ella ellas ello ellos en entre era eran es esa esas ese eso esos esta estaba estan estar estas este esto estos fue fueron ha hace hacia han hasta hay la las le les lo los mas me mi mis mucho muchos muy nada ni no nos nosotros o os otra otras otro otros para pero poco por porque que quien se sea ser si sido sin sobre son su sus tal tambien tan tanto te tener tengo ti tiene todo todos tu tus un una uno unos unas usted y ya yo`.split(
    ' ',
  ),
);

export const CONNECTORS = [
  'porque',
  'aunque',
  'cuando',
  'mientras',
  'sino',
  'ya que',
  'por eso',
  'asi que',
  'de modo que',
  'sin embargo',
  'en cambio',
  'para que',
  'para',
  'tras',
  'antes de',
  'despues de',
  'como si',
  'hasta que',
  'donde',
  'pero',
  'si',
];

export function countConnectors(text: string): number {
  const padded = ` ${normalize(text)} `;
  return CONNECTORS.filter((c) => padded.includes(` ${c} `)).length;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function clamp(n: number, min = 0, max = 100): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
