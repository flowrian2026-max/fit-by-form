import type { Body, FitStatus, Zone } from "@/lib/fit";

export type GarmentShape = "blouse" | "knit" | "trouser" | "skirt" | "coat" | "pump";
export type LayerSpec = {
  layer: "top" | "bottom" | "outer" | "shoes";
  shape: GarmentShape;
  color: string;
  /** Garment circumferences (cm) for the chosen size. */
  measures: Partial<Record<Zone, number>>;
};

/**
 * Contract for any mannequin model rendered inside the fitting stage.
 * A GLB-based model can implement this same interface and be passed to <FittingStage Model={...} />.
 * Units: meters, feet at y = 0, facing +Z.
 */
export type MannequinModelProps = {
  body: Body;
  layers: LayerSpec[];
  fitMap: boolean;
  fit: Partial<Record<Zone, FitStatus>>;
};
