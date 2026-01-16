"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };
type Category = { id: string; name: string; parentId: string | null; isActive: boolean };

type Product = {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  barcode?: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
  categoryId?: string | null;
  category?: { id: string; name: string; parentId: string | null } | null;
};

export default function ProductsPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [categoryId, setCategoryId] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  async function load() {
    setError(null);

    const meRes = await api<{ user: User }>("/auth/me");
    setMe(meRes.user);

    const cRes = await api<{ categories: Category[] }>("/categories");
    setCategories(cRes.categories);

    const q = new URLSearchParams();
    if (search.trim()) q.set("search", search.trim());
    if (filterCategoryId) q.set("categoryId", filterCategoryId);

    const pRes = await api<{ products: Product[] }>(`/products?${q.toString()}`);
    setProducts(pRes.products);
  }

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    load().catch((e: any) => setError(e.message || "Failed to load"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api("/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          sku,
          barcode: barcode || undefined,
          unit: unit || "PCS",
          costPrice: Number(costPrice),
          sellingPrice: Number(sellingPrice),
          categoryId: categoryId || undefined,
        }),
      });

      setName("");
      setSku("");
      setBarcode("");
      setUnit("PCS");
      setCostPrice(0);
      setSellingPrice(0);
      setCategoryId("");

      await load();
    } catch (e: any) {
      setError(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function deactivateProduct(id: string) {
    if (!confirm("Deactivate this product?")) return;
    setError(null);
    try {
      await api(`/products/${id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setError(e.message || "Deactivate failed");
    }
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/categories">Categories</Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">Dashboard</Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Search + filter */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search (name / SKU / barcode)</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. pen / SKU001 / 123456"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Filter Category</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">All</option>
            {activeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-3">
          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={() => load().catch((e: any) => setError(e.message || "Failed"))}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Create product (Manager only) */}
      {me.role === "MANAGER" && (
        <form onSubmit={createProduct} className="space-y-3 rounded bg-white p-6 shadow">
          <h3 className="font-semibold">Create Product</h3>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">SKU (unique)</label>
              <input className="w-full rounded border px-3 py-2" value={sku} onChange={(e) => setSku(e.target.value)} required />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Barcode (optional, unique)</label>
              <input className="w-full rounded border px-3 py-2" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Unit</label>
              <input className="w-full rounded border px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Cost Price (Rs)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border px-3 py-2"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Selling Price (Rs)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded border px-3 py-2"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <select
                className="w-full rounded border px-3 py-2"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            disabled={loading || !name.trim() || !sku.trim()}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </form>
      )}

      {/* List products */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">All Products</h3>

        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>{p.name}</b>
                <span className={p.isActive ? "text-green-700" : "text-gray-500"}>
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="text-gray-700">SKU: {p.sku}</div>
              <div className="text-gray-700">Barcode: {p.barcode || "—"}</div>
              <div className="text-gray-700">Unit: {p.unit}</div>
              <div className="text-gray-700">Cost: Rs {p.costPrice} | Price: Rs {p.sellingPrice}</div>
              <div className="text-gray-600">
                Category: {p.category?.name || "—"}
              </div>

              {me.role === "MANAGER" && p.isActive && (
                <button
                  className="mt-2 rounded border px-3 py-1 text-xs"
                  onClick={() => deactivateProduct(p.id)}
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
