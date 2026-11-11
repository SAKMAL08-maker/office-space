/** One palette for the whole scene, so the parts look like one building. */
export const colors = {
  sky: "#20242c",
  lobbyFloor: "#d9d4c7",
  officeFloor: "#cdb894",
  carpet: "#9fb4c7",
  ownCarpet: "#a9c49a",
  wall: "#eceae4",
  skirting: "#6b6358",
  wallCap: "#b9b4a8",
  gateShut: "#c0504d",
  gatePost: "#6b7280",
  gateArmStripe: "#f4f4f5",
  glass: "#bfe3f2",
  lampShut: "#ef4444",
  lampOpen: "#22c55e",
  machineBody: "#4a5060",
  machineTrim: "#2f3440",
  slot: "#111318",
  iconInk: "#ffffff",
  pot: "#b8643c",
  potRim: "#9a4f2c",
  soil: "#3b2a1f",
  leaf: "#3f8f4a",
  leafDark: "#2e6e3a",
  keyLight: "#ffe4c2",
  fillLight: "#a9c6ff",
  checkIn: "#3f9b6b",
  checkOut: "#d9822b",
  desk: "#b08a5a",
  panel: "#7d8796",
  monitor: "#2b2f36",
  screen: "#5a6b80",
  chair: "#3d4a5c",
  partition: "#8f9bb0",
  partitionTrim: "#5f6b7d",
  keyboard: "#d4d4d8",
  screenLit: "#7dd3fc",
  working: "#f59e0b",
  trousers: "#374151",
  shoes: "#1f2937",
  eyes: "#1f2937",
  skin: "#f1c9a5",
  marker: "#facc15",
  awayShirt: "#a1a1aa",
  awayHair: "#71717a",
};

/** Shirt and hair colours, picked per person so characters can be told apart. */
const SHIRTS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#eab308",
];
const HAIR = ["#3f2a1d", "#1c1917", "#a16207", "#78350f", "#57534e", "#b45309"];

/** The same person always gets the same colours. */
export function personColors(id: string): { shirt: string; hair: string } {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { shirt: SHIRTS[hash % SHIRTS.length], hair: HAIR[(hash >>> 8) % HAIR.length] };
}

export const WALL_HEIGHT = 1.2;
