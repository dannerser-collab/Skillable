import type { Branch, Skill } from '../../../shared/types.ts';

/**
 * Geometría del Árbol de Skills estilo constelación.
 *
 * Cada rama se diseña en un marco local (base en 0,0; "arriba" = -y) usando posX del
 * dataset para el desplazamiento lateral y el tier para la altura; luego se rota y se
 * traslada para abrirse en abanico desde un tronco común. Todo en unidades de "escenario"
 * (px lógicos) que el componente escala uniformemente al ancho disponible.
 */

export interface Pt {
  x: number;
  y: number;
}

export interface StageSpec {
  width: number;
  height: number;
  /** Diámetro de nodos T1/T3 y T2. */
  nodeLg: number;
  nodeSm: number;
  labelPx: number;
}

export interface LayoutEdge {
  id: string;
  /** null = segmento de raíz (tronco/base → T1). */
  parentId: string | null;
  childId: string | null;
  branch: Branch;
  points: Pt[];
}

export interface BranchAnchor {
  branch: Branch;
  base: Pt;
  /** Lado donde se coloca la etiqueta + contador respecto de `labelAt`. */
  labelSide: 'left' | 'right' | 'below';
  /** Punto de anclaje de la etiqueta (la base, o el pie del tronco para la rama central). */
  labelAt: Pt;
}

export interface TreeLayout {
  stage: StageSpec;
  nodes: Record<string, Pt>;
  /** Lado elegido para la etiqueta de cada nodo (evita cruzar rutas, nodos y bordes). */
  labels: Record<string, LabelSide>;
  edges: LayoutEdge[];
  anchors: BranchAnchor[];
  /** Vértices intermedios (destellos pequeños). */
  vertices: Pt[];
  trunk: { bottom: Pt; fork: Pt } | null;
}

export const STAGE_FULL: StageSpec = { width: 1260, height: 0, nodeLg: 66, nodeSm: 54, labelPx: 13 };
export const STAGE_BRANCH: StageSpec = { width: 520, height: 0, nodeLg: 74, nodeSm: 60, labelPx: 16 };

const TIER_DIST: Record<1 | 2 | 3, number> = { 1: 120, 2: 255, 3: 390 };
const TOP_MARGIN = 92;
/** Vista por rama: margen extra arriba para que la etiqueta del Tier 3 pueda ir encima sin cortarse. */
const BRANCH_TOP_MARGIN = 124;

function rotate(p: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

/** Polilínea angular A → vértice → B: el vértice se desplaza en perpendicular para dar el "quiebre" estelar. */
function kinked(a: Pt, b: Pt, bend: number, t = 0.52): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const v = { x: a.x + dx * t + nx * bend, y: a.y + dy * t + ny * bend };
  return [a, v, b];
}

interface BranchPlacement {
  branch: Branch;
  base: Pt;
  angle: number;
  lateral: number;
  labelSide: BranchAnchor['labelSide'];
}

function placeBranches(skills: Skill[], placements: BranchPlacement[]): {
  nodes: Record<string, Pt>;
  edges: LayoutEdge[];
  vertices: Pt[];
} {
  const nodes: Record<string, Pt> = {};
  for (const pl of placements) {
    for (const skill of skills.filter((s) => s.branch === pl.branch)) {
      const local = { x: (skill.posX - 50) * pl.lateral, y: -TIER_DIST[skill.tier] };
      const r = rotate(local, pl.angle);
      nodes[skill.id] = { x: pl.base.x + r.x, y: pl.base.y + r.y };
    }
  }

  const edges: LayoutEdge[] = [];
  const vertices: Pt[] = [];
  const byId = new Map(skills.map((s) => [s.id, s]));

  for (const pl of placements) {
    const branchSkills = skills.filter((s) => s.branch === pl.branch);
    for (const root of branchSkills.filter((s) => s.parentIds.length === 0)) {
      const pts = kinked(pl.base, nodes[root.id], 10);
      edges.push({ id: `root:${root.id}`, parentId: null, childId: root.id, branch: pl.branch, points: pts });
      vertices.push(pts[1]);
    }
    for (const child of branchSkills) {
      for (const parentId of child.parentIds) {
        const parent = byId.get(parentId);
        if (!parent || !nodes[parentId]) continue;
        const a = nodes[parentId];
        const b = nodes[child.id];
        // Quiebre hacia "fuera" de la rama: alterna según el lado del hijo.
        const bend = (b.x >= a.x ? -1 : 1) * 16;
        const pts = kinked(a, b, bend, 0.46);
        edges.push({ id: `${parentId}->${child.id}`, parentId, childId: child.id, branch: pl.branch, points: pts });
        vertices.push(pts[1]);
      }
    }
  }
  return { nodes, edges, vertices };
}

