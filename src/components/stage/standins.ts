import { CX, type Landmarks } from "@/lib/warp";
import type { Shape } from "@/lib/catalog";

type P = [number, number];

/** Catmull-Rom → cubic Bézier, closed. */
export function smooth(pts: P[]): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n]!;
  let d = `M${at(0)[0]},${at(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d + "Z";
}
/** Left-side points (top→bottom) mirrored into a closed outline, with an optional centre neck point. */
const mirror = (left: P[], neck?: P): P[] => [
  ...(neck ? [neck] : []),
  ...left.map(([x, y]) => [CX - x, y] as P).reverse(),
  ...left.map(([x, y]) => [CX + x, y] as P),
];
const flip = (left: P[]): P[] => left.map(([x, y]) => [CX + x, y]);

/** Stand-in figure drawn from the body type's landmarks (used until a real photo is uploaded). */
export function figurePaths(lm: Landmarks) {
  const { shoulders: s, bust: b, waist: w, hips: h, knees: k, ankles: a } = lm;
  const half: P[] = [
    [14, 148],
    [17, 174],
    [s.hw, s.y + 8],
    [b.hw, b.y],
    [w.hw, w.y],
    [h.hw, h.y],
    [k.hw, k.y],
    [a.hw - 6, a.y],
    [a.hw, 866],
    [10, 868],
    [12, a.y],
    [8, k.y],
    [2, 466],
  ];
  const left = half.map(([x, y]) => [CX - x, y] as P);
  const right = half.map(([x, y]) => [CX + x, y] as P).reverse();
  const body = smooth([...left, ...right]);
  const arm: P[] = [
    [s.hw - 2, s.y + 2],
    [s.hw + 14, s.y + 34],
    [b.hw + 20, w.y],
    [h.hw + 16, 468],
    [h.hw + 4, 474],
    [b.hw + 6, w.y],
    [s.hw - 6, s.y + 44],
  ];
  const armL = smooth(arm.map(([x, y]) => [CX - x, y] as P));
  const armR = smooth(flip(arm));
  return { body, arms: [armL, armR] };
}

/** Flat stand-in garment art in reference coordinates; JSON anchors match these outlines. */
export function garmentPath(shape: Shape): string[] {
  switch (shape) {
    case "blouse":
      return [
        smooth(
          mirror(
            [
              [22, 182],
              [66, 192],
              [84, 296],
              [68, 304],
              [56, 262],
              [46, 330],
              [60, 440],
            ],
            [CX, 210],
          ),
        ),
      ];
    case "knit":
      return [
        smooth(
          mirror(
            [
              [20, 180],
              [66, 192],
              [82, 300],
              [90, 462],
              [74, 464],
              [60, 300],
              [46, 330],
              [56, 420],
            ],
            [CX, 194],
          ),
        ),
      ];
    case "coat":
      return [
        smooth(
          mirror(
            [
              [24, 178],
              [70, 188],
              [88, 300],
              [94, 470],
              [78, 474],
              [64, 320],
              [52, 334],
              [66, 450],
              [76, 660],
            ],
            [CX, 262],
          ),
        ),
      ];
    case "dress":
      return [
        smooth(
          mirror(
            [
              [22, 182],
              [62, 192],
              [70, 232],
              [52, 252],
              [42, 330],
              [58, 410],
              [80, 640],
            ],
            [CX, 214],
          ),
        ),
      ];
    case "skirt":
      return [
        smooth(
          mirror(
            [
              [42, 324],
              [60, 410],
              [76, 600],
            ],
            [CX, 322],
          ),
        ),
      ];
    case "trouser":
      return [
        smooth(
          mirror(
            [
              [1, 472],
              [8, 630],
              [10, 850],
              [36, 850],
              [44, 630],
              [58, 410],
              [42, 326],
            ].reverse() as P[],
          ),
        ),
      ];
    case "pump":
      return [
        `M${CX - 30},850 L${CX - 9},850 L${CX - 6},869 L${CX - 34},869 Z`,
        `M${CX + 9},850 L${CX + 30},850 L${CX + 34},869 L${CX + 6},869 Z`,
      ];
  }
}
