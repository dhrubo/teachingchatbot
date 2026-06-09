// lib/ai/guest-mission.ts
import { type MissionDefinition, getMission, MISSIONS } from "./missions";

const GUEST_MISSION_IDS = [
  "missions/percentages",
  "missions/ratio",
  "missions/algebra-basics",
  "missions/graphs",
  "missions/angles",
  "missions/simultaneous-equations",
  "missions/pythagoras",
  "missions/indices",
  "missions/probability",
  "missions/fractions",
];

function dateSeed(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function hash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickGuestMission(date: Date = new Date()): MissionDefinition | undefined {
  const seed = dateSeed(date);
  const idx = hash(seed) % GUEST_MISSION_IDS.length;
  return getMission(GUEST_MISSION_IDS[idx]);
}

export function isGuestEmail(email: string): boolean {
  return /^guest-\d+$/.test(email);
}