/** Vista "Todas": tres ramas en abanico desde un tronco común inferior central. */
export function buildFullLayout(skills: Skill[], branches: Branch[]): TreeLayout {
  const cx = STAGE_FULL.width / 2;
  const presets: Record<number, Omit<BranchPlacement, 'branch'>[]> = {
    1: [{ base: { x: cx, y: 600 }, angle: 0, lateral: 4.4, labelSide: 'right' }],
    2: [
      { base: { x: cx - 190, y: 610 }, angle: -18, lateral: 4.2, labelSide: 'left' },
      { base: { x: cx + 190, y: 610 }, angle: 18, lateral: 4.2, labelSide: 'right' },
    ],
    3: [
      { base: { x: cx - 250, y: 622 }, angle: -24, lateral: 4.2, labelSide: 'left' },
      { base: { x: cx, y: 600 }, angle: 0, lateral: 4.2, labelSide: 'right' },
      { base: { x: cx + 250, y: 622 }, angle: 24, lateral: 4.2, labelSide: 'right' },
    ],
  };
  const slots = presets[Math.min(3, Math.max(1, branches.length))];
  const placements: BranchPlacement[] = branches.slice(0, 3).map((branch, i) => ({
    branch,
    ...slots[i],
    base: { ...slots[i].base },
  }));

  const { nodes, edges, vertices } = placeBranches(skills, placements);
  const fork = { x: cx, y: 668 };
  const bottom = { x: cx, y: 700 };

  // Raíces: tronco → bifurcación → base de cada rama.
  for (const pl of placements) {
    const pts = pl.base.x === cx ? [fork, pl.base] : kinked(fork, pl.base, pl.base.x < cx ? 8 : -8, 0.55);
    edges.push({ id: `trunk:${pl.branch}`, parentId: null, childId: null, branch: pl.branch, points: pts });
    if (pts.length === 3) vertices.push(pts[1]);
  }

  // La rama central comparte eje con el tronco: su etiqueta va bajo el pie del tronco para que
  // ninguna ruta (tronco → bases laterales) cruce el texto ni el contador.
  const anchors: BranchAnchor[] = placements.map((pl) =>
    pl.base.x === cx
      ? { branch: pl.branch, base: pl.base, labelSide: 'below', labelAt: bottom }
      : { branch: pl.branch, base: pl.base, labelSide: pl.labelSide, labelAt: pl.base },
  );
  const hasCenterLabel = anchors.some((a) => a.labelSide === 'below');
  return normalize(skills, { nodes, edges, vertices, anchors, trunk: { bottom, fork } }, STAGE_FULL, hasCenterLabel ? 104 : 22);
}

/** Una sola rama (filtro por rama, o apiladas en móvil). */
export function buildBranchLayout(skills: Skill[], branch: Branch): TreeLayout {
  const placement: BranchPlacement = {
    branch,
    base: { x: STAGE_BRANCH.width / 2, y: 470 },
    angle: 0,
    lateral: 4.4,
    labelSide: 'below',
  };
  const { nodes, edges, vertices } = placeBranches(skills, [placement]);
  return normalize(
    skills,
    {
      nodes,
      edges,
      vertices,
      anchors: [{ branch, base: placement.base, labelSide: 'below', labelAt: placement.base }],
      trunk: null,
    },
    STAGE_BRANCH,
    84,
    BRANCH_TOP_MARGIN,
  );
}

