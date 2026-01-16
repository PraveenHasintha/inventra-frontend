"use client";

/**
 * Branches page (Manager only)
 * - Lists branches
 * - Allows creating a new branch
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

type Branch = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  isActive: boolean;
};

export default function BranchesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("New Branch");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setError(null);
    try {
      const me = await api<{ user: any }>("/auth/me");
      setUser(me.user);

      const b = await api<{ branches: Branch[] }>("/branches");
      setBranches(b.branches);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    }
  }

  useEffect(() => {
    // If not logged in, push to login
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/branches", {
        method: "POST",
        body: JSON.stringify({ name, address: address || undefined, phone: phone || undefined }),
      });
      setName("New Branch");
      setAddress("");
      setPhone("");
      await load();
    } catch (e: any) {
      setError(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <main className="rounded bg-white p-6 shadow">Loading...</main>;
  }

  if (user.role !== "MANAGER") {
    return (
      <main className="space-y-3 rounded bg-white p-6 shadow">
        <p className="text-sm text-red-700">Forbidden: Manager only</p>
        <Link className="underline" href="/dashboard">Go back</Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Branches</h2>
        <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
          Back
        </Link>
      </div>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={createBranch} className="space-y-3 rounded bg-white p-6 shadow">
        <h3 className="font-semibold">Create Branch</h3>

        <div className="space-y-1">
          <label className="text-sm font-medium">Branch Name</label>
          <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Address (optional)</label>
          <input className="w-full rounded border px-3 py-2" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Phone (optional)</label>
          <input className="w-full rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <button
          disabled={loading}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">All Branches</h3>
        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>{b.name}</b>
                <span className={b.isActive ? "text-green-700" : "text-gray-500"}>
                  {b.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-gray-600">{b.address || "—"}</div>
              <div className="text-gray-600">{b.phone || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
