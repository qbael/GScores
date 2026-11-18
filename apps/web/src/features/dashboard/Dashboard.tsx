import type { Levels } from "../../lib/api";
import { integer } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Empty, Heading, Icon, Metric, RequestBlock } from "../../components/ui";

export function Dashboard() {
  const reports = useRequest<Levels>("/api/reports/levels");
  return (
    <>
      <Heading
        section="Dashboard"
        action={
          <a className="btn" href="/scores">
            <Icon name="search" />
            Look up exam scores
          </a>
        }
      />
      <RequestBlock state={reports}>
        {(data) =>
          data.ready ? (
            <div className="metrics">
              <Metric
                label="Total candidates"
                value={integer(data.total)}
                note="Unique registration numbers"
              />
              <Metric
                label="Subjects available"
                value={integer(data.subjects.length)}
                note="Subjects in the dataset"
              />
              <Metric
                label="Valid subject scores"
                value={integer(
                  data.subjects.reduce((sum, s) => sum + s.valid, 0),
                )}
                note="Across all subjects, including scores of zero"
              />
              <Metric
                label="Missing subject scores"
                value={integer(
                  data.subjects.reduce((sum, s) => sum + s.missing, 0),
                )}
                note="Not taken / unavailable; never counted as zero"
              />
            </div>
          ) : (
            <section className="panel">
              <Empty />
            </section>
          )
        }
      </RequestBlock>
    </>
  );
}
