import { useState } from "react";
import { useAuth } from "../auth";
import { Button } from "../ui";
import { LogOut, ShieldAlert } from "lucide-react";
import { HOTELS } from "../types";

export default function Layout({
  children,
  selectedHotel,
  onHotelChange,
  showHotelSelector = true,
}: {
  children: React.ReactNode;
  selectedHotel: string;
  onHotelChange: (h: string) => void;
  showHotelSelector?: boolean;
}) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧼</span>
            <span className="font-semibold text-slate-800">
              Rewaya Hygiene Log
            </span>
          </div>

          <div className="flex items-center gap-3">
            {showHotelSelector && (
              <select
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                value={selectedHotel}
                onChange={(e) => onHotelChange(e.target.value)}
              >
                {(user?.role === "director" ? HOTELS : user?.allowedHotels || []).map(
                  (h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ),
                )}
              </select>
            )}

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
              >
                <span className="text-sm font-medium text-slate-700">
                  {user?.name}
                </span>
                {user?.role === "director" && (
                  <ShieldAlert size={14} className="text-sky-600" />
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
