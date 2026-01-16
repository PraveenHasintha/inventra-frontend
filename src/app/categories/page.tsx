"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { id: string; name: string; email: string; role: "MANAGER" | "EMPLOYEE" };
type Category = { id: string; name: string; parentId: string | null; isActive: boolean };

export default function CategoriesPage() {
  const router = useRouter();
  const [me, setMe] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parentOptions = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  );

  async function load() {
    setError(null);
    const meRes = await api<{ user: User }>("/auth/me");
    setMe(meRes.user);

    const cRes = await api<{ categories: Category[] }>("/categories");
    setCategories(cRes.categories);
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

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api("/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          parentId: parentId || undefined,
        }),
      });
      setName("");
      setParentId("");
      await load();
    } catch (e: any) {
      setError(e.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  if (me.role !== "MANAGER") {
    return (
      <main className="space-y-3 rounded bg-white p-6 shadow">
        <p className="text-sm text-red-700">Forbidden: Manager only</p>
        <Link className="underline" href="/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">Categories</h2>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-1 text-sm" href="/products">Products</Link>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">Dashboard</Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={createCategory} className="space-y-3 rounded bg-white p-6 shadow">
        <h3 className="font-semibold">Create Category</h3>

        <div className="space-y-1">
          <label className="text-sm font-medium">Name</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stationery"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Parent Category (optional)</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">No parent (top-level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <button
          disabled={loading || !name.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </form>

      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">All Categories</h3>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="rounded border p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>{c.name}</b>
                <span className={c.isActive ? "text-green-700" : "text-gray-500"}>
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-gray-600">
                Parent: {c.parentId ? c.parentId : "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
