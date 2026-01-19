"use client";

/**
 * Reports Page
 * Simple words:
 * - Manager can see Low Stock Alerts + Stock Valuation
 * - Filter by branch
 * - Change threshold for low stock
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

export default function ReportsPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const [branchId, setBranchId] = useState<string>(""); // empty = all branches
  const [threshold, setThreshold] = useState<number>(5);

  const [lowStock, setLowStock] = useState<LowStockRes | null>(null);
  const [valuation, setValuation] = useState<ValuationRes | null>(null);

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

  async function refresh() {
    setLoading(true);
    setOk(null);
    setError(null);
    try {
      await Promise.all([loadLowStock(), loadValuation()]);
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

        <div className="flex items-end md:col-span-2">
          <button
            className="w-full rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            onClick={refresh}
            disabled={loading}
          >
            Apply
          </button>
        </div>
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
                Total Cost Value: <b>Rs {valuation.totals.totalCostValue}</b>
              </div>
              <div>
                Total Selling Value: <b>Rs {valuation.totals.totalSellingValue}</b>
              </div>
              <div>
                Est. Profit If Sold All: <b>Rs {valuation.totals.estimatedProfitIfSoldAll}</b>
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
                          Cost: Rs {it.costValue} • Sell: Rs {it.sellingValue}
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
