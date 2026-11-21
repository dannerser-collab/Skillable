/**
 * Banco de calibración del Filtro Anti-Calzador (árbitro local, sin red).
 * Uso: npx tsx scripts/calibrate.ts   → sale con código 1 si algún caso falla.
 */
import { getSkill } from '../src/data/skills.ts';
import { buildSoloChallenge } from '../src/services/challenges.ts';
import { judgeSolo } from '../src/services/referee.ts';

process.env.GEMINI_API_KEY = '';

type Case = [skillId: string, level: 1 | 2 | 3, sentence: string, expect: 'calzador' | 'pass'];

const CASES: Case[] = [
  // ── Vagas: SIEMPRE Anti-Calzador ──
  ['mitologia', 1, 'Me gusta la mitología', 'calzador'],
  ['mitologia', 1, 'Me gusta mucho la mitología', 'calzador'],
  ['paradigma', 1, 'Ayer leí sobre paradigma', 'calzador'],
  ['sinergia', 1, 'Es importante la sinergia', 'calzador'],
  ['sinergia', 1, 'Es muy importante la sinergia en un equipo de trabajo', 'calzador'],
  ['sinergia', 1, 'La sinergia es algo muy importante en la vida y en el trabajo de todos', 'calzador'],
  ['paradigma', 1, 'Ayer leí un artículo muy largo sobre el paradigma en internet', 'calzador'],
  ['mitologia', 1, 'Me gusta mucho la mitología griega y también la nórdica', 'calzador'],
  ['resiliencia', 1, 'La resiliencia es muy importante para todas las personas del mundo', 'calzador'],
  ['falacia', 1, 'Hoy en clase el profesor habló mucho sobre la falacia', 'calzador'],
  ['heuristica', 1, 'Creo que la heurística es un tema muy interesante para aprender', 'calzador'],
  ['dialectica', 1, 'La dialéctica es una palabra que escuché en una película', 'calzador'],
  ['catarsis', 1, 'Siempre he pensado que la catarsis es algo bueno', 'calzador'],
  ['escalabilidad', 2, 'Mi jefe siempre habla de escalabilidad en las reuniones de los lunes', 'calzador'],
  // ── Con contexto real: deben APROBAR ──
  ['mitologia', 1, 'Llegué tarde porque el bus pasó frente al viejo garaje donde nació la startup, y su mitología fundacional me obligó a detenerme para rendir culto al origen de todo.', 'pass'],
  ['mitologia', 1, 'La startup construyó toda una mitología alrededor de su primer garaje para inspirar a los nuevos empleados.', 'pass'],
  ['paradigma', 1, 'El trabajo remoto rompió el paradigma de que productividad era sinónimo de estar ocho horas sentado frente al jefe.', 'pass'],
  ['sinergia', 1, 'Juntar al diseñador obsesivo con la ingeniera pragmática generó una sinergia brutal: por separado entregaban tarde, en conjunto lanzaron en dos semanas.', 'pass'],
  ['resiliencia', 1, 'Tras el apagón que tumbó los servidores, la resiliencia del sistema quedó clara: se recuperó solo en minutos y nadie perdió un pedido.', 'pass'],
  ['falacia', 1, 'Decir que el plan es bueno porque lo propuso el gerente más antiguo es una falacia de autoridad: su antigüedad no prueba que el argumento sea válido.', 'pass'],
  ['catarsis', 2, 'Después de un mes de tensión acumulada, gritar el gol en el último minuto fue una catarsis colectiva que dejó a medio estadio llorando de alivio.', 'pass'],
];

let failures = 0;
for (const [id, level, sentence, expect] of CASES) {
  const challenge = buildSoloChallenge(getSkill(id)!, level);
  const { result: r } = await judgeSolo(challenge, sentence);
  const ok = expect === 'calzador' ? r.antiCalzadorTriggered && !r.passed : r.passed && !r.antiCalzadorTriggered;
  if (!ok) failures++;
  console.log(
    `${ok ? 'OK  ' : 'FAIL'} [${expect.padEnd(8)}] ${String(r.totalScore).padStart(3)} anti=${r.antiCalzadorTriggered ? 'Y' : 'n'} pass=${r.passed ? 'Y' : 'n'} | ${sentence.slice(0, 60)}`,
  );
  if (!ok || process.argv.includes('-v')) console.log(`       → ${r.feedback}`);
}
console.log(`\n${CASES.length - failures}/${CASES.length} casos OK`);
process.exit(failures ? 1 : 0);
