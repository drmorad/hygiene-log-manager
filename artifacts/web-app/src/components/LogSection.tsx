import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Button, Card, Field, StatusBadge, inputClass, todayStr } from "../ui";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { LogStatus } from "../types";

export interface LogFieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "time" | "date" | "select" | "textarea";
  options?: string[];
  required?: boolean;
  step?: string;
}

export interface LogSectionConfig {
  type: "buffet" | "thawing" | "received" | "disinfection";
  title: string;
  description: string;
  fields: LogFieldDef[];
  // map form values -> request body (optional transforms)
  buildBody?: (values: Record<string, string>, hotel: string) => unknown;
  // render a row summary for the list
  renderRow: (row: any) => React.ReactNode;
}

export function LogSection({
  config,
  hotel,
}: {
  config: LogSectionConfig;
  hotel: string;
}) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: [config.type, hotel],
    queryFn: () => api.listLogs(config.type, hotel),
  });

  const create = useMutation({
    mutationFn: (values: Record<string, string>) => {
      const base = config.buildBody
        ? config.buildBody(values, hotel)
        : { hotelId: hotel, ...values };
      return api.createLog(config.type, base);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [config.type, hotel] });
      setShowForm(false);
      setForm({});
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteLog(config.type, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.type, hotel] }),
  });

  function update(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = config.fields.some(
      (f) => f.required && !form[f.name],
    );
    if (missing) return;
    const payload: Record<string, string> = { date: todayStr() };
    for (const f of config.fields) {
      if (f.type === "number") payload[f.name] = form[f.name];
      else if (form[f.name] !== undefined) payload[f.name] = form[f.name];
    }
    create.mutate(payload);
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-800">{config.title}</h2>
          <p className="text-sm text-slate-500">{config.description}</p>
        </div>
        <Button
          variant={showForm ? "ghost" : "primary"}
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus size={16} /> {showForm ? "Cancel" : "New"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-5 grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2"
        >
          {config.fields.map((f) => (
            <Field key={f.name} label={f.label}>
              {f.type === "textarea" ? (
                <textarea
                  className={inputClass}
                  value={form[f.name] || ""}
                  onChange={(e) => update(f.name, e.target.value)}
                  required={f.required}
                />
              ) : f.type === "select" ? (
                <select
                  className={inputClass}
                  value={form[f.name] || ""}
                  onChange={(e) => update(f.name, e.target.value)}
                  required={f.required}
                >
                  <option value="">Select…</option>
                  {f.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClass}
                  type={f.type || "text"}
                  step={f.step}
                  value={form[f.name] || ""}
                  onChange={(e) => update(f.name, e.target.value)}
                  required={f.required}
                />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Save entry
            </Button>
            {create.isError && (
              <span className="ml-3 text-sm text-red-600">
                {(create.error as Error).message}
              </span>
            )}
          </div>
        </form>
      )}

      {query.isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-2">
          {query.data.map((row: any) => (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
            >
              <div className="min-w-0 text-sm">
                {config.renderRow(row)}
                <div className="mt-1">
                  <StatusBadge status={row.status as LogStatus} />
                </div>
              </div>
              <button
                onClick={() => remove.mutate(row.id)}
                className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No entries yet for {hotel}.</p>
      )}
    </Card>
  );
}
