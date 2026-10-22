/** Cached / mock composed outfit URLs for Today Look (Mode B preview). */
export const TODAY_LOOK_COMPOSE = {
  a: "/looks/mockups/today-look-compose-a.jpg",
  b: "/looks/mockups/today-look-compose-b.jpg",
  /** Default hero for home until live compose API ships */
  primary: "/looks/mockups/today-look-compose-a.jpg",
} as const;

export function composeCacheKey(slots: Record<string, string | undefined>): string {
  return Object.keys(slots)
    .sort()
    .map((k) => `${k}:${slots[k] ?? ""}`)
    .join("|");
}
