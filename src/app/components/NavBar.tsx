"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!getToken());
  }, [pathname]);

  const links = useMemo(
    () => [
      { href: "/", label: "Home" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/sales", label: "Billing" }, // ✅ user-friendly name
      { href: "/products", label: "Products" },
      { href: "/categories", label: "Categories" },
      { href: "/inventory", label: "Inventory" },
      { href: "/branches", label: "Branches" },
    ],
    []
  );

  function onLogout() {
    clearToken();
    setHasToken(false);
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