/** Ajusta verticalmente para que el nodo más alto quede a TOP_MARGIN y calcula la altura final. */
function normalize(
  skills: Skill[],
  layout: Omit<TreeLayout, 'stage' | 'labels'>,
  spec: StageSpec,
  bottomPad: number,
  topMargin = TOP_MARGIN,
): TreeLayout {
  const points = Object.values(layout.nodes);
  const minY = Math.min(...points.map((p) => p.y));
  const dy = topMargin - minY;

  // Las aristas guardan referencias a puntos de nodos/bases; recolectamos los únicos para moverlos una vez.
  const unique = new Set<Pt>();
  Object.values(layout.nodes).forEach((p) => unique.add(p));
  layout.vertices.forEach((p) => unique.add(p));
  layout.anchors.forEach((a) => {
    unique.add(a.base);
    unique.add(a.labelAt);
  });
  layout.edges.forEach((e) => e.points.forEach((p) => unique.add(p)));
  if (layout.trunk) {
    unique.add(layout.trunk.bottom);
    unique.add(layout.trunk.fork);
  }
  unique.forEach((p) => {
    p.y += dy;
  });

  const maxY = Math.max(...[...unique].map((p) => p.y));
  const stage = { ...spec, height: Math.ceil(maxY + bottomPad) };
  return { ...layout, stage, labels: placeLabels(skills, layout, stage) };
}

/* ── Colocación de etiquetas ─────────────────────────────────────────────── */

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const D = Math.SQRT1_2;

/**
 * Cada lado define: dirección del punto de anclaje desde el centro del nodo (ux, uy) y
 * qué fracción de la caja se desplaza respecto a ese punto (tx, ty). El render usa
 * exactamente lo mismo (`translate(tx*100%, ty*100%)`), así el ancho real del texto no
 * descuadra la colocación.
 */
export const LABEL_SIDES = {
  below: { ux: 0, uy: 1, tx: -0.5, ty: 0 },
  right: { ux: 1, uy: 0, tx: 0, ty: -0.5 },
  left: { ux: -1, uy: 0, tx: -1, ty: -0.5 },
  'below-right': { ux: D, uy: D, tx: 0, ty: 0 },
  'below-left': { ux: -D, uy: D, tx: -1, ty: 0 },
  'above-right': { ux: D, uy: -D, tx: 0, ty: -1 },
  'above-left': { ux: -D, uy: -D, tx: -1, ty: -1 },
  above: { ux: 0, uy: -1, tx: -0.5, ty: -1 },
} as const;

export type LabelSide = keyof typeof LABEL_SIDES;

/** Distancia del anclaje al borde del círculo (los nodos T1/T3 tienen anillos exteriores hasta +12 px). */
export function labelGap(tier: number, side: LabelSide): number {
  const major = tier !== 2;
  const { ux, uy } = LABEL_SIDES[side];
  if (ux !== 0 && uy !== 0) return major ? 14 : 5;
  if (uy === 0) return major ? 16 : 10;
  return major ? 18 : 12;
}

export function nodeDiameter(stage: StageSpec, tier: number): number {
  return tier === 2 ? stage.nodeSm : stage.nodeLg;
}

/** Caja estimada de la píldora (nombre + estado, padding incluido). */
function labelSize(skill: Skill, labelPx: number): { w: number; h: number } {
  const wordW = skill.word.length * labelPx * 0.64;
  const stateW = 'Oxidada · Nv.3'.length * labelPx * 0.76 * 0.62;
  return { w: Math.max(wordW, stateW) + 22, h: labelPx * 1.3 + labelPx * 0.76 * 1.4 + 6 };
}

