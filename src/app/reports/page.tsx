"use client";

/**
 * Reports Page
 * Simple words:
 * - Manager can see:
 *   1) Low Stock Alerts
 *   2) Stock Valuation
 *   3) Sales Summary (date range)
 *   4) Top Selling Products (date range)
 * - Filter by branch
 * - Change threshold for low stock
 * - Choose from/to date (YYYY-MM-DD)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "MANAGER" | "EMPLOYEE";
type Me = { id: string; name: string; email: string; role: Role };
type Branch = { id: string; name: string; isActive: boolean };

type LowStockItem = {
  id: string;
  quantity: number;
  updatedAt: string;
  branch: { id: string; name: string };
  product: { id: string; name: string; sku: string; unit: string; costPrice: number; sellingPrice: number };
};

type LowStockRes = {
  threshold: number;
  count: number;
  items: LowStockItem[];
};

type ValuationItem = LowStockItem & {
  costValue: number;
  sellingValue: number;
};

type ValuationRes = {
  count: number;
  totals: {
    totalCostValue: number;
    totalSellingValue: number;
    estimatedProfitIfSoldAll: number;
  };
  items: ValuationItem[];
};

type SalesSummaryRes = {
  range: { from: string; toExclusive: string };
  branchId: string | null;
  invoiceCount: number;
  totalSales: number;
  avgBill: number;
};

type TopSellingRes = {
  range: { from: string; toExclusive: string };
  branchId: string | null;
  count: number;
  items: Array<{
    product: { id: string; name: string; sku: string; unit: string; isActive: boolean };
    qtySold: number;
    revenue: number;
  }>;
};

function money(n: number) {
  return `Rs ${Number(n || 0)}`;
}

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ReportsPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const [branchId, setBranchId] = useState<string>(""); // empty = all branches
  const [threshold, setThreshold] = useState<number>(5);

  // Date range for sales summary + top selling
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputValue(d);
  });
  const [toDate, setToDate] = useState<string>(() => toDateInputValue(new Date()));

  const [lowStock, setLowStock] = useState<LowStockRes | null>(null);
  const [valuation, setValuation] = useState<ValuationRes | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummaryRes | null>(null);
  const [topSelling, setTopSelling] = useState<TopSellingRes | null>(null);

  const [topTake, setTopTake] = useState<number>(20);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isManager = me?.role === "MANAGER";

  async function loadBase() {
    const meRes = await api<{ user: Me }>("/auth/me");
    setMe(meRes.user);

    const bRes = await api<{ branches: Branch[] }>("/branches");
    setBranches(bRes.branches);
  }

  async function loadLowStock() {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    q.set("threshold", String(threshold));
    q.set("take", "200");

    const res = await api<LowStockRes>(`/reports/low-stock?${q.toString()}`);
    setLowStock(res);
  }

  async function loadValuation() {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    q.set("take", "500");

    const res = await api<ValuationRes>(`/reports/stock-valuation?${q.toString()}`);
    setValuation(res);
  }

  async function loadSalesSummary() {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (fromDate) q.set("from", fromDate);
    if (toDate) q.set("to", toDate);

    const res = await api<SalesSummaryRes>(`/reports/sales-summary?${q.toString()}`);
    setSalesSummary(res);
  }

  async function loadTopSelling() {
    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (fromDate) q.set("from", fromDate);
    if (toDate) q.set("to", toDate);
    q.set("take", String(topTake));

    const res = await api<TopSellingRes>(`/reports/top-selling?${q.toString()}`);
    setTopSelling(res);
  }

  async function refresh() {
    setLoading(true);
    setOk(null);
    setError(null);
    try {
      await Promise.all([loadLowStock(), loadValuation(), loadSalesSummary(), loadTopSelling()]);
      setOk("Loaded ✅");
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
      .then(() => refresh())
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  if (!isManager) {
    return (
      <main className="space-y-4">
        <div className="rounded bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Reports</h2>
          <p className="mt-2 text-sm text-gray-700">Only MANAGER can view reports.</p>
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
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={refresh} disabled={loading}>
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
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
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
          <label className="text-sm font-medium">Low Stock Threshold</label>
          <input
            type="number"
            min={0}
            className="w-full rounded border px-3 py-2"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            placeholder="e.g. 5"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">From</label>
          <input type="date" className="w-full rounded border px-3 py-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">To</label>
          <input type="date" className="w-full rounded border px-3 py-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Top Products</label>
          <select className="w-full rounded border px-3 py-2" value={topTake} onChange={(e) => setTopTake(Number(e.target.value))}>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
          </select>
        </div>

        <div className="flex items-end md:col-span-6">
          <button
            type="button"
            className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            onClick={refresh}
            disabled={loading}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Sales Summary */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Sales Summary</h3>

        {!salesSummary ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : (
          <div className="grid gap-2 rounded border p-3 text-sm md:grid-cols-3">
            <div>
              Total Sales: <b>{money(salesSummary.totalSales)}</b>
            </div>
            <div>
              Invoice Count: <b>{salesSummary.invoiceCount}</b>
            </div>
            <div>
              Avg Bill: <b>{money(salesSummary.avgBill)}</b>
            </div>
            <div className="md:col-span-3 text-xs text-gray-500">
              Range: {fromDate} to {toDate} {branchId ? "• Branch filtered" : "• All branches"}
            </div>
          </div>
        )}
      </div>

      {/* Top Selling Products */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Top Selling Products</h3>

        {!topSelling ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : topSelling.items.length === 0 ? (
          <p className="text-sm text-gray-600">No sales in selected range.</p>
        ) : (
          <div className="space-y-2">
            {topSelling.items.map((it) => (
              <div key={it.product.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b>{it.product.name}</b>
                    <div className="text-gray-600">SKU: {it.product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div>
                      Qty Sold: <b>{it.qtySold}</b> {it.product.unit}
                    </div>
                    <div className="text-gray-600">Revenue: {money(it.revenue)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Low Stock Alerts</h3>

        {!lowStock ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : lowStock.items.length === 0 ? (
          <p className="text-sm text-gray-600">No low stock items (threshold: {lowStock.threshold}).</p>
        ) : (
          <div className="space-y-2">
            {lowStock.items.map((it) => (
              <div key={it.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b>{it.product.name}</b>
                    <div className="text-gray-600">SKU: {it.product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div>
                      Qty: <b>{it.quantity}</b> {it.product.unit}
                    </div>
                    <div className="text-gray-600">{it.branch.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Valuation */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-2 font-semibold">Stock Valuation</h3>

        {!valuation ? (
          <p className="text-sm text-gray-600">No data</p>
        ) : (
          <>
            <div className="mb-3 grid gap-2 rounded border p-3 text-sm md:grid-cols-3">
              <div>
                Total Cost Value: <b>{money(valuation.totals.totalCostValue)}</b>
              </div>
              <div>
                Total Selling Value: <b>{money(valuation.totals.totalSellingValue)}</b>
              </div>
              <div>
                Est. Profit If Sold All: <b>{money(valuation.totals.estimatedProfitIfSoldAll)}</b>
              </div>
            </div>

            {valuation.items.length === 0 ? (
              <p className="text-sm text-gray-600">No stock items to value.</p>
            ) : (
              <div className="space-y-2">
                {valuation.items.slice(0, 50).map((it) => (
                  <div key={it.id} className="rounded border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <b>{it.product.name}</b>
                        <div className="text-gray-600">SKU: {it.product.sku}</div>
                      </div>
                      <div className="text-right">
                        <div>
                          Qty: <b>{it.quantity}</b> {it.product.unit}
                        </div>
                        <div className="text-gray-600">
                          Cost: {money(it.costValue)} • Sell: {money(it.sellingValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {valuation.items.length > 50 ? (
                  <p className="text-xs text-gray-500">Showing first 50 items. (Backend returns up to 500)</p>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
