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

      <div className="flex gap-3">
        <Link className="rounded bg-black px-4 py-2 text-white" href="/login">
          Login
        </Link>
        <Link className="rounded border px-4 py-2" href="/dashboard">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
