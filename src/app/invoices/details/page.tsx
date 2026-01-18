"use client";

/**
 * Invoice Details Page (/invoices/details?publicId=...)
 * Simple words:
 * - Opens a single invoice with items
 * - Has a Print button for reprint
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type InvoiceDetail = {
  publicId: string;
  invoiceNo: string | null;
  note: string | null;
  total: number;
  createdAt: string;
  branch: { id: string; name: string; address: string | null; phone: string | null };
  createdBy: { id: string; name: string; role: "MANAGER" | "EMPLOYEE" };
  items: Array<{
    id: number;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    product: { id: string; name: string; sku: string; unit: string };
  }>;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const publicId = sp.get("publicId") || "";

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadInvoice() {
    if (!publicId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api<{ invoice: InvoiceDetail }>(`/invoices/${publicId}`);
      setInvoice(res.invoice);
    } catch (e: any) {
      setError(e.message || "Failed to load invoice");
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
    loadInvoice().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicId]);

  function onPrint() {
    window.print();
  }

  if (!publicId) {
    return (
      <main className="space-y-4">
        <div className="rounded bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Invoice Details</h2>
          <p className="mt-2 text-sm text-gray-700">No invoice selected (publicId missing).</p>
          <div className="mt-4">
            <Link className="rounded border px-3 py-1 text-sm" href="/invoices">
              Back to Invoices
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* Top actions (hidden in print) */}
      <div className="flex items-center justify-between rounded bg-white p-6 shadow print:hidden">
        <h2 className="text-xl font-semibold">Invoice Details</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/invoices">
            Back
          </Link>
          <button className="rounded bg-black px-4 py-2 text-sm text-white" onClick={onPrint} disabled={!invoice}>
            Print
          </button>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700 print:hidden">{error}</div>}
      {loading && <div className="rounded bg-white p-6 shadow print:hidden">Loading...</div>}

      {/* Receipt area */}
      {invoice && (
        <div className="rounded bg-white p-6 shadow print:shadow-none">
          <div className="text-center">
            <div className="text-lg font-semibold">{invoice.branch.name}</div>
            {invoice.branch.address && <div className="text-sm text-gray-700">{invoice.branch.address}</div>}
            {invoice.branch.phone && <div className="text-sm text-gray-700">Phone: {invoice.branch.phone}</div>}
          </div>

          <hr className="my-4" />

          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <div>
              <div>
                Invoice: <b>{invoice.invoiceNo || "INV-PENDING"}</b>
              </div>
              <div>Date: {formatDateTime(invoice.createdAt)}</div>
            </div>
            <div className="text-right">
              <div>
                Cashier: <b>{invoice.createdBy.name}</b>
              </div>
              <div className="text-gray-700">{invoice.createdBy.role}</div>
            </div>
          </div>

          {invoice.note && (
            <div className="mt-3 text-sm">
              Note: <span className="text-gray-700">{invoice.note}</span>
            </div>
          )}

          <hr className="my-4" />

          <div className="text-sm">
            <div className="mb-2 font-semibold">Items</div>

            <div className="space-y-2">
              {invoice.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{it.product.name}</div>
                    <div className="text-xs text-gray-600">
                      {it.product.sku} • {it.qty} {it.product.unit} x Rs {it.unitPrice}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">Rs {it.lineTotal}</div>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-4" />

          <div className="flex justify-between text-sm">
            <div className="font-semibold">Total</div>
            <div className="text-lg font-semibold">Rs {invoice.total}</div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-700">
            Thank you! Please come again.
          </div>
        </div>
      )}
    </main>
  );
}
