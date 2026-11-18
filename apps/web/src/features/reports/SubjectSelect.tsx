import type { SubjectReport } from "../../lib/api";

export function SubjectSelect({
  subjects,
  selected,
  onChange,
}: {
  subjects: SubjectReport[];
  selected: string;
  onChange: (key: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="sr-only">Choose a subject</span>
      <select
        className="filter"
        id="subject-filter"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
      >
        {subjects.map((s) => (
          <option value={s.key} key={s.key}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}

