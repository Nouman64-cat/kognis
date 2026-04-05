"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/admin-token";

const PUBLIC_PREFIXES = ["/admin/login", "/admin/set-password"];

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    if (isPublic) {
      setReady(true);
      return;
    }
    const t = getAdminToken();
    if (!t) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [pathname, isPublic, router]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-950">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