function labelRect(c: Pt, r: number, tier: number, size: { w: number; h: number }, side: LabelSide): Rect {
  const { ux, uy, tx, ty } = LABEL_SIDES[side];
  const d = r + labelGap(tier, side);
  return { x: c.x + ux * d + tx * size.w, y: c.y + uy * d + ty * size.h, w: size.w, h: size.h };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function circleHitsRect(c: Pt, r: number, rc: Rect): boolean {
  const nx = Math.max(rc.x, Math.min(c.x, rc.x + rc.w));
  const ny = Math.max(rc.y, Math.min(c.y, rc.y + rc.h));
  return Math.hypot(c.x - nx, c.y - ny) < r;
}

/** Recorte Liang–Barsky: ¿el segmento a→b atraviesa el rectángulo? */
function segmentHitsRect(a: Pt, b: Pt, rc: Rect): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - rc.x, rc.x + rc.w - a.x, a.y - rc.y, rc.y + rc.h - a.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/**
 * Desplazamiento vertical (px) del borde superior de las etiquetas laterales de rama respecto
 * de su base: bajarlas un poco las aleja de la ruta base → T1, que sube en diagonal hacia fuera.
 */
export const BRANCH_LABEL_TOP = -12;

/** Caja aproximada de la etiqueta de rama (nombre + contador grande) junto a su base. */
function anchorRect(a: BranchAnchor): Rect {
  const p = a.labelAt;
  if (a.labelSide === 'left') return { x: p.x - 22 - 180, y: p.y + BRANCH_LABEL_TOP, w: 180, h: 64 };
  if (a.labelSide === 'right') return { x: p.x + 22, y: p.y + BRANCH_LABEL_TOP, w: 180, h: 64 };
  return { x: p.x - 110, y: p.y + 16, w: 220, h: 76 };
}

/**
 * Elige para cada nodo el lado de la etiqueta con menor coste: cruces con rutas,
 * solapes con otros nodos/etiquetas, desbordes del escenario y una preferencia suave
 * (abajo > lado exterior de la rama > diagonales > lado interior > arriba).
 */
function placeLabels(
  skills: Skill[],
  layout: Omit<TreeLayout, 'stage' | 'labels'>,
  stage: StageSpec,
): Record<string, LabelSide> {
  const placed = skills.filter((s) => layout.nodes[s.id]);
  const segments: [Pt, Pt][] = [];
  for (const e of layout.edges) for (let i = 1; i < e.points.length; i++) segments.push([e.points[i - 1], e.points[i]]);
  if (layout.trunk) segments.push([layout.trunk.bottom, layout.trunk.fork]);
  const anchorBoxes = layout.anchors.map(anchorRect);
  const baseX = new Map(layout.anchors.map((a) => [a.branch, a.base.x]));

  const result: Record<string, LabelSide> = {};
  const taken: Rect[] = [];
  const PAD = 3;

  // Primero los nodos más altos (T3): suelen tener más rutas alrededor.
  const order = [...placed].sort((a, b) => b.tier - a.tier);
  for (const skill of order) {
    const c = layout.nodes[skill.id];
    const r = nodeDiameter(stage, skill.tier) / 2;
    const size = labelSize(skill, stage.labelPx);
    const offset = c.x - (baseX.get(skill.branch) ?? c.x);
    const outerSign = Math.abs(offset) < 4 ? 0 : Math.sign(offset);

    let best: LabelSide = 'below';
    let bestCost = Infinity;
    for (const side of Object.keys(LABEL_SIDES) as LabelSide[]) {
      const { ux, uy } = LABEL_SIDES[side];
      const sx = Math.sign(ux);
      const lateral = sx === 0 ? 0 : outerSign === 0 ? 0.5 : sx === outerSign ? 0 : 1.5;
      let cost = (uy > 0 ? 0 : uy === 0 ? 1 : 3) + lateral + (sx !== 0 && uy !== 0 ? 0.5 : 0);

      const box = labelRect(c, r, skill.tier, size, side);
      const hit = { x: box.x - PAD, y: box.y - PAD, w: box.w + PAD * 2, h: box.h + PAD * 2 };
      for (const [a, b] of segments) if (segmentHitsRect(a, b, hit)) cost += 10;
      for (const other of placed) {
        if (other.id === skill.id) continue;
        const ro = nodeDiameter(stage, other.tier) / 2 + (other.tier !== 2 ? 12 : 4);
        if (circleHitsRect(layout.nodes[other.id], ro, hit)) cost += 50;
      }
      for (const t of taken) if (rectsOverlap(t, hit)) cost += 40;
      for (const ab of anchorBoxes) if (rectsOverlap(ab, hit)) cost += 30;
      const overflow =
        Math.max(0, -box.x) +
        Math.max(0, box.x + box.w - stage.width) +
        Math.max(0, -box.y) +
        Math.max(0, box.y + box.h - stage.height);
      if (overflow > 0) cost += 20 + overflow * 0.2;
      if (cost < bestCost) {
        bestCost = cost;
        best = side;
      }
    }
    result[skill.id] = best;
    taken.push(labelRect(c, r, skill.tier, size, best));
  }
  return result;
}
