"use client";

/**
 * NavBar
 * Simple words:
 * - Shows links
 * - If logged in, fetches /auth/me to know role
 * - Shows Reports only for MANAGER
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";
import { api } from "@/lib/api";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

type Me = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [hasToken, setHasToken] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = getToken();
    setHasToken(!!token);

    if (!token) {
      setMe(null);
      return;
    }

    api<{ user: Me }>("/auth/me")
      .then((res) => setMe(res.user))
      .catch(() => setMe(null));
  }, [pathname]);

  const links = useMemo(() => {
    const base = [
      { href: "/", label: "Home" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/sales", label: "Billing" },
      { href: "/invoices", label: "Invoices" },
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
      { href: "/inventory", label: "Inventory" },
      { href: "/branches", label: "Branches" },
    ];

    if (me?.role === "MANAGER") {
      base.splice(4, 0, { href: "/reports", label: "Reports" });
    }

    return base;
  }, [me?.role]);

  function onLogout() {
    clearToken();
    setHasToken(false);
    setMe(null);
    router.push("/login");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav className="flex flex-wrap gap-2">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cx("rounded border px-3 py-1 text-sm", active && "bg-black text-white")}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        {!hasToken ? (
          <Link className="rounded border px-3 py-1 text-sm" href="/login">
            Login
          </Link>
        ) : (
          <button className="rounded border px-3 py-1 text-sm" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
