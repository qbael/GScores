import type { Subject } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Heading, RequestBlock } from "../../components/ui";
import { ScoreLookup } from "./ScoreLookup";

export function Scores({ initial }: { initial: string }) {
  const subjects = useRequest<Subject[]>("/api/subjects");
  return (
    <>
      <Heading
        section="Score lookup"
      />
      <RequestBlock state={subjects}>
        {(subjects) => <ScoreLookup subjects={subjects} initial={initial} />}
      </RequestBlock>
    </>
  );
}
