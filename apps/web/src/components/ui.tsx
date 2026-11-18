import type { ReactNode } from "react";
import type { RequestState } from "../hooks/useRequest";

export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 16V9m5 7V5m5 11v-5" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v6m-4 2h8" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6m0-10v1" />
      </>
    ),
  };
  return (
    <svg
      className={`h-5 w-5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.chart}
    </svg>
  );
}

export function Heading({
  section,
  action,
}: {
  section: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-5">
      <div className="grid gap-2">
        <p className="eyebrow text-blue">G-Scores / {section}</p>
      </div>
      {action}
    </div>
  );
}

export function Metric({
  label,
  value,
  note,
  icon = "chart",
}: {
  label: string;
  value: string;
  note: string;
  icon?: string;
}) {
  return (
    <article className="panel grid gap-2.5 p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>{label}</span>
        <Icon name={icon} className="text-blue" />
      </div>
      <strong className="text-[28px] leading-tight font-bold tracking-tight tabular-nums">
        {value}
      </strong>
      <p className="text-[11px] text-muted">{note}</p>
    </article>
  );
}

export function Loading() {
  return (
    <section className="panel p-6" role="status" aria-busy="true">
      <p className="mb-5 text-sm text-muted">Loading exam data…</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="mt-5 h-44 rounded-lg bg-slate-100" aria-hidden="true" />
    </section>
  );
}

export function Empty({
  title = "No data for 2024 yet.",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-64 justify-items-center content-center gap-4 p-6 text-center">
      <Icon name="info" className="text-blue" />
      <h2>{title}</h2>
      <div className="max-w-lg text-sm text-muted">
        {children ??
          "Statistics and rankings will appear when exam data is available."}
      </div>
    </div>
  );
}

export function RequestBlock<T>({
  state,
  children,
}: {
  state: RequestState<T>;
  children: (data: T) => ReactNode;
}) {
  if (state.loading) return <Loading />;
  if (state.error)
    return (
      <section className="panel" role="alert">
        <Empty title="Unable to load data.">
          <p>{state.error.message}</p>
          <button className="btn btn-primary mt-4" onClick={state.retry}>
            Retry
          </button>
        </Empty>
      </section>
    );
  return state.data === undefined ? null : children(state.data);
}
