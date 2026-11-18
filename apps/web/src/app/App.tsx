import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Heading, Icon } from "../components/ui";
import { Dashboard } from "../features/dashboard/Dashboard";
import { Reports } from "../features/reports/Reports";
import { Rankings } from "../features/rankings/Rankings";
import { Scores } from "../features/scores/Scores";

const routes: Record<string, [string, string]> = {
  "/": ["Dashboard", "grid"],
  "/scores": ["Score lookup", "search"],
  "/reports": ["Subject reports", "chart"],
  "/rankings": ["Rankings", "trophy"],
};

export function App() {
  const [location, setLocation] = useState(
    window.location.pathname + window.location.search,
  );
  const main = useRef<HTMLElement>(null);
  const [pathname, query = ""] = location.split("?");
  const params = new URLSearchParams(query);
  const title = routes[pathname]?.[0] ?? "Page not found";
  useEffect(() => {
    const change = () =>
      setLocation(window.location.pathname + window.location.search);
    window.addEventListener("popstate", change);
    return () => window.removeEventListener("popstate", change);
  }, []);
  useEffect(() => {
    document.title = "G-Scores · " + title;
  }, [title]);
  function navigate(url: string, scroll = true) {
    history.pushState(null, "", url);
    setLocation(url);
    if (scroll) {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    }
  }
  function follow(event: MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as Element).closest("a");
    if (
      !anchor ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target ||
      anchor.hasAttribute("download")
    )
      return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    if (url.hash === "#main") {
      event.preventDefault();
      main.current?.focus();
      return;
    }
    event.preventDefault();
    navigate(url.pathname + url.search);
  }
  function select(key: string, value: string) {
    const next = new URLSearchParams(query);
    next.set(key, value);
    navigate(pathname + "?" + next.toString(), false);
  }
  const brand = (
    <>
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold font-serif text-[28px] font-bold text-nav"
        aria-hidden="true"
      >
        g.
      </span>
      <span>
        <span className="block text-[23px] leading-tight font-bold tracking-tight">
          G-Scores
        </span>
        <span className="mt-1 block text-[9px] tracking-[1.6px] text-slate-300">
          EXAM INSIGHTS
        </span>
      </span>
    </>
  );
  return (
    <div onClick={follow}>
      <a
        className="fixed top-[-80px] left-3 z-50 rounded bg-white p-3 text-blue focus:top-2"
        href="#main"
      >
        Skip to main content
      </a>
      <aside
        className="z-10 flex flex-col gap-5 bg-nav p-4 text-white sm:fixed sm:inset-y-0 sm:left-0 sm:w-56 sm:gap-10 sm:px-5 sm:py-8"
        aria-label="Application navigation"
      >
        <a
          href="/"
          className="flex items-center gap-3"
          aria-label="G-Scores, return to dashboard"
        >
          {brand}
        </a>
        <div>
          <p className="eyebrow mb-3 hidden px-3 text-slate-300 sm:block">
            Explore data
          </p>
          <nav
            className="grid grid-cols-4 gap-1 sm:grid-cols-1 sm:gap-2"
            aria-label="Main navigation"
          >
            {Object.entries(routes).map(([path, [label, icon]]) => (
              <a
                href={path}
                key={path}
                aria-current={pathname === path ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-2 rounded-lg px-1 py-2 text-center text-[10px] font-semibold sm:flex-row sm:justify-start sm:gap-3 sm:px-3 sm:text-left sm:text-[13px] ${pathname === path ? "bg-[#294867] text-white" : "text-slate-300 hover:bg-[#203c5e]"}`}
              >
                <Icon
                  name={icon}
                  className={pathname === path ? "text-gold" : ""}
                />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-auto hidden space-y-5 sm:block">
          <div className="grid gap-2 rounded-xl border border-slate-500/60 p-4">
            <p className="eyebrow text-slate-300">National high school exam</p>
            <strong className="text-xl">Class of 2024</strong>
          </div>
        </div>
      </aside>
      <div className="min-w-0 sm:ml-56">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-4 py-4 min-[950px]:px-9">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>G-Scores</span>
            <span aria-hidden="true">/</span>
            <strong className="text-ink">{title}</strong>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden rounded-md bg-blue-soft px-2 py-1.5 text-[11px] font-semibold text-blue min-[950px]:inline">
              National high school exam
            </span>
            <label htmlFor="year" className="text-muted">
              Exam year
            </label>
            <select
              id="year"
              disabled
              className="rounded-lg border border-line bg-white px-3 py-2 font-semibold"
            >
              <option>2024</option>
            </select>
            <span className="sr-only">Only 2024 data is available.</span>
          </div>
        </header>
        <main
          id="main"
          ref={main}
          tabIndex={-1}
          className="mx-auto grid max-w-[1600px] min-w-0 gap-6 px-4 py-7 outline-none min-[950px]:px-9 min-[950px]:py-8"
        >
          {!routes[pathname] ? (
            <>
              <Heading
                section="Page not found"
              />
              <a href="/" className="btn justify-self-start">
                Back to dashboard
              </a>
            </>
          ) : pathname === "/scores" ? (
            <Scores
              key={params.get("sbd") ?? ""}
              initial={params.get("sbd") ?? ""}
            />
          ) : pathname === "/rankings" ? (
            <Rankings
              selected={params.get("group") ?? "A00"}
              onSelect={(key) => select("group", key)}
            />
          ) : pathname === "/reports" ? (
            <Reports
              selected={params.get("subject") ?? "toan"}
              onSelect={(key) => select("subject", key)}
            />
          ) : (
            <Dashboard />
          )}
        </main>
        <footer className="mx-auto flex max-w-[1600px] flex-wrap justify-between gap-3 px-4 pb-7 text-[10px] leading-5 text-muted min-[950px]:px-9">
          <span className="break-all">Source: diem_thi_thpt_2024.csv</span>
          <span>G-Scores · Exam data insights · 2024</span>
        </footer>
      </div>
    </div>
  );
}
