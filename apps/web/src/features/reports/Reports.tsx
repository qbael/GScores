import type { Levels } from "../../lib/api";
import { decimal, integer, percentage } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Empty, Heading, Metric, RequestBlock } from "../../components/ui";
import { Bands } from "./Bands";
import { Distribution } from "./Distribution";
import { SubjectsTable } from "./SubjectsTable";

export function Reports({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const reports = useRequest<Levels>("/api/reports/levels");
  return (
    <>
      <Heading
        section="Subject reports"
      />
      <RequestBlock state={reports}>
        {(data) => {
          if (!data.ready)
            return (
              <section className="panel">
                <Empty />
              </section>
            );
          const s = data.subjects.find((item) => item.key === selected);
          if (!s)
            return (
              <section className="panel">
                <Empty title="Unknown subject.">
                  <a href="/reports" className="text-blue">
                    View subject reports
                  </a>
                </Empty>
              </section>
            );
          return (
            <>
              <div className="metrics">
                <Metric
                  label="Median"
                  value={decimal(s.median)}
                  note="Middle value of the score population"
                />
                <Metric
                  label="Standard deviation"
                  value={decimal(s.std)}
                  note="Population standard deviation"
                />
                <Metric
                  label={`${s.short} scores`}
                  value={integer(s.valid)}
                  note={`${decimal(percentage(s.valid, data.total))}% of all candidates`}
                />
                <Metric
                  label={`${s.short} mean`}
                  value={decimal(s.mean)}
                  note="On a 10-point scale"
                />
              </div>
              <Distribution
                subject={s}
                subjects={data.subjects}
                onSelect={onSelect}
              />
              <Bands subjects={data.subjects} />
              <SubjectsTable subjects={data.subjects} />
            </>
          );
        }}
      </RequestBlock>
    </>
  );
}
