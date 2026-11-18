import type { Combination, Subject } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Heading, RequestBlock } from "../../components/ui";
import { CombinationReport } from "./CombinationReport";

export function Rankings({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (key: string) => void;
}) {
  const subjects = useRequest<Subject[]>("/api/subjects");
  const combinations = useRequest<Combination[]>("/api/combinations");
  return (
    <>
      <Heading
        section="Rankings"
      />
      <RequestBlock state={subjects}>
        {(subjects) => (
          <RequestBlock state={combinations}>
            {(combinations) => (
              <CombinationReport
                subjects={subjects}
                combinations={combinations}
                selected={selected}
                onSelect={onSelect}
              />
            )}
          </RequestBlock>
        )}
      </RequestBlock>
    </>
  );
}
