import { WordTrack } from "@/types/wordtrack";

import { freedomD2CWordTrack } from "./d2c/freedom";
import { remD2CWordTrack } from "./d2c/rem";
import { libertyD2CWordTrack } from "./d2c/liberty";
import { boostD2CWordTrack } from "./d2c/boost";
import { victoryD2CWordTrack } from "./d2c/victory";
import { focusD2CWordTrack } from "./d2c/focus";
import { defendD2CWordTrack } from "./d2c/defend";
import { igniteD2CWordTrack } from "./d2c/ignite";
import { kickItD2CWordTrack } from "./d2c/kick-it";
import { peaceD2CWordTrack } from "./d2c/peace";
import { joyD2CWordTrack } from "./d2c/joy";
import { lumiD2CWordTrack } from "./d2c/lumi";
import { rocketD2CWordTrack } from "./d2c/rocket";

export const wordTracks: { [productId: string]: WordTrack } = {
  freedom: freedomD2CWordTrack,
  rem: remD2CWordTrack,
  liberty: libertyD2CWordTrack,
  boost: boostD2CWordTrack,
  victory: victoryD2CWordTrack,
  focus: focusD2CWordTrack,
  defend: defendD2CWordTrack,
  ignite: igniteD2CWordTrack,
  "kick-it": kickItD2CWordTrack,
  peace: peaceD2CWordTrack,
  joy: joyD2CWordTrack,
  lumi: lumiD2CWordTrack,
  rocket: rocketD2CWordTrack,
};

export function getWordTrack(productId: string): WordTrack | null {
  return wordTracks[productId] || null;
}

export function getAvailableProducts(): string[] {
  return Object.keys(wordTracks);
}

export function hasWordTrack(productId: string): boolean {
  return productId in wordTracks;
}
