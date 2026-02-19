import type { RoadmapV2 } from "@/types/roadmap";

import FreedomSpec from "@/data/roadmap-specs-v2/Freedom_Enhanced_Spec.json";
import REMSpec from "@/data/roadmap-specs-v2/REM_Enhanced_Spec.json";
import LibertySpec from "@/data/roadmap-specs-v2/Liberty_Enhanced_Spec.json";
import BoostSpec from "@/data/roadmap-specs-v2/Boost_Enhanced_Spec.json";
import VictorySpec from "@/data/roadmap-specs-v2/Victory_Enhanced_Spec.json";
import FocusSpec from "@/data/roadmap-specs-v2/Focus_Enhanced_Spec.json";
import DefendSpec from "@/data/roadmap-specs-v2/Defend_Enhanced_Spec.json";
import IgniteSpec from "@/data/roadmap-specs-v2/Ignite_Enhanced_Spec.json";
import KickItSpec from "@/data/roadmap-specs-v2/Kick It_Enhanced_Spec.json";
import PeaceSpec from "@/data/roadmap-specs-v2/Peace_Enhanced_Spec.json";
import JoySpec from "@/data/roadmap-specs-v2/Joy_Enhanced_Spec.json";
import LumiSpec from "@/data/roadmap-specs-v2/Lumi_Enhanced_Spec.json";
import RocketSpec from "@/data/roadmap-specs-v2/Rocket_Enhanced_Spec.json";

const roadmapSpecs: Record<string, RoadmapV2> = {
  freedom: FreedomSpec as unknown as RoadmapV2,
  rem: REMSpec as unknown as RoadmapV2,
  liberty: LibertySpec as unknown as RoadmapV2,
  boost: BoostSpec as unknown as RoadmapV2,
  victory: VictorySpec as unknown as RoadmapV2,
  focus: FocusSpec as unknown as RoadmapV2,
  defend: DefendSpec as unknown as RoadmapV2,
  ignite: IgniteSpec as unknown as RoadmapV2,
  "kick-it": KickItSpec as unknown as RoadmapV2,
  peace: PeaceSpec as unknown as RoadmapV2,
  joy: JoySpec as unknown as RoadmapV2,
  lumi: LumiSpec as unknown as RoadmapV2,
  rocket: RocketSpec as unknown as RoadmapV2,
};

export function getRoadmapSpec(productId: string): RoadmapV2 | null {
  return roadmapSpecs[productId] || null;
}

export function hasRoadmapSpec(productId: string): boolean {
  return productId in roadmapSpecs;
}

export function getAllRoadmapProductIds(): string[] {
  return Object.keys(roadmapSpecs);
}
