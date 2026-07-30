const STATUS_PALETTES = [
  {
    card: "border-[#eadfe3] bg-[#fffafb]",
    accent: "border-l-[#dc7ca4]",
    badge: "border-transparent bg-black/[.035] text-[#8d5069]",
    dot: "bg-[#dc7ca4]",
  },
  {
    card: "border-[#dce7e7] bg-[#f9fcfc]",
    accent: "border-l-[#65b6b7]",
    badge: "border-transparent bg-black/[.035] text-[#397577]",
    dot: "bg-[#65b6b7]",
  },
  {
    card: "border-[#e3dfea] bg-[#fbfafe]",
    accent: "border-l-[#9278c5]",
    badge: "border-transparent bg-black/[.035] text-[#65518d]",
    dot: "bg-[#9278c5]",
  },
  {
    card: "border-[#e9e0d9] bg-[#fdfbf9]",
    accent: "border-l-[#d99868]",
    badge: "border-transparent bg-black/[.035] text-[#8b5d3a]",
    dot: "bg-[#d99868]",
  },
  {
    card: "border-[#dee4ea] bg-[#fafbfd]",
    accent: "border-l-[#779fc9]",
    badge: "border-transparent bg-black/[.035] text-[#4f7092]",
    dot: "bg-[#779fc9]",
  },
  {
    card: "border-[#e2e0dc] bg-[#fbfbfa]",
    accent: "border-l-[#99938a]",
    badge: "border-transparent bg-black/[.035] text-[#656059]",
    dot: "bg-[#99938a]",
  },
] as const;

const STATUS_INDEX: Record<string, number> = {
  appointment: 0,
  "today's repairs": 0,
  open: 1,
  assessment: 2,
  estimate: 2,
  "assemble for sale": 3,
  "test request": 3,
  wfa: 4,
  wfp: 4,
  waiting: 5,
  bff: 5,
  unknown: 5,
};

export function getStatusPalette(status: string) {
  const normalized = status.trim().toLowerCase();
  const mappedIndex = STATUS_INDEX[normalized];

  if (mappedIndex !== undefined) {
    return STATUS_PALETTES[mappedIndex];
  }

  let hash = 0;
  for (const character of normalized) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return STATUS_PALETTES[hash % STATUS_PALETTES.length];
}
