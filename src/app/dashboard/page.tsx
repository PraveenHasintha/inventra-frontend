"use client";

/**
 * Dashboard page:
 * - calls GET /auth/me
 * - shows logged user info
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    api<{ user: any }>("/auth/me")
      .then((data) => setUser(data.user))
      .catch((e) => setErr(e.message));
  }, [router]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <main className="space-y-4 rounded bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <button className="rounded border px-3 py-1 text-sm" onClick={logout}>
          Logout
        </button>
      </div>

      {err && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}

      {!user ? (
        <p className="text-sm text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            <b>Name:</b> {user.name}
          </p>
          <p>
            <b>Email:</b> {user.email}
          </p>
          <p>
            <b>Role:</b> {user.role}
          </p>
        </div>
      )}
    </main>
  );
}
