import clsx from "clsx";
import type { LogStatus } from "./types";

export function StatusBadge({ status }: { status: LogStatus }) {
  const styles: Record<LogStatus, string> = {
    pass: "bg-green-100 text-green-700",
    fail: "bg-red-100 text-red-700",
    caution: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={clsx(
        "inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status],
      )}
    >
      {status}
    </span>
  );
}

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost";
}) {
  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";
