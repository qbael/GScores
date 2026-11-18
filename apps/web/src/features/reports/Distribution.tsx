import type { SubjectReport } from "../../lib/api";
import { decimal, integer } from "../../lib/api";
import { Histogram } from "../../components/charts";
import { SubjectSelect } from "./SubjectSelect";

export function Distribution({
  subject: s,
  subjects,
  onSelect,
}: {
  subject: SubjectReport;
  subjects: SubjectReport[];
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid gap-6 min-[1200px]:grid-cols-[minmax(0,1fr)_290px]">
      <section className="panel">
        <div className="panel-heading flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2>{s.name} score distribution · 2024</h2>
            <p className="helper">
              {integer(s.valid)} valid scores · 20 intervals of 0.5 points
            </p>
          </div>
          <SubjectSelect
            subjects={subjects}
            selected={s.key}
            onChange={onSelect}
          />
        </div>
        <Histogram
          bins={s.bins}
          maximum={10}
          title={`${s.name} score distribution, 2024`}
        />
      </section>
      <aside className="panel">
        <div className="panel-heading">
          <h2>{s.name} at a glance</h2>
          <p className="helper">Same population as the chart</p>
        </div>
        <dl className="px-6 pb-4">
          {[
            ["Mean score", decimal(s.mean)],
            ["Median", decimal(s.median)],
            ["Standard deviation", decimal(s.std)],
            ["Valid scores", integer(s.valid)],
            ["Scores of 0", integer(s.zero)],
            ["Scores of 10", integer(s.ten)],
          ].map(([label, value]) => (
            <div
              className="flex justify-between gap-4 border-b border-line py-3 text-xs last:border-0"
              key={label}
            >
              <dt className="text-muted">{label}</dt>
              <dd className="font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mx-6 mb-6 rounded-lg bg-blue-soft p-3 text-xs leading-7 text-muted">
          {s.key === "ngoai_ngu"
            ? "Includes all foreign-language codes, not only English."
            : `Highest score: ${decimal(s.max)}. Excludes ${integer(s.missing)} candidates with missing scores in this subject.`}
        </p>
      </aside>
    </div>
  );
}

