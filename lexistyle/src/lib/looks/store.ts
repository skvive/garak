import { cookies } from "next/headers";
import { seedLook } from "./dressable";
import type { AvatarState, SavedLook } from "./types";
import { FIT_DISCLAIMER } from "./types";

export const LOOK_COOKIE = "lexi_look_json";
export const AVATAR_COOKIE = "lexi_avatar_json";

export async function readLook(): Promise<SavedLook> {
  const jar = await cookies();
  const raw = jar.get(LOOK_COOKIE)?.value;
  if (!raw) return seedLook();
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as SavedLook;
    if (!parsed?.slots || typeof parsed.slots !== "object") return seedLook();
    return {
      id: parsed.id || "today",
      title: parsed.title || "오늘의 룩",
      occasion: parsed.occasion || "비즈니스 캐주얼",
      slots: parsed.slots,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return seedLook();
  }
}

export async function writeLook(look: SavedLook): Promise<SavedLook> {
  const next: SavedLook = { ...look, updatedAt: new Date().toISOString() };
  const jar = await cookies();
  jar.set(LOOK_COOKIE, encodeURIComponent(JSON.stringify(next)), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return next;
}

export function emptyAvatar(): AvatarState {
  return {
    status: "none",
    imageUrl: null,
    consentAt: null,
    disclaimer: FIT_DISCLAIMER,
  };
}

export async function readAvatar(): Promise<AvatarState> {
  const jar = await cookies();
  const raw = jar.get(AVATAR_COOKIE)?.value;
  if (!raw) return emptyAvatar();
  try {
    return { ...emptyAvatar(), ...(JSON.parse(decodeURIComponent(raw)) as AvatarState) };
  } catch {
    return emptyAvatar();
  }
}

export async function writeAvatar(state: AvatarState): Promise<AvatarState> {
  const jar = await cookies();
  jar.set(AVATAR_COOKIE, encodeURIComponent(JSON.stringify(state)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return state;
}
