// filepath: src/components/auth-provider.tsx
"use client";

import Link from "next/link";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { authClient } from "@/lib/auth/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      social={{ providers: ["google"] }}
      redirectTo="/account"
      Link={Link}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
