"use client";

/**
 * Simple top navigation bar.
 * - Shows links to all main pages
 * - Shows Login if not logged in
 * - Shows Logout if logged in
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "rounded px-3 py-2 text-sm",
        active ? "bg-black text-white" : "border bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function NavBar() {
  const router = useRouter();
  const token = getToken();
  const loggedIn = Boolean(token);

  function logout() {
    clearToken();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <NavLink href="/" label="Home" />
        <NavLink href="/dashboard" label="Dashboard" />
        <NavLink href="/products" label="Products" />
        <NavLink href="/categories" label="Categories" />
        <NavLink href="/inventory" label="Inventory" />
        <NavLink href="/branches" label="Branches" />
      </div>

      <div className="flex items-center gap-2">
        {!loggedIn ? (
          <Link
            href="/login"
            className="rounded bg-black px-3 py-2 text-sm text-white hover:opacity-90"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={logout}
            className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
}
