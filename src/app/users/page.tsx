"use client";

/**
 * Users Page (/users)
 * Simple words:
 * - Manager can create employees/managers
 * - Manager can activate/deactivate users
 * - Manager can change roles
 * - Manager can reset passwords
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "MANAGER" | "EMPLOYEE";

type Me = { id: string; name: string; email: string; role: Role };

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function UsersPage() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [search, setSearch] = useState("");
  const [take, setTake] = useState<number>(100);

  // create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("EMPLOYEE");

  // reset password per user
  const [resetPwd, setResetPwd] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = useMemo(() => me?.role === "MANAGER", [me?.role]);

  async function loadMe() {
    const meRes = await api<{ user: Me }>("/auth/me");
    setMe(meRes.user);
  }

  async function loadUsers() {
    const q = new URLSearchParams();
    if (search.trim()) q.set("search", search.trim());
    q.set("take", String(take));

    const res = await api<{ users: UserRow[] }>(`/users?${q.toString()}`);
    setUsers(res.users);
  }

  async function refresh() {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await loadMe();
      await loadUsers();
    } catch (e: any) {
      setError(e.message || "Failed to load users");
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
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;

    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await api<{ user: any }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      setName("");
      setEmail("");
      setPassword("");
      setRole("EMPLOYEE");

      await loadUsers();
      setOk("User created successfully ✅");
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(userId: string, patch: Partial<Pick<UserRow, "name" | "role" | "isActive">>) {
    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await api<{ user: UserRow }>(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      await loadUsers();
      setOk("User updated ✅");
    } catch (e: any) {
      setError(e.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  async function doResetPassword(userId: string) {
    const newPassword = (resetPwd[userId] || "").trim();
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    setOk(null);
    try {
      await api<{ message: string }>(`/users/${userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });

      setResetPwd((prev) => ({ ...prev, [userId]: "" }));
      setOk("Password reset ✅");
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (!me) return <main className="rounded bg-white p-6 shadow">Loading...</main>;

  // If employee opens /users, show friendly message
  if (!canManage) {
    return (
      <main className="space-y-4">
        <div className="rounded bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="mt-2 text-sm text-gray-700">You don’t have permission to manage users.</p>
          <div className="mt-4">
            <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between rounded bg-white p-6 shadow">
        <h2 className="text-xl font-semibold">User Management</h2>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 text-sm" onClick={() => refresh()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <Link className="rounded border px-3 py-1 text-sm" href="/dashboard">
            Dashboard
          </Link>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded bg-green-50 p-3 text-sm text-green-700">{ok}</div>}

      {/* Create user */}
      <form onSubmit={onCreate} className="space-y-3 rounded bg-white p-6 shadow">
        <h3 className="font-semibold">Create User</h3>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input className="w-full rounded border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Role</label>
            <select className="w-full rounded border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="MANAGER">MANAGER</option>
            </select>
          </div>
        </div>

        <button disabled={loading} className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60">
          {loading ? "Saving..." : "Create User"}
        </button>
      </form>

      {/* Filters */}
      <div className="grid gap-3 rounded bg-white p-6 shadow md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium">Search (name/email)</label>
          <input className="w-full rounded border px-3 py-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="type and press Apply" />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Show</label>
          <select className="w-full rounded border px-3 py-2" value={take} onChange={(e) => setTake(Number(e.target.value))}>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <button className="rounded border px-4 py-2 text-sm" onClick={() => refresh()} disabled={loading}>
            {loading ? "Loading..." : "Apply"}
          </button>
        </div>
      </div>

      {/* Users list */}
      <div className="rounded bg-white p-6 shadow">
        <h3 className="mb-3 font-semibold">Users</h3>

        {users.length === 0 ? (
          <p className="text-sm text-gray-600">No users found.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b>{u.name}</b>
                    <div className="text-gray-700">{u.email}</div>
                    <div className="text-gray-600">Created: {formatDateTime(u.createdAt)}</div>
                  </div>

                  <div className="text-right">
                    <div>
                      Status:{" "}
                      <b className={u.isActive ? "text-green-700" : "text-red-700"}>
                        {u.isActive ? "ACTIVE" : "INACTIVE"}
                      </b>
                    </div>
                    <div className="text-gray-700">Role: {u.role}</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Change Role</label>
                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                      disabled={loading || u.id === me.id}
                      title={u.id === me.id ? "You cannot change your own role" : ""}
                    >
                      <option value="EMPLOYEE">EMPLOYEE</option>
                      <option value="MANAGER">MANAGER</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Activate / Deactivate</label>
                    <button
                      className="w-full rounded border px-3 py-2 text-sm"
                      onClick={() => updateUser(u.id, { isActive: !u.isActive })}
                      disabled={loading || u.id === me.id}
                      title={u.id === me.id ? "You cannot deactivate your own account" : ""}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Reset Password</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="w-full rounded border px-3 py-2 text-sm"
                        placeholder="new password (min 6)"
                        value={resetPwd[u.id] || ""}
                        onChange={(e) => setResetPwd((prev) => ({ ...prev, [u.id]: e.target.value }))}
                        disabled={loading}
                      />
                      <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={() => doResetPassword(u.id)} disabled={loading}>
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {u.id === me.id ? <div className="mt-2 text-xs text-gray-500">Note: your own account cannot be deactivated or role-changed.</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
