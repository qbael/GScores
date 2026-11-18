import type { Combination, Ranking, Subject } from "../../lib/api";
import { decimal, groupNames, integer } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Histogram } from "../../components/charts";
import { Empty, Icon, Metric, RequestBlock } from "../../components/ui";
import { RankingTable } from "./RankingTable";

export function CombinationReport({
  combinations,
  subjects,
  selected,
  onSelect,
}: {
  combinations: Combination[];
  subjects: Subject[];
  selected: string;
  onSelect: (key: string) => void;
}) {
  const request = useRequest<Ranking>(
    `/api/reports/combinations/${encodeURIComponent(selected)}`,
  );
  return (
    <div className="grid min-w-0 gap-6">
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 min-[1200px]:grid-cols-6"
        role="group"
        aria-label="Choose an exam combination"
      >
        {combinations.map((c) => (
          <button
            id={`tab-${c.key}`}
            className={`rounded-xl border px-3 py-4 text-left ${selected === c.key ? "border-blue bg-blue-soft text-blue" : "border-line bg-white hover:border-blue"}`}
            key={c.key}
            onClick={() => onSelect(c.key)}
            aria-pressed={selected === c.key}
          >
            <strong className="mb-1 block text-sm">{c.key}</strong>
            <span className="block text-[10px] leading-5">
              {groupNames(c, subjects)}
            </span>
          </button>
        ))}
      </div>
      <RequestBlock state={request}>
        {(ranking) => (
          <>
            <div className="metrics">
              <Metric
                label="All 3 scores available"
                value={integer(ranking.valid)}
                note={`Combination ${ranking.key}`}
              />
              <Metric
                label="Mean total score"
                value={decimal(ranking.mean)}
                note="Unweighted total / 30"
              />
              <Metric
                label="Highest total score"
                value={decimal(ranking.max)}
                note="Excludes priority points"
                icon="trophy"
              />
              <Metric
                label="Maximum possible"
                value="30.00"
                note={groupNames(ranking, subjects)}
              />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-line bg-blue-soft p-5 text-xs leading-6">
              <Icon name="info" />
              <p>
                <strong>
                  {ranking.key} = {groupNames(ranking, subjects)}.
                </strong>{" "}
                Only candidates with all 3 scores are included.{" "}
                {ranking.english &&
                  "English is required (language code N1). "}
                Zero is valid; missing scores are never replaced with zero.
              </p>
            </div>
            <section className="panel">
              <div className="panel-heading">
                <h2>{ranking.key} total-score distribution · 2024</h2>
                <p className="helper">
                  {groupNames(ranking, subjects)} · {integer(ranking.valid)}{" "}
                  candidates with all 3 scores
                </p>
              </div>
              <Histogram
                bins={ranking.bins}
                maximum={30}
                title={`${ranking.key} total-score distribution, 2024`}
              />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Top 10 candidates · {ranking.key}</h2>
                <p className="helper">
                  2024 · Select a registration number to view all subject scores.
                </p>
              </div>
              {ranking.valid ? (
                <RankingTable ranking={ranking} subjects={subjects} />
              ) : (
                <Empty title="No eligible candidates." />
              )}
              <p className="chart-foot">
                Ordered by total score, highest first. Tied totals use ascending
                registration numbers for display. This is a dataset leaderboard,
                not an admission result.
              </p>
            </section>
          </>
        )}
      </RequestBlock>
    </div>
  );
}
