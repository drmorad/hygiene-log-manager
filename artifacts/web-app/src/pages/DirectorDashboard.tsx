import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "../components/Layout";
import { Button, Card, Field, inputClass } from "../ui";
import { useAuth } from "../auth";
import { api } from "../api";
import { HOTELS } from "../types";
import { Plus, Trash2, Loader2, Users } from "lucide-react";

export default function DirectorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [hotel, setHotel] = useState<string>(HOTELS[0]);
  const [showMgr, setShowMgr] = useState(false);
  const [mgr, setMgr] = useState({
    username: "",
    password: "",
    name: "",
    allowedHotels: [] as string[],
  });

  const analytics = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.analytics(),
  });

  const managers = useQuery({
    queryKey: ["managers"],
    queryFn: () => api.listManagers(),
  });

  const createMgr = useMutation({
    mutationFn: () => api.createManager(mgr),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      setMgr({ username: "", password: "", name: "", allowedHotels: [] });
      setShowMgr(false);
    },
  });

  const deleteMgr = useMutation({
    mutationFn: (id: string) => api.deleteManager(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["managers"] }),
  });

  function toggleHotel(h: string) {
    setMgr((m) => ({
      ...m,
      allowedHotels: m.allowedHotels.includes(h)
        ? m.allowedHotels.filter((x) => x !== h)
        : [...m.allowedHotels, h],
    }));
  }

  const g = analytics.data?.global;

  return (
    <Layout
      selectedHotel={hotel}
      onHotelChange={setHotel}
      showHotelSelector={false}
    >
      <div className="space-y-5">
        <h1 className="text-lg font-semibold text-slate-800">
          Director Overview
        </h1>

        {analytics.isLoading ? (
          <p className="text-slate-400">Loading analytics…</p>
        ) : g ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Logs today" value={g.totalToday} />
            <Stat label="Logs (7d)" value={g.totalWeek} />
            <Stat
              label="Compliance today"
              value={g.complianceToday != null ? `${g.complianceToday}%` : "—"}
            />
            <Stat
              label="Violations today"
              value={g.violationsToday}
              danger={g.violationsToday > 0}
            />
          </div>
        ) : null}

        {analytics.data?.hotels?.length ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {analytics.data.hotels.map((h: any) => (
              <Card key={h.hotel}>
                <h3 className="font-medium text-slate-700">{h.hotel}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Today: {h.totalToday} · Week: {h.totalWeek}
                </p>
                <p className="text-sm text-slate-500">
                  Compliance:{" "}
                  {h.complianceToday != null ? `${h.complianceToday}%` : "—"}
                </p>
                {h.missingCCPs?.length ? (
                  <p className="mt-1 text-xs text-amber-600">
                    Missing today: {h.missingCCPs.join(", ")}
                  </p>
                ) : null}
                {h.violationsWeek > 0 ? (
                  <p className="text-xs text-red-600">
                    {h.violationsWeek} violations this week
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        ) : null}

        {/* Manager management */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              <h2 className="font-semibold text-slate-800">Managers</h2>
            </div>
            <Button variant="ghost" onClick={() => setShowMgr((s) => !s)}>
              <Plus size={16} /> {showMgr ? "Cancel" : "Add manager"}
            </Button>
          </div>

          {showMgr && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMgr.mutate();
              }}
              className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"
            >
              <Field label="Username">
                <input
                  className={inputClass}
                  value={mgr.username}
                  onChange={(e) =>
                    setMgr({ ...mgr, username: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={mgr.name}
                  onChange={(e) => setMgr({ ...mgr, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Temporary password">
                <input
                  className={inputClass}
                  type="text"
                  value={mgr.password}
                  onChange={(e) =>
                    setMgr({ ...mgr, password: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Allowed hotels">
                <div className="flex flex-wrap gap-2 pt-2">
                  {HOTELS.map((h) => (
                    <label
                      key={h}
                      className="flex items-center gap-1 text-sm text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={mgr.allowedHotels.includes(h)}
                        onChange={() => toggleHotel(h)}
                      />
                      {h}
                    </label>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createMgr.isPending}>
                  {createMgr.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Plus size={16} />
                  )}
                  Create manager
                </Button>
                {createMgr.isError && (
                  <span className="ml-3 text-sm text-red-600">
                    {(createMgr.error as Error).message}
                  </span>
                )}
              </div>
            </form>
          )}

          {managers.isLoading ? (
            <p className="text-sm text-slate-400">Loading managers…</p>
          ) : (
            <div className="space-y-2">
              {managers.data?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-slate-700">
                      {m.name}
                    </span>{" "}
                    <span className="text-slate-500">@{m.username}</span>
                    <div className="text-xs text-slate-400">
                      {m.allowedHotels.join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMgr.mutate(m.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {managers.data?.length === 0 && (
                <p className="text-sm text-slate-400">No managers yet.</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

function Stat({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | number;
  danger?: boolean;
}) {
  return (
    <Card className="text-center">
      <div
        className={`text-2xl font-semibold ${
          danger ? "text-red-600" : "text-slate-800"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </Card>
  );
}
