import type { Ranking, Subject } from "../../lib/api";
import { decimal } from "../../lib/api";

export function RankingTable({
  ranking,
  subjects,
}: {
  ranking: Ranking;
  subjects: Subject[];
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">
          Top 10 candidates, {ranking.key}, 2024
        </caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Registration number</th>
            {ranking.subjects.map((key) => (
              <th scope="col" className="num" key={key}>
                {ranking.english && key === "ngoai_ngu"
                  ? "English"
                  : subjects.find((s) => s.key === key)?.short}
              </th>
            ))}
            <th scope="col" className="num">
              Total score
            </th>
          </tr>
        </thead>
        <tbody>
          {ranking.top.map((row) => (
            <tr key={row.sbd}>
              <td>
                <span
                  className={`inline-grid h-7 w-7 place-items-center rounded-md font-bold ${row.position === 1 ? "bg-amber-100 text-amber-800" : "bg-blue-soft text-muted"}`}
                >
                  {row.position}
                </span>
              </td>
              <td>
                <a
                  className="mono text-blue"
                  href={`/scores?sbd=${row.sbd}`}
                  aria-label={`Look up registration number ${row.sbd}`}
                >
                  {row.sbd}
                </a>
              </td>
              {row.scores.map((score, i) => (
                <td className="num" key={i}>
                  {decimal(score)}
                </td>
              ))}
              <td className="num font-bold text-blue">{decimal(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

