"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };
type Branch = { id: string; name: string; isActive: boolean };

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  unit: string;
  sellingPrice: number;
  isActive: boolean;
};

type CartLine = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  qty: number;
};

function money(n: number) {
  return `Rs ${Number(n || 0)}`;
}

export default function SalesPage() {
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = products.filter((p) => p.isActive);
    if (!q) return list.slice(0, 50);

    return list
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode ? p.barcode.toLowerCase().includes(q) : false)
        );
      })
      .slice(0, 50);
  }, [products, search]);

  const total = useMemo(() => cart.reduce((sum, l) => sum + l.price * l.qty, 0), [cart]);

  async function loadBase() {
    setError(null);

    const meRes = await api<{ user: User }>("/auth/me");
    setMe(meRes.user);

    const bRes = await api<{ branches: Branch[] }>("/branches");
    setBranches(bRes.branches);

    // Load products once (we filter on the client for speed)
    const pRes = await api<{ products: any[] }>("/products");
    setProducts(
      pRes.products.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        unit: p.unit,
        sellingPrice: p.sellingPrice,
        isActive: p.isActive,
      }))
    );

    if (!branchId && bRes.branches.length > 0) {
      setBranchId(bRes.branches[0].id);
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
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addToCart(p: Product) {
    setOk(null);
    setError(null);

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          unit: p.unit,
          price: p.sellingPrice,
          qty: 1,
        },
      ];
    });
  }

  function setQty(productId: string, qty: number) {
    if (Number.isNaN(qty)) return;
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, Math.floor(qty)) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function checkout() {
    if (!branchId) {
      setError("Please select a branch");
      return;
    }
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      // call /inventory/sale for each cart item
      for (const line of cart) {
        await api("/inventory/sale", {
          method: "POST",
          body: JSON.stringify({
            branchId,
            productId: line.productId,
            quantity: Number(line.qty),
            note: note.trim() ? note.trim() : "Sale",
          }),
        });
      }

      setCart([]);
      setNote("");
      setOk("Sale completed successfully ✅");
    } catch (e: any) {
      setError(e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Sales</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/inventory">
            Inventory
          </Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/products">
            Products
          </Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      {/* Top controls */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Branch</label>
          <select className="w-full rounded border px-3 py-2" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search Product (name / SKU / barcode)</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="type to search..."
          />
          <p className="text-xs text-gray-500">Tip: click a product to add it to the cart.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Product picker */}
        <div className="rounded bg-white p-6 shadow">
          <h3 className="mb-3 font-semibold">Products</h3>

          {filteredProducts.length === 0 ? (
            <p className="text-sm text-gray-600">No products found.</p>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  className="w-full rounded border p-3 text-left text-sm hover:bg-gray-50"
                  onClick={() => addToCart(p)}
                >
                  <div className="flex items-center justify-between">
                    <b>{p.name}</b>
                    <span className="text-gray-700">{money(p.sellingPrice)}</span>
                  </div>
                  <div className="text-gray-700">SKU: {p.sku}</div>
                  <div className="text-gray-600">Unit: {p.unit}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="rounded bg-white p-6 shadow">
          <h3 className="mb-3 font-semibold">Cart</h3>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-600">Cart is empty. Add products from the left.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((l) => (
                <div key={l.productId} className="rounded border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <b>{l.name}</b>
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => removeLine(l.productId)}>
                      Remove
                    </button>
                  </div>

                  <div className="text-gray-700">SKU: {l.sku}</div>
                  <div className="text-gray-700">
                    Price: {money(l.price)} / {l.unit}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-sm font-medium">Qty</label>
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded border px-3 py-1"
                      value={l.qty}
                      onChange={(e) => setQty(l.productId, Number(e.target.value))}
                    />
                    <div className="ml-auto text-gray-800">
                      Line total: <b>{money(l.price * l.qty)}</b>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Total</span>
                  <b className="text-lg">{money(total)}</b>
                </div>

                <div className="mt-3 space-y-1">
                  <label className="text-sm font-medium">Note (optional)</label>
                  <input
                    className="w-full rounded border px-3 py-2"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Invoice #1001 / Customer name"
                  />
                </div>

                <button
                  disabled={loading || cart.length === 0 || !branchId}
                  className="mt-3 w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
                  onClick={checkout}
                >
                  {loading ? "Processing..." : "Checkout"}
                </button>

                <p className="mt-2 text-xs text-gray-500">
                  Checkout will reduce stock and create SALE transactions in history.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
