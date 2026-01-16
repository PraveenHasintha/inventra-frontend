"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };
type Branch = { id: string; name: string; isActive: boolean };
type Product = { id: string; name: string; sku: string; isActive: boolean };

type StockItem = {
  id: string;
  quantity: number;
  branch: { id: string; name: string };
  product: { id: string; name: string; sku: string; sellingPrice: number; unit: string };
};

export default function InventoryPage() {
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<StockItem[]>([]);

  // Manager actions
  const [productId, setProductId] = useState("");
  const [receiveQty, setReceiveQty] = useState<number>(1);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [note, setNote] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeBranches = useMemo(
    () => branches.filter((b) => b.isActive),
    [branches]
  );

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive),
    [products]
  );

  async function loadBase() {
    setError(null);

    const meRes = await api<{ user: User }>("/auth/me");
    setMe(meRes.user);

    const bRes = await api<{ branches: Branch[] }>("/branches");
    setBranches(bRes.branches);

    const pRes = await api<{ products: any[] }>("/products");
    setProducts(
      pRes.products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, isActive: p.isActive }))
    );

    // auto select first branch
    if (!branchId && bRes.branches.length > 0) {
      setBranchId(bRes.branches[0].id);
    }
  }

  async function loadInventory(selectedBranchId?: string) {
    const bId = selectedBranchId || branchId;
    if (!bId) return;

    const q = new URLSearchParams();
    q.set("branchId", bId);
    if (search.trim()) q.set("search", search.trim());

    const inv = await api<{ items: StockItem[] }>(`/inventory?${q.toString()}`);
    setItems(inv.items);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    loadBase()
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when branchId changes, reload inventory
  useEffect(() => {
    if (!branchId) return;
    loadInventory(branchId).catch((e: any) => setError(e.message || "Failed to load inventory"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  async function onReceive(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !productId) return;

    setLoading(true);
    setError(null);
    try {
      await api("/inventory/receive", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          productId,
          quantity: Number(receiveQty),
          note: note || undefined,
        }),
      });

      setReceiveQty(1);
      setNote("");
      await loadInventory(branchId);
    } catch (e: any) {
      setError(e.message || "Receive failed");
    } finally {
      setLoading(false);
    }
  }

  async function onAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !productId) return;

    setLoading(true);
    setError(null);
    try {
      await api("/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          branchId,
          productId,
          newQuantity: Number(adjustQty),
          note: note || "Manual adjustment",
        }),
      });

      setNote("");
      await loadInventory(branchId);
    } catch (e: any) {
      setError(e.message || "Adjust failed");
    } finally {
      setLoading(false);
    }
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/products">Products</Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">Dashboard</Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Controls */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Branch</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search (name / SKU / barcode)</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="type and press Apply"
          />
        </div>

        <div className="md:col-span-3">
          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => loadInventory(branchId).catch((e: any) => setError(e.message || "Failed"))}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Manager actions */}
      {me.role === "MANAGER" && (
        <div className="grid gap-4 md:grid-cols-2">
          <form onSubmit={onReceive} className="space-y-3 rounded bg-white p-6 shadow">
            <h3 className="font-semibold">Receive Stock</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium">Product</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Select product</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Quantity (+)</label>
              <input
                type="number"
                min={1}
                className="w-full rounded border px-3 py-2"
                value={receiveQty}
                onChange={(e) => setReceiveQty(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Note (optional)</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Supplier delivery"
              />
            </div>

            <button
              disabled={loading || !branchId || !productId}
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : "Receive"}
            </button>
          </form>

          <form onSubmit={onAdjust} className="space-y-3 rounded bg-white p-6 shadow">
            <h3 className="font-semibold">Adjust Stock (Set exact qty)</h3>

            <div className="space-y-1">
              <label className="text-sm font-medium">Product</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">Select product</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">New Quantity</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border px-3 py-2"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Note (optional)</label>
              <input
                className="w-full rounded border px-3 py-2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Stock count correction"
              />
            </div>

            <button
              disabled={loading || !branchId || !productId}
              className="rounded border px-4 py-2 text-sm disabled:opacity-60"
            >
              {loading ? "Saving..." : "Adjust"}
            </button>
          </form>
        </div>
      )}

      {/* Stock list */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">Current Stock</h3>

        {items.length === 0 ? (
          <p className="text-sm text-gray-600">No stock records yet for this branch.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <b>{it.product.name}</b>
                  <span className="text-gray-700">
                    Qty: <b>{it.quantity}</b> {it.product.unit}
                  </span>
                </div>
                <div className="text-gray-700">SKU: {it.product.sku}</div>
                <div className="text-gray-600">Price: Rs {it.product.sellingPrice}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
