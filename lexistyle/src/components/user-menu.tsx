// filepath: src/components/user-menu.tsx
"use client";

import { UserButton } from "@neondatabase/auth-ui";

export function UserMenu() {
  return (
    <div className="hidden items-center md:flex">
      <UserButton size="icon" />
    </div>
  );
}
