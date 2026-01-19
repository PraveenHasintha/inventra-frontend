"use client";

/**
 * Invoices List Page (/invoices)
 * Simple words:
 * - Shows past invoices list
 * - Filter by branch (or all branches)
 * - Search by invoice number (INV-000001)
 * - Extra: Clear, Refresh, Enter-to-apply, choose 50/100/200
 * - Click invoice -> opens details page for print
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

function money(n: number) {
  return `Rs ${Number(n || 0)}`;
}

export default function InvoicesPage() {
  const router = useRouter();

  const [me, setMe] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // empty = all branches
  const [branchId, setBranchId] = useState<string>("");

  // draft input + applied search (so typing doesn't spam API)
  const [searchDraft, setSearchDraft] = useState<string>("");
  const [searchApplied, setSearchApplied] = useState<string>("");

  const [take, setTake] = useState<number>(50);

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

  async function loadInvoices(args?: { branchId?: string; search?: string; take?: number }) {
    setError(null);

    const q = new URLSearchParams();

    const bId = args?.branchId ?? branchId;
    const s = (args?.search ?? searchApplied).trim();
    const t = args?.take ?? take;

    if (bId) q.set("branchId", bId);
    if (s) q.set("search", s);
    q.set("take", String(t));

    const res = await api<{ invoices: InvoiceRow[] }>(`/invoices?${q.toString()}`);
    setInvoices(res.invoices);
  }

  async function runLoad(fn: () => Promise<void>) {
    setLoading(true);
    try {
      await fn();
    } catch (e: any) {
      setError(e.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }

  function onApply() {
    const s = searchDraft.trim();
    setSearchApplied(s);
    runLoad(() => loadInvoices({ search: s })).catch(() => {});
  }

  function onClear() {
    setSearchDraft("");
    setSearchApplied("");
    runLoad(() => loadInvoices({ search: "" })).catch(() => {});
  }

  function onRefresh() {
    runLoad(() => loadInvoices()).catch(() => {});
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

  // Auto reload when branch changes
  useEffect(() => {
    // only auto reload after initial load (me must exist)
    if (!me) return;
    runLoad(() => loadInvoices({ branchId })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

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
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Branch</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
          >
            <option value="">All branches</option>
            {activeBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">Change branch to auto reload invoices.</p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search Invoice Number</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="e.g. INV-000001"
            onKeyDown={(e) => {
              if (e.key === "Enter") onApply();
            }}
          />
          <p className="text-xs text-gray-500">Press Enter or click Apply.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Show</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={take}
            onChange={(e) => {
              const n = Number(e.target.value);
              setTake(n);
              runLoad(() => loadInvoices({ take: n })).catch(() => {});
            }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
          <p className="text-xs text-gray-500">How many invoices to load.</p>
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-4">
          <button className="rounded border px-4 py-2 text-sm" onClick={onApply} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>

          <button
            className="rounded border px-4 py-2 text-sm"
            onClick={onClear}
            disabled={loading || (!searchDraft && !searchApplied)}
          >
            Clear
          </button>

          <button className="rounded border px-4 py-2 text-sm" onClick={onRefresh} disabled={loading}>
            Refresh
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
                      Total: <b>{money(inv.total)}</b>
                    </div>
                    <div className="text-gray-600">
                      {inv.branch.name} • {inv.createdBy.name}
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <Link className="rounded border px-3 py-1 text-sm" href={`/invoices/details?publicId=${encodeURIComponent(inv.publicId)}`}>
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
