"use client";

/**
 * Invoices List Page (/invoices)
 * Simple words:
 * - Shows past invoices list
 * - Search by invoice number
 * - Filter by branch
 * - Click one invoice -> open details page
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };
type Branch = { id: string; name: string; isActive: boolean };

type InvoiceRow = {
  publicId: string;
  invoiceNo: string | null;
  total: number;
  createdAt: string;
  branch: { id: string; name: string };
  createdBy: { id: string; name: string; role: "MANAGER" | "EMPLOYEE" };
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function InvoicesPage() {
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>(""); // empty = all branches
  const [search, setSearch] = useState<string>("");

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  async function loadBase() {
    const meRes = await api<{ user: User }>("/auth/me");
    setMe(meRes.user);

    const bRes = await api<{ branches: Branch[] }>("/branches");
    setBranches(bRes.branches);
  }

  async function loadInvoices() {
    setError(null);

    const q = new URLSearchParams();
    if (branchId) q.set("branchId", branchId);
    if (search.trim()) q.set("search", search.trim());
    q.set("take", "50");

    const res = await api<{ invoices: InvoiceRow[] }>(`/invoices?${q.toString()}`);
    setInvoices(res.invoices);
  }

  async function onApply() {
    setLoading(true);
    try {
      await loadInvoices();
    } catch (e: any) {
      setError(e.message || "Failed to load invoices");
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
    Promise.all([loadBase(), loadInvoices()])
      .catch((e: any) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/sales">
            Billing
          </Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3">
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

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search Invoice Number</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. INV-000001"
          />
        </div>

        <div className="md:col-span-3">
          <button className="rounded border px-4 py-2 text-sm" onClick={onApply} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">Latest Invoices</h3>

        {invoices.length === 0 ? (
          <p className="text-sm text-gray-600">No invoices found.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.publicId} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b>{inv.invoiceNo || "INV-PENDING"}</b>
                    <div className="text-gray-600">{formatDateTime(inv.createdAt)}</div>
                  </div>

                  <div className="text-right">
                    <div>
                      Total: <b>Rs {inv.total}</b>
                    </div>
                    <div className="text-gray-600">
                      {inv.branch.name} • {inv.createdBy.name}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <Link
                    className="rounded border px-3 py-1 text-sm"
                    href={`/invoices/details?publicId=${encodeURIComponent(inv.publicId)}`}
                  >
                    Open & Print
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
