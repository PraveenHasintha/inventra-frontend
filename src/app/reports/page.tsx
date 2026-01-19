"use client";

/**
 * Reports Page (/reports)
 * Simple words:
 * - Manager can view sales reports
 * - Shows Daily Sales Summary + Top Products
 * - Filter by date range and branch
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "MANAGER" | "EMPLOYEE";
type Me = { id: string; name: string; email: string; role: Role };
type Branch = { id: string; name: string; isActive: boolean };

type SalesDay = { day: string; invoiceCount: number; totalSales: number };
type SalesSummaryRes = {
  range: { from: string; to: string };
  summary: { invoiceCount: number; totalSales: number };
  days: SalesDay[];
};

type TopProductRow = {
  product: { id: string; name: string; sku: string; unit: string };
  qty: number;
  sales: number;
};
type TopProductsRes = { range: { from: string; to: string }; top: TopProductRow[] };

function todayDateInput() {
  // YYYY-MM-DD in local time
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ReportsPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const [branchId, setBranchId] = useState<string>(""); // empty = all branches
  const [from, setFrom] = useState<string>(() => {
    // default: last 7 days
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [to, setTo] = useState<string>(() => todayDateInput());

  const [summary, setSummary] = useState<SalesSummaryRes | null>(null);
  const [top, setTop] = useState<TopProductsRes | null>(null);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = me?.role === "MANAGER";

  async function loadBase() {
    const meRes = await api<{ user: Me }>("/auth/me");
    setMe(meRes.user);

    const bRes = await api<{ branches: Branch[] }>("/branches");
    setBranches(bRes.branches);
  }

  async function loadReports() {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (branchId) q.set("branchId", branchId);

    const [s, t] = await Promise.all([
      api<SalesSummaryRes>(`/reports/sales-summary?${q.toString()}`),
      api<TopProductsRes>(`/reports/top-products?${q.toString()}`),
    ]);

    setSummary(s);
    setTop(t);
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await loadReports();
      setOk("Reports loaded ✅");
    } catch (e: any) {
      setError(e.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    loadBase()
      .then(() => loadReports())
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  if (!canView) {
    return (
      <main className="space-y-4">
        <div className="rounded bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="mt-2 text-sm text-gray-700">You don’t have permission to view reports.</p>
          <div className="mt-4">
            <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Reports</h2>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 text-sm" onClick={refresh} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      {/* Filters */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Branch</label>
          <select className="w-full rounded border px-3 py-2" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">From</label>
          <input className="w-full rounded border px-3 py-2" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">To</label>
          <input className="w-full rounded border px-3 py-2" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="flex items-end">
          <button className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60" onClick={refresh} disabled={loading}>
            Apply
          </button>
        </div>
      </div>

      {/* Daily summary */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Daily Sales Summary</h3>

        {!summary ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-700">
              Total invoices: <b>{summary.summary.invoiceCount}</b> • Total sales: <b>Rs {summary.summary.totalSales}</b>
            </div>

            {summary.days.length === 0 ? (
              <p className="text-sm text-gray-600">No invoices in this range.</p>
            ) : (
              <div className="space-y-2">
                {summary.days.map((d) => (
                  <div key={d.day} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <b>{d.day}</b>
                      <div className="text-right">
                        <div>
                          Sales: <b>Rs {d.totalSales}</b>
                        </div>
                        <div className="text-gray-600">Invoices: {d.invoiceCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Top products */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Top Products</h3>

        {!top ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : top.top.length === 0 ? (
          <p className="text-sm text-gray-600">No sales items in this range.</p>
        ) : (
          <div className="space-y-2">
            {top.top.map((r) => (
              <div key={r.product.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b>{r.product.name}</b>
                    <div className="text-gray-600">SKU: {r.product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div>
                      Sales: <b>Rs {r.sales}</b>
                    </div>
                    <div className="text-gray-600">
                      Qty: {r.qty} {r.product.unit}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
