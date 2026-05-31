export type PackMode = "week-pack" | "extended-pack";

export type PackModeMeta = {
  id: PackMode;
  label: string;
  shortLabel: string;
  postCount: number;
  description: string;
  badge?: string;
};

export const PACK_MODE_META: Record<PackMode, PackModeMeta> = {
  "week-pack": {
    id: "week-pack",
    label: "Week Pack",
    shortLabel: "9 posts",
    postCount: 9,
    description: "Build one focused 3x3 publishing pack.",
  },
  "extended-pack": {
    id: "extended-pack",
    label: "Extended Pack",
    shortLabel: "18 posts",
    postCount: 18,
    description: "Plan Week 1 + Week 2 as a wider feed rhythm.",
    badge: "Pro preview",
  },
};

export const PACK_WEEK_SLOT_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
  "Next 1",
  "Next 2",
] as const;

export type PackSlot = {
  slotIndex: number;
  postNumber: number;
  weekIndex: 1 | 2;
  weekSlotIndex: number;
  dayLabel: string;
  weekLabel: "Week 1" | "Week 2";
};

export function getPackSlotCount(mode: PackMode) {
  return PACK_MODE_META[mode].postCount;
}

export function getWeekIndexForSlot(slotIndex: number, mode: PackMode): 1 | 2 {
  if (mode === "extended-pack" && slotIndex >= 9) return 2;
  return 1;
}

export function getWeekSlotIndex(slotIndex: number) {
  return slotIndex % 9;
}

export function getPostNumber(slotIndex: number) {
  return slotIndex + 1;
}

export function getWeekLabel(weekIndex: 1 | 2): "Week 1" | "Week 2" {
  return weekIndex === 1 ? "Week 1" : "Week 2";
}

export function getDayLabelForSlot(slotIndex: number) {
  return PACK_WEEK_SLOT_LABELS[getWeekSlotIndex(slotIndex)] ?? "Next";
}

export function buildPackSlots(mode: PackMode): PackSlot[] {
  return Array.from({ length: getPackSlotCount(mode) }, (_, slotIndex) => {
    const weekIndex = getWeekIndexForSlot(slotIndex, mode);

    return {
      slotIndex,
      postNumber: getPostNumber(slotIndex),
      weekIndex,
      weekSlotIndex: getWeekSlotIndex(slotIndex),
      dayLabel: getDayLabelForSlot(slotIndex),
      weekLabel: getWeekLabel(weekIndex),
    };
  });
}

export function splitSlotsByWeek<T>(items: T[]): { week1: T[]; week2: T[] } {
  return {
    week1: items.slice(0, 9),
    week2: items.slice(9, 18),
  };
}

export function getRemainingAssetCount(mode: PackMode, selectedCount: number) {
  return Math.max(getPackSlotCount(mode) - selectedCount, 0);
}

export function isPackSelectionComplete(mode: PackMode, selectedCount: number) {
  return selectedCount >= getPackSlotCount(mode);
}
