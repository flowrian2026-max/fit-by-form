import { useMemo } from "react";
import * as THREE from "three";
import type { Body, Zone, FitStatus } from "@/lib/fit";
import type { MannequinModelProps, LayerSpec } from "./types";

const SKIN = new THREE.Color("#d9cfc0");
export const FIT_COLORS: Record<FitStatus, THREE.Color> = {
  perfect: new THREE.Color("#3ccf7a"),
  tight: new THREE.Color("#f2a531"),
  loose: new THREE.Color("#3f9cff"),
};
const DEPTH = 0.74; // torso front-back squash
const SEG = 28; // radial segments – kept low for mobile

/** Circumference (cm) → half-width (m) of an ellipse with DEPTH ratio. */
const radius = (c: number) => c / 100 / (Math.PI * (1 + DEPTH));

export function proportions(b: Body) {
  const H = b.height / 100;
  return {
    H, s: H / 1.7,
    rB: radius(b.bust), rW: radius(b.waist), rH: radius(b.hips),
    ankle: 0.04 * H, knee: 0.27 * H, crotch: 0.46 * H, hipY: 0.52 * H,
    waistY: 0.62 * H, bustY: 0.72 * H, shoulderY: 0.815 * H, neckY: 0.85 * H, headY: 0.925 * H,
  };
}
type P = ReturnType<typeof proportions>;

function lathe(keys: [number, number][], open = false, divisions = 36) {
  const curve = new THREE.SplineCurve(keys.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0005), y)));
  const pts = curve.getPoints(divisions);
  const g = new THREE.LatheGeometry(pts, SEG);
  if (open) g.computeVertexNormals();
  return g;
}

function torsoKeys(p: P, rB: number, rW: number, rH: number): [number, number][] {
  const neck = 0.034 * p.s;
  return [
    [0.0005, p.crotch - 0.01], [rH * 0.72, p.crotch], [rH * 0.98, (p.crotch + p.hipY) / 2], [rH, p.hipY],
    [(rH + rW) / 2, (p.hipY + p.waistY) / 2], [rW, p.waistY], [(rW + rB) / 2 * 1.01, (p.waistY + p.bustY) / 2],
    [rB, p.bustY], [rB * 0.97, p.shoulderY - 0.035 * p.s], [rB * 0.72, p.shoulderY], [neck * 1.2, p.shoulderY + 0.02 * p.s],
    [neck, p.neckY], [0.0005, p.neckY + 0.004],
  ];
}

function legKeys(p: P, grow = 0): [number, number][] {
  const g = (r: number) => r * p.s + grow;
  return [
    [0.0005, p.ankle - 0.01], [g(0.03), p.ankle], [g(0.04), p.ankle + 0.1 * p.H], [g(0.045), p.knee],
    [g(0.058), p.knee + 0.08 * p.H], [p.rH * 0.5 + grow, p.crotch], [0.0005, p.crotch + 0.015],
  ];
}

function armKeys(p: P, L: number, grow = 0): [number, number][] {
  const g = (r: number) => r * p.s + grow;
  return [[0.0005, -L - 0.01], [g(0.022), -L], [g(0.025), -L * 0.55], [g(0.034), -L * 0.42], [g(0.04), -0.08 * p.s], [g(0.045), -0.02], [0.0005, 0.02]];
}

const statusWeightColor = (y: number, p: P, fit: Partial<Record<Zone, FitStatus>>) => {
  const zones: [Zone, number][] = [["bust", p.bustY], ["waist", p.waistY], ["hips", p.hipY]];
  const sigma = 0.045 * p.H;
  const c = SKIN.clone();
  for (const [z, zy] of zones) {
    const st = fit[z];
    if (!st) continue;
    const w = Math.exp(-((y - zy) ** 2) / (2 * sigma * sigma));
    c.lerp(FIT_COLORS[st], Math.min(1, w * 1.15));
  }
  return c;
};

function useBodyGeometry(p: P, fitMap: boolean, fit: Partial<Record<Zone, FitStatus>>) {
  const torso = useMemo(() => lathe(torsoKeys(p, p.rB, p.rW, p.rH), false, 48), [p]);
  useMemo(() => {
    const pos = torso.attributes.position!;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const c = fitMap ? statusWeightColor(pos.getY(i), p, fit) : SKIN;
      colors.set([c.r, c.g, c.b], i * 3);
    }
    torso.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [torso, fitMap, fit, p]);
  const leg = useMemo(() => lathe(legKeys(p)), [p]);
  const arm = useMemo(() => lathe(armKeys(p, 0.36 * p.H)), [p]);
  return { torso, leg, arm };
}

function GarmentMaterial({ spec, ghost }: { spec: LayerSpec; ghost: boolean }) {
  const rough = spec.shape === "skirt" || spec.shape === "blouse" ? 0.32 : spec.shape === "knit" ? 0.95 : spec.shape === "pump" ? 0.25 : 0.7;
  return (
    <meshStandardMaterial
      color={spec.color} roughness={rough} metalness={spec.shape === "skirt" ? 0.15 : 0}
      side={THREE.DoubleSide} transparent={ghost} opacity={ghost ? 0.18 : 1} depthWrite={!ghost}
    />
  );
}

