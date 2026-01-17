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

type Invoice = {
  invoiceNo: string;
  createdAt: string;
  total: number;
  note: string | null;
  branch: { id: string; name: string };
  createdBy: { id: string; name: string; role: "MANAGER" | "EMPLOYEE" };
  items: Array<{
    qty: number;
    unitPrice: number;
    lineTotal: number;
    product: { id: string; name: string; sku: string; unit: string };
  }>;
};

function money(n: number) {
  return `Rs ${Number(n || 0)}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
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

  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

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

    // Load products once (filter on client for speed)
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
    setLastInvoice(null);

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
      const payload = {
        branchId,
        note: note.trim() ? note.trim() : undefined,
        items: cart.map((l) => ({
          productId: l.productId,
          qty: Number(l.qty),
          unitPrice: Number(l.price), // lock price at sale time
        })),
      };

      const res = await api<{ invoice: Invoice }>("/sales/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setLastInvoice(res.invoice);
      setCart([]);
      setNote("");
      setOk(`Saved ✅ Invoice: ${res.invoice.invoiceNo}`);
    } catch (e: any) {
      setError(e.message || "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  function printInvoice() {
    window.print();
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  return (
    <main className="space-y-6">
      {/* Header (hidden in print) */}
      <div className="flex items-center justify-between rounded bg-white p-6 shadow print:hidden">
        <h2 className="text-xl font-semibold">Billing</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/inventory">
            Inventory
          </Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/products">
            Products
          </Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700 print:hidden">{error}</div>}
      {ok && <div className="rounded bg-green-50 p-3 text-sm text-green-700 print:hidden">{ok}</div>}

      {/* Invoice Preview (printable) */}
      {lastInvoice && (
        <div className="rounded bg-white p-6 shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Invoice {lastInvoice.invoiceNo}</h3>
              <div className="text-sm text-gray-700">
                Branch: {lastInvoice.branch.name} • Date: {formatDateTime(lastInvoice.createdAt)}
              </div>
              <div className="text-sm text-gray-700">
                By: {lastInvoice.createdBy.name} ({lastInvoice.createdBy.role})
              </div>
              {lastInvoice.note ? <div className="text-sm text-gray-700">Note: {lastInvoice.note}</div> : null}
            </div>

            <div className="print:hidden">
              <button className="rounded border px-4 py-2 text-sm" onClick={printInvoice}>
                Print Invoice
              </button>
            </div>
          </div>

          <div className="mt-4 rounded border">
            <div className="grid grid-cols-12 gap-2 border-b p-3 text-xs font-medium text-gray-600">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-right">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            {lastInvoice.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 border-b p-3 text-sm">
                <div className="col-span-6">
                  <div className="font-medium">{it.product.name}</div>
                  <div className="text-xs text-gray-600">SKU: {it.product.sku}</div>
                </div>
                <div className="col-span-2 text-right">
                  {it.qty} {it.product.unit}
                </div>
                <div className="col-span-2 text-right">{money(it.unitPrice)}</div>
                <div className="col-span-2 text-right">{money(it.lineTotal)}</div>
              </div>
            ))}

            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-gray-700">Grand Total</span>
              <b className="text-lg">{money(lastInvoice.total)}</b>
            </div>
          </div>
        </div>
      )}

      {/* Controls (hidden in print) */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3 print:hidden">
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
          <p className="text-xs text-gray-500">Tip: click a product to add it to the bill.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 print:hidden">
        {/* Products */}
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
          <h3 className="mb-3 font-semibold">Current Bill</h3>

          {cart.length === 0 ? (
            <p className="text-sm text-gray-600">No items yet. Add products from the left.</p>
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
                    placeholder="e.g. Customer name / special note"
                  />
                </div>

                <button
                  disabled={loading || cart.length === 0 || !branchId}
                  className="mt-3 w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
                  onClick={checkout}
                >
                  {loading ? "Saving..." : "Checkout"}
                </button>

                <p className="mt-2 text-xs text-gray-500">
                  Checkout saves the bill and creates an invoice number like <b>INV-000001</b>.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
