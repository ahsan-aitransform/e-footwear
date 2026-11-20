"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { get } from "@/lib/api";
import { Loading, Alert } from "@/components/ui/core";

export type Store = { id: number; code: string; name: string; isHeadOffice: boolean };

/** The "who am I" payload of GET /auth/me. The company owner holds every permission; everyone else holds exactly the codes listed. */
export type Me = {
  userId: number;
  userName: string;
  fullName: string;
  role: string;
  isOwner: boolean;
  mustChangePassword: boolean;
  permissions: string[];
  company: { id: number; name: string; currency: string; roundingMode: "FLOOR" | "NEAREST"; timezone: string };
  stores: Store[];
  currentStore: Store;
};

type Ctx = { me: Me; can: (perm: string) => boolean; reload: () => Promise<void>; sellingStores: Store[] };
const SessionCtx = createContext<Ctx | null>(null);

export function useMe(): Ctx {
  const c = useContext(SessionCtx);
  if (!c) throw new Error("useMe must be used inside <SessionProvider>");
  return c;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const load = useCallback(async () => setTick((t) => t + 1), []);

  useEffect(() => {
    let alive = true;
    get<Me>("/auth/me")
      .then((m) => { if (alive) setMe(m); })
      .catch((e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [tick]);

  const value = useMemo<Ctx | null>(() => {
    if (!me) return null;
    const set = new Set(me.permissions);
    return { me, can: (p: string) => me.isOwner || set.has(p), reload: load, sellingStores: me.stores.filter((s) => !s.isHeadOffice) };
  }, [me, load]);

  if (error) return <div className="mx-auto mt-24 max-w-md px-4"><Alert>{error}</Alert></div>;
  if (!value) return <Loading label="Starting…" />;
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

/** Wrap a screen that needs a permission; shows a clear message instead of an empty page when it is missing. */
export function RequirePerm({ perm, any, children }: { perm?: string; any?: string[]; children: ReactNode }) {
  const { can } = useMe();
  const ok = perm ? can(perm) : any ? any.some(can) : true;
  if (ok) return <>{children}</>;
  return <div className="mx-auto mt-16 max-w-md"><Alert tone="amber">You do not have permission to open this screen. Ask your administrator to grant access.</Alert></div>;
}
