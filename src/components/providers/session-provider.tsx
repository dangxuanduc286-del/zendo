"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function AppSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}): JSX.Element {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}

