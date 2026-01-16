/**
 * Main layout shared by all pages.
 */
import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./components/NavBar";

export const metadata: Metadata = {
  title: "Inventra",
  description: "Inventra POS + Inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-4xl p-4">
          <header className="mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Inventra</h1>
            </div>

            <NavBar />
          </header>

          {children}
        </div>
      </body>
    </html>
  );
}
