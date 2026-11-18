import type { ChartConfiguration } from "chart.js";
import type { SubjectReport } from "../../lib/api";
import { decimal, integer, percentage } from "../../lib/api";
import { BarChart } from "../../components/charts";

const bandLabels = [
  "Below 4",
  "4 to below 6",
  "6 to below 8",
  "8 to 10",
];
const bandColors = ["#8a98ac", "#dfaa43", "#558fbb", "#245edb"];

export function Bands({ subjects }: { subjects: SubjectReport[] }) {
  const config: ChartConfiguration<"bar"> = {
    type: "bar",
    data: {
      labels: subjects.map((subject) => subject.short),
      datasets: bandLabels.map((label, i) => ({
        label,
        data: subjects.map((s) => s.bands[i]),
        backgroundColor: bandColors[i],
      })),
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const s = subjects[item.dataIndex],
                count = s.bands[item.datasetIndex];
              return `${item.dataset.label}: ${integer(count)} candidates · ${s.valid ? `${decimal(percentage(count, s.valid))}%` : "No data"}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          min: 0,
          title: { display: true, text: "Candidates" },
          ticks: { precision: 0 },
        },
        y: { stacked: true, grid: { display: false } },
      },
    },
  };
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Score bands by subject</h2>
        <p className="helper">
          Candidate counts across 4 score bands · 9 subjects · 2024
        </p>
      </div>
      <div className="px-3 pb-4 sm:px-6">
        <BarChart
          config={config}
          label="Number of candidates across four score bands for all nine subjects. Counts and percentages are in the table below."
        />
      </div>
      <details className="chart-details">
        <summary>View counts and percentages</summary>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Score bands by subject, 2024</caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                {bandLabels.map((label) => (
                  <th scope="col" className="num" key={label}>
                    {label}
                  </th>
                ))}
                <th scope="col" className="num">
                  Valid scores
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.key}>
                  <th scope="row">{s.name}</th>
                  {s.bands.map((count, i) => (
                    <td className="num" key={i}>
                      {integer(count)} ·{" "}
                      {s.valid
                        ? `${decimal(percentage(count, s.valid))}%`
                        : "No data"}
                    </td>
                  ))}
                  <td className="num">{integer(s.valid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
