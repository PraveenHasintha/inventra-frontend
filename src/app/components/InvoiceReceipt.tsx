"use client";

/**
 * InvoiceReceipt
 * Simple words: This is the printable receipt UI.
 * We reuse it in Billing and Invoice Reprint so print layout stays the same everywhere.
 */

export type ReceiptInvoice = {
  invoiceNo: string | null;
  createdAt: string;
  total: number;
  note: string | null;

  // address/phone optional so it works even if some responses don't include them
  branch: { name: string; address?: string | null; phone?: string | null };

  createdBy: { name: string; role: "MANAGER" | "EMPLOYEE" };

  items: Array<{
    qty: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string; sku: string; unit: string };
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

export default function InvoiceReceipt({ invoice }: { invoice: ReceiptInvoice }) {
  return (
    <div className="mx-auto w-full max-w-md rounded bg-white p-6 shadow print:max-w-none print:shadow-none">
      {/* Shop info */}
      <div className="text-center">
        <div className="text-lg font-semibold">{invoice.branch.name}</div>
        {invoice.branch.address ? <div className="text-sm text-gray-700">{invoice.branch.address}</div> : null}
        {invoice.branch.phone ? <div className="text-sm text-gray-700">Phone: {invoice.branch.phone}</div> : null}
      </div>

      <hr className="my-4" />

      {/* Invoice meta */}
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

      {/* Note */}
      {invoice.note ? (
        <div className="mt-3 text-sm">
          Note: <span className="text-gray-700">{invoice.note}</span>
        </div>
      ) : null}

      <hr className="my-4" />

      {/* Items */}
      <div className="text-sm">
        <div className="mb-2 font-semibold">Items</div>

        <div className="space-y-2">
          {invoice.items.map((it, idx) => (
            <div key={idx} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{it.product.name}</div>
                <div className="text-xs text-gray-600">
                  {it.product.sku} • {it.qty} {it.product.unit} x {money(it.unitPrice)}
                </div>
              </div>

              <div className="shrink-0 font-semibold">{money(it.lineTotal)}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="my-4" />

      {/* Total */}
      <div className="flex justify-between text-sm">
        <div className="font-semibold">Grand Total</div>
        <div className="text-lg font-semibold">{money(invoice.total)}</div>
      </div>

      <div className="mt-6 text-center text-sm text-gray-700">Thank you! Please come again.</div>
    </div>
  );
}
