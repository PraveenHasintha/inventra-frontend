"use client";

/**
 * Invoice Details Page
 * Simple words:
 * - Opens a single invoice fully (items included)
 * - Uses InvoiceReceipt component for consistent printing
 * - Print button triggers browser print
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import InvoiceReceipt, { ReceiptInvoice } from "@/app/components/InvoiceReceipt";

type InvoiceDetail = ReceiptInvoice & {
  publicId: string;
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
      {invoice && <InvoiceReceipt invoice={invoice} />}
    </main>
  );
}
