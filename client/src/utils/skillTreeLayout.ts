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
  /** Lado donde se coloca la etiqueta + contador respecto de la base. */
  labelSide: 'left' | 'right' | 'below';
}

export interface TreeLayout {
  stage: StageSpec;
  nodes: Record<string, Pt>;
  edges: LayoutEdge[];
  anchors: BranchAnchor[];
  /** Vértices intermedios (destellos pequeños). */
  vertices: Pt[];
  trunk: { bottom: Pt; fork: Pt } | null;
}

export const STAGE_FULL: StageSpec = { width: 1200, height: 0, nodeLg: 66, nodeSm: 54, labelPx: 13 };
export const STAGE_BRANCH: StageSpec = { width: 410, height: 0, nodeLg: 74, nodeSm: 60, labelPx: 15 };

const TIER_DIST: Record<1 | 2 | 3, number> = { 1: 120, 2: 255, 3: 390 };
const TOP_MARGIN = 92;

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

  const anchors = placements.map((pl) => ({ branch: pl.branch, base: pl.base, labelSide: pl.labelSide }));
  return normalize({ nodes, edges, vertices, anchors, trunk: { bottom, fork } }, STAGE_FULL, 22);
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
    { nodes, edges, vertices, anchors: [{ branch, base: placement.base, labelSide: 'below' }], trunk: null },
    STAGE_BRANCH,
    84,
  );
}

/** Ajusta verticalmente para que el nodo más alto quede a TOP_MARGIN y calcula la altura final. */
function normalize(layout: Omit<TreeLayout, 'stage'>, spec: StageSpec, bottomPad: number): TreeLayout {
  const points = Object.values(layout.nodes);
  const minY = Math.min(...points.map((p) => p.y));
  const dy = TOP_MARGIN - minY;

  // Las aristas guardan referencias a puntos de nodos/bases; recolectamos los únicos para moverlos una vez.
  const unique = new Set<Pt>();
  Object.values(layout.nodes).forEach((p) => unique.add(p));
  layout.vertices.forEach((p) => unique.add(p));
  layout.anchors.forEach((a) => unique.add(a.base));
  layout.edges.forEach((e) => e.points.forEach((p) => unique.add(p)));
  if (layout.trunk) {
    unique.add(layout.trunk.bottom);
    unique.add(layout.trunk.fork);
  }
  unique.forEach((p) => {
    p.y += dy;
  });

  const maxY = Math.max(...[...unique].map((p) => p.y));
  return { ...layout, stage: { ...spec, height: Math.ceil(maxY + bottomPad) } };
}

