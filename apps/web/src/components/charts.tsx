import { useEffect, useRef } from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import type { ChartConfiguration } from "chart.js";
import type { Bin } from "../lib/api";
import { decimal, integer, interval, percentage } from "../lib/api";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
);
Chart.defaults.font.family = '"Noto Sans", Arial, sans-serif';
Chart.defaults.color = "#52647b";

export function BarChart({
  config,
  label,
}: {
  config: ChartConfiguration<"bar">;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const chart = new Chart(canvas.current!, config);
    return () => chart.destroy();
  }, [config]);
  return (
    <div className="relative h-64 min-w-0 sm:h-72">
      <canvas ref={canvas} role="img" aria-label={label}>
        Chart data is available in the table below.
      </canvas>
    </div>
  );
}

export function Histogram({
  bins,
  maximum,
  title,
}: {
  bins: Bin[];
  maximum: number;
  title: string;
}) {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const peak = Math.max(...bins.map((bin) => bin.count));
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels: bins.map(interval),
      datasets: [
        {
          label: "Candidates",
          data: bins.map((bin) => bin.count),
          backgroundColor: bins.map((bin) =>
            bin.count === peak ? "#245edb" : "#a7c0ed",
          ),
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) =>
              `${integer(Number(item.raw))} candidates · ${decimal(percentage(Number(item.raw), total))}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: {
            display: true,
            text:
              maximum === 10
                ? "Subject score interval"
                : "Combination total interval",
          },
          ticks: { autoSkip: false, minRotation: 45, maxRotation: 45 },
        },
        y: {
          beginAtZero: true,
          suggestedMax: total === 0 ? 1 : undefined,
          title: { display: true, text: "Candidates" },
          ticks: { precision: 0 },
        },
      },
    },
  };
  return (
    <>
      <div className="p-4 sm:p-6">
        {total ? (
          <div
            className="table-wrap"
            role="region"
            aria-label={`${title}. Scroll horizontally to view all score intervals.`}
            tabIndex={0}
          >
            <div style={{ minWidth: bins.length * 24 + 80 }}>
              <BarChart
                config={config}
                label={`${title}. ${integer(total)} candidates. View all intervals in the table below.`}
              />
            </div>
          </div>
        ) : (
          <p className="py-16 text-center text-muted">
            No valid scores for this selection.
          </p>
        )}
      </div>
      <details className="chart-details">
        <summary>View all {bins.length} score intervals</summary>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col">Score interval</th>
                <th scope="col" className="num">
                  Candidates
                </th>
                <th scope="col" className="num">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {bins.map((bin) => (
                <tr key={bin.lowerBound}>
                  <th scope="row">{interval(bin)}</th>
                  <td className="num">{integer(bin.count)}</td>
                  <td className="num">
                    {total
                      ? `${decimal(percentage(bin.count, total))}%`
                      : "No data"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="chart-foot">
        {bins.length} intervals of {maximum / bins.length} points. The final
        interval includes {maximum}. Counts start at zero. Scroll horizontally
        to view all intervals.
      </div>
    </>
  );
}
