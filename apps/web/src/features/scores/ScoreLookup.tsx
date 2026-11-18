import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Candidate, Subject } from "../../lib/api";
import { decimal } from "../../lib/api";
import { useRequest } from "../../hooks/useRequest";
import { Empty, Icon, Loading } from "../../components/ui";

export function ScoreLookup({
  subjects,
  initial,
}: {
  subjects: Subject[];
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(
    /^[0-9]{8}$/.test(initial) ? initial : "",
  );
  const [error, setError] = useState(
    initial && !/^[0-9]{8}$/.test(initial)
      ? "Enter exactly 8 digits. Example: 01000001."
      : "",
  );
  const input = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const request = useRequest<Candidate>(
    submitted ? `/api/scores/${submitted}` : null,
  );
  useEffect(() => {
    if (request.data || request.error?.status === 404)
      resultHeading.current?.focus();
  }, [request.data, request.error]);
  function lookup(raw: string) {
    const number = raw.trim();
    setValue(number);
    if (!/^[0-9]{8}$/.test(number)) {
      setError("Enter exactly 8 digits. Example: 01000001.");
      input.current?.focus();
      return;
    }
    setError("");
    if (number === submitted) request.retry();
    else setSubmitted(number);
    history.replaceState(null, "", `/scores?sbd=${number}`);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    lookup(value);
  }
  const candidate = request.data;
  const a00 =
    candidate && [0, 3, 4].every((i) => candidate.scores[i] !== null)
      ? [0, 3, 4].reduce(
          (sum, i) => sum + Math.round(candidate!.scores[i]! * 100),
          0,
        ) / 100
      : null;
  return (
    <>
      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[320px_minmax(0,1fr)]">
        <section className="panel">
          <form
            id="lookup-form"
            noValidate
            onSubmit={submit}
            className="grid gap-5 p-6"
          >
            <div>
              <h2>Find your results</h2>
              <p className="helper">
                Enter the exact 8-digit number on your exam registration slip.
              </p>
            </div>
            <div className="grid gap-2">
              <label htmlFor="sbd" className="text-xs font-bold">
                Registration number
              </label>
              <input
                className={`mono w-full rounded-lg border bg-white px-3 py-3 text-base ${error ? "border-danger" : "border-line"}`}
                ref={input}
                id="sbd"
                name="sbd"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{8}"
                autoComplete="off"
                placeholder="Example: 01000001"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-invalid={!!error}
                aria-describedby="sbd-help sbd-error"
              />
              <span id="sbd-help" className="helper">
                Exactly 8 digits, including any leading zeros.
              </span>
              <span id="sbd-error" className="text-xs text-danger" role="alert">
                {error}
              </span>
            </div>
            <button
              className="btn btn-primary"
              id="lookup-submit"
              type="submit"
              disabled={request.loading}
            >
              <Icon name="search" />
              {request.loading ? "Looking up…" : "Score lookup"}
            </button>
            <div className="border-t border-line pt-5">
              <p className="helper mb-2">Try a sample registration number</p>
              <div className="flex flex-wrap gap-2">
                {["01000001", "01000002", "01003254"].map((sample) => (
                  <button
                    className="mono rounded-md border border-line px-2 py-1.5 text-xs text-blue hover:bg-blue-soft"
                    key={sample}
                    type="button"
                    onClick={() => lookup(sample)}
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </form>
          <p className="border-t border-line bg-slate-50 p-6 text-xs leading-7 text-muted">
            <strong>Reading your results</strong>
            <br />A score of 0 is valid.
            <br />
            Missing scores appear as “Not taken / unavailable”.
            <br />
            <br />
            Search any registration number in the 2024 dataset.
          </p>
        </section>
        <section
          className="panel"
          id="lookup-result"
          aria-label="Lookup results"
          aria-busy={request.loading}
        >
          {request.loading ? (
            <Loading />
          ) : request.error ? (
            <Empty
              title={
                request.error.status === 404
                  ? "Registration number not found."
                  : "Unable to load results."
              }
            >
              <h3 ref={resultHeading} tabIndex={-1} className="font-normal">
                {request.error.status === 404
                  ? `No result for ${submitted}. Check the number and try again.`
                  : request.error.message}
              </h3>
              <button
                className="btn mt-4"
                onClick={
                  request.error.status === 404
                    ? () => {
                        input.current?.focus();
                        input.current?.select();
                      }
                    : request.retry
                }
              >
                {request.error.status === 404
                  ? "Edit registration number"
                  : "Retry"}
              </button>
            </Empty>
          ) : candidate ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
                <div>
                  <p className="eyebrow text-muted">Exam results · 2024</p>
                  <h2
                    id="result-sbd"
                    ref={resultHeading}
                    tabIndex={-1}
                    className="mono mt-2 text-2xl"
                  >
                    {candidate.sbd}
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  Results found
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3">
                {subjects.map((subject, i) => (
                  <div
                    className="border-r border-b border-line p-4 sm:p-5"
                    key={subject.key}
                  >
                    <h3 className="mb-3 text-[11px] font-normal text-muted">
                      {subject.name}
                      {i === 2 && candidate.language
                        ? ` · ${candidate.language === "N1" ? "English (N1)" : candidate.language}`
                        : ""}
                    </h3>
                    {candidate.scores[i] === null ? (
                      <strong className="block text-xs leading-5 font-normal text-muted">
                        Not taken /<br />
                        unavailable
                      </strong>
                    ) : (
                      <strong className="text-2xl font-bold tabular-nums">
                        {decimal(candidate.scores[i])}{" "}
                        <span className="text-xs font-normal text-muted">
                          / 10
                        </span>
                      </strong>
                    )}
                  </div>
                ))}
              </div>
              {a00 !== null && (
                <div className="m-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-blue-soft p-4">
                  <div className="text-xs">
                    Total score A00
                    <p className="helper">Math + Physics + Chemistry</p>
                  </div>
                  <strong className="text-2xl text-blue">
                    {decimal(a00)}{" "}
                    <span className="text-xs font-normal text-muted">/ 30</span>
                  </strong>
                </div>
              )}
              <p className="chart-foot">
                Missing scores are never replaced with zero. Combination totals
                are unweighted and exclude priority points.
              </p>
            </>
          ) : (
            <Empty title="Your exam scores, right here.">
              <p>
                Enter your registration number to view your 2024 national high
                school exam scores.
              </p>
              <p className="mt-4 text-xs">
                Keep any leading zeros in your registration number.
              </p>
            </Empty>
          )}
        </section>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {request.loading
          ? "Looking up registration number " + submitted
          : candidate
            ? "Results found for " + candidate.sbd
            : request.error
              ? request.error.message
              : ""}
      </p>
    </>
  );
}
