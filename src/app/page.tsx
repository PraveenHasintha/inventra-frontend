/**
 * Home page with quick links.
 */
import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-4">
      <p className="text-sm text-gray-700">
        Base build is ready. Next we add Products, Stock, Sales (POS), PDFs, Offline mode.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/login">
          Login
        </Link>
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/dashboard">
          Dashboard
        </Link>
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/products">
          Products
        </Link>
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/categories">
          Categories
        </Link>
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/inventory">
          Inventory
        </Link>
        <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/branches">
          Branches
        </Link>
      </div>
    </main>
  );
}