function Garment({ spec, p, ghost }: { spec: LayerSpec; p: P; ghost: boolean }) {
  // Garment radii come from its size chart; fall back to body + a little ease. Never smaller than the body (tight = hugging).
  const gr = (z: Zone, body: number, extra: number) => Math.max(body + 0.003, (spec.measures[z] ? radius(spec.measures[z]!) : body + 0.008) + extra);
  const rB = gr("bust", p.rB, spec.shape === "coat" ? 0.01 : 0);
  const rW = gr("waist", p.rW, spec.shape === "coat" ? 0.01 : 0);
  const rH = gr("hips", p.rH, spec.shape === "coat" ? 0.012 : 0);
  const shoulderX = p.rB + 0.028 * p.s;
  const L = 0.36 * p.H;

  const geo = useMemo(() => {
    const neck = 0.04 * p.s;
    switch (spec.shape) {
      case "blouse": case "knit": {
        const bottom = spec.shape === "blouse" ? p.hipY + 0.01 : p.waistY - 0.05 * p.s;
        return { body: lathe([[rW * 1.03, bottom], [rW, p.waistY], [(rW + rB) / 2 * 1.01, (p.waistY + p.bustY) / 2], [rB, p.bustY], [rB * 0.98, p.shoulderY - 0.035 * p.s], [rB * 0.74, p.shoulderY + 0.004], [neck, p.shoulderY + 0.02 * p.s]], true),
          sleeve: lathe(armKeys(p, spec.shape === "knit" ? L * 0.9 : 0.13 * p.H, 0.006).slice(1), true) };
      }
      case "coat":
        return { body: lathe([[rH * 1.1, 0.34 * p.H], [rH, p.hipY], [rW, p.waistY], [rB, p.bustY], [rB * 0.99, p.shoulderY - 0.03 * p.s], [rB * 0.78, p.shoulderY + 0.01], [neck * 1.25, p.neckY - 0.005]], true),
          sleeve: lathe(armKeys(p, L * 0.93, 0.014).slice(1), true) };
      case "trouser":
        return { body: lathe([[rH * 0.74, p.crotch], [rH, p.hipY], [(rH + rW) / 2, (p.hipY + p.waistY) / 2], [rW, p.waistY + 0.012]], true),
          leg: lathe(legKeys(p, 0.008 + Math.max(0, rH - p.rH) * 0.6).slice(1, -1), true) };
      case "skirt":
        return { body: lathe([[rH * 1.22, p.knee + 0.04 * p.H], [rH * 1.06, (p.crotch + p.knee) / 2 + 0.03], [rH, p.hipY], [(rH + rW) / 2, (p.hipY + p.waistY) / 2], [rW, p.waistY + 0.012]], true) };
      default:
        return {};
    }
  }, [spec.shape, rB, rW, rH, p, L, neck0(p)]);

  if (spec.shape === "pump") {
    return (
      <group>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * p.rH * 0.45, 0.025, 0.04 * p.s]} castShadow>
            <capsuleGeometry args={[0.03 * p.s, 0.1 * p.s, 4, 10]} />
            <GarmentMaterial spec={spec} ghost={ghost} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      {geo.body && <mesh geometry={geo.body} scale={[1, 1, DEPTH]} castShadow><GarmentMaterial spec={spec} ghost={ghost} /></mesh>}
      {geo.sleeve && [-1, 1].map((sx) => (
        <mesh key={sx} geometry={geo.sleeve} position={[sx * shoulderX, p.shoulderY - 0.03 * p.s, 0]} rotation={[0, 0, sx * 0.1]} castShadow>
          <GarmentMaterial spec={spec} ghost={ghost} />
        </mesh>
      ))}
      {geo.leg && [-1, 1].map((sx) => (
        <mesh key={sx} geometry={geo.leg} position={[sx * p.rH * 0.45, 0, 0]} castShadow><GarmentMaterial spec={spec} ghost={ghost} /></mesh>
      ))}
    </group>
  );
}
const neck0 = (p: P) => p.s;

export function ParametricMannequin({ body, layers, fitMap, fit }: MannequinModelProps) {
  const p = useMemo(() => proportions(body), [body.height, body.bust, body.waist, body.hips]); // eslint-disable-line react-hooks/exhaustive-deps
  const { torso, leg, arm } = useBodyGeometry(p, fitMap, fit);
  const shoulderX = p.rB + 0.028 * p.s;
  const order = ["bottom", "shoes", "top", "outer"];
  const sorted = [...layers].sort((a, b) => order.indexOf(a.layer) - order.indexOf(b.layer));

  return (
    <group>
      <mesh geometry={torso} scale={[1, 1, DEPTH]} castShadow>
        <meshStandardMaterial vertexColors roughness={0.5} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={"l" + sx} geometry={leg} position={[sx * p.rH * 0.45, 0, 0]} castShadow>
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
      ))}
      {[-1, 1].map((sx) => (
        <mesh key={"a" + sx} geometry={arm} position={[sx * shoulderX, p.shoulderY - 0.03 * p.s, 0]} rotation={[0, 0, sx * 0.1]} castShadow>
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, p.headY, 0.005]} scale={[0.82 * p.s, 1.08 * p.s, 0.92 * p.s]} castShadow>
        <sphereGeometry args={[0.1, 24, 16]} />
        <meshStandardMaterial color={SKIN} roughness={0.45} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={"f" + sx} position={[sx * p.rH * 0.45, 0.02, 0.035 * p.s]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.026 * p.s, 0.09 * p.s, 4, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.5} />
        </mesh>
      ))}
      {sorted.map((spec) => <Garment key={spec.layer} spec={spec} p={p} ghost={fitMap} />)}
    </group>
  );
}
