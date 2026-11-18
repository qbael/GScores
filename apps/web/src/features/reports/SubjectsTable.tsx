import type { SubjectReport } from "../../lib/api";
import { decimal, integer } from "../../lib/api";

export function SubjectsTable({ subjects }: { subjects: SubjectReport[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>All 9 subjects at a glance</h2>
        <p className="helper">
          Missing scores are listed separately and never counted as zero.
        </p>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <caption className="sr-only">
            Statistics for all 9 subjects, 2024
          </caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              {[
                "Valid scores",
                "Missing scores",
                "Mean",
                "Lowest",
                "Highest",
              ].map((label) => (
                <th scope="col" className="num" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.key}>
                <th scope="row">
                  <a
                    className="inline-flex items-center gap-2.5 text-blue"
                    href={`/reports?subject=${s.key}`}
                  >
                    <span
                      className="grid h-7 w-7 place-items-center rounded-lg bg-blue-soft text-xs"
                      aria-hidden="true"
                    >
                      {s.short[0]}
                    </span>
                    {s.name}
                  </a>
                </th>
                <td className="num">{integer(s.valid)}</td>
                <td className="num text-muted">{integer(s.missing)}</td>
                <td className="num font-bold">{decimal(s.mean)}</td>
                <td className="num">{decimal(s.min)}</td>
                <td className="num">{decimal(s.max)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
