import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, type ComponentType } from "react";
import * as THREE from "three";
import { ParametricMannequin } from "./ParametricMannequin";
import type { MannequinModelProps } from "./types";

export type View = "front" | "back" | "side";
const GOLD = "#D4AF37";
const AZIMUTH: Record<View, number> = { front: 0, side: Math.PI / 2, back: Math.PI };

export type StageFigure = MannequinModelProps & { key: string };

type Props = {
  figures: StageFigure[];
  view: View;
  zoom: boolean;
  autoRotate: boolean;
  /** Swap in any model implementing MannequinModelProps (e.g. a GLB loader). */
  Model?: ComponentType<MannequinModelProps>;
};

function CameraRig({ view, zoom, height, wide }: { view: View; zoom: boolean; height: number; wide: boolean }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void } | null };
  const animating = useRef(true);
  useEffect(() => { animating.current = true; }, [view, zoom, height, wide]);
  useEffect(() => {
    if (!controls) return;
    const stop = () => { animating.current = false; };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, raw) => {
    if (!animating.current || !controls) return;
    const k = 1 - Math.exp(-5 * Math.min(raw, 0.05));
    const target = new THREE.Vector3(0, height * (zoom ? 0.62 : 0.5), 0);
    controls.target.lerp(target, k);
    const sph = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const dist = (zoom ? 1.6 : 3.6) * (height / 1.7) * (wide ? 1.35 : 1);
    let dAz = AZIMUTH[view] - sph.theta;
    dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
    sph.theta += dAz * k;
    sph.radius += (dist - sph.radius) * k;
    sph.phi += (Math.PI / 2.1 - sph.phi) * k;
    camera.position.setFromSpherical(sph).add(controls.target);
    controls.update();
    if (Math.abs(dAz) < 0.002 && Math.abs(dist - sph.radius) < 0.004) animating.current = false;
  });
  return null;
}

function GoldRing({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.75 + Math.sin(clock.elapsedTime * 1.6) * 0.2;
  });
  return (
    <group position={[x, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={ref}>
        <ringGeometry args={[0.36, 0.375, 96]} />
        <meshBasicMaterial color={GOLD} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.001]}>
        <ringGeometry args={[0.3, 0.46, 96]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.08} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function FittingStage({ figures, view, zoom, autoRotate, Model = ParametricMannequin }: Props) {
  const spacing = 0.6;
  const height = Math.max(...figures.map((f) => f.body.height)) / 100;
  const wide = figures.length > 1;
  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      camera={{ position: [0, 0.9, 3.6], fov: 32, near: 0.05, far: 30 }}
    >
      <fog attach="fog" args={["#0D0D0D", 5, 12]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
      <directionalLight position={[-2.5, 3, -3]} intensity={1.1} color="#f3d98b" />
      <pointLight position={[0, 0.3, 1.2]} intensity={0.6} color={GOLD} distance={3} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color="#f5e9d6" position={[-4, 1.5, 2]} rotation-y={Math.PI / 3} scale={[3, 6, 1]} />
        <Lightformer intensity={0.8} color="#D4AF37" position={[4, 1, -2]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
      </Environment>

      {figures.map((f, i) => {
        const x = (i - (figures.length - 1) / 2) * spacing;
        const { key, ...props } = f;
        return (
          <group key={key} position={[x, 0, 0]}>
            <Model {...props} />
          </group>
        );
      })}
      {figures.map((f, i) => <GoldRing key={f.key} x={(i - (figures.length - 1) / 2) * spacing} />)}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#111111" roughness={0.35} metalness={0.2} />
      </mesh>
      <ContactShadows position={[0, 0.002, 0]} opacity={0.65} scale={4} blur={2.4} far={2} resolution={256} color="#000000" />

      <OrbitControls
        makeDefault enablePan={false} autoRotate={autoRotate} autoRotateSpeed={1.6}
        minDistance={0.9} maxDistance={6} minPolarAngle={0.3} maxPolarAngle={Math.PI / 1.95}
        enableDamping dampingFactor={0.08}
      />
      <CameraRig view={view} zoom={zoom} height={height} wide={wide} />
    </Canvas>
  );
}
