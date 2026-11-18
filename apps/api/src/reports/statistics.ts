export interface Frequency {
  score: number;
  count: number;
}
export interface Bin {
  lowerBound: number;
  upperBound: number;
  upperInclusive: boolean;
  count: number;
}

export function statistics(frequencies: Frequency[], maximum = 10, step = 0.5) {
  const values = frequencies
    .map((row) => ({ cents: Math.round(row.score * 100), count: row.count }))
    .sort((a, b) => a.cents - b.cents);
  const valid = values.reduce((sum, row) => sum + row.count, 0);
  const bins: Bin[] = Array.from({ length: maximum / step }, (_, i) => ({
    lowerBound: i * step,
    upperBound: (i + 1) * step,
    upperInclusive: i === maximum / step - 1,
    count: 0,
  }));
  const bands = [0, 0, 0, 0];
  const meanCents = valid
    ? values.reduce((sum, row) => sum + row.cents * row.count, 0) / valid
    : 0;
  let cumulative = 0;
  let medianCents = 0;
  for (const row of values) {
    bins[
      Math.min(Math.floor(row.cents / (step * 100)), bins.length - 1)
    ].count += row.count;
    bands[
      row.cents < 400 ? 0 : row.cents < 600 ? 1 : row.cents < 800 ? 2 : 3
    ] += row.count;
    for (const position of [
      Math.floor((valid + 1) / 2),
      Math.floor((valid + 2) / 2),
    ]) {
      if (position > cumulative && position <= cumulative + row.count)
        medianCents += row.cents / 2;
    }
    cumulative += row.count;
  }
  return {
    valid,
    mean: valid ? meanCents / 100 : null,
    median: valid ? medianCents / 100 : null,
    std: valid
      ? Math.sqrt(
          values.reduce(
            (sum, row) => sum + (row.cents - meanCents) ** 2 * row.count,
            0,
          ) / valid,
        ) / 100
      : null,
    min: valid ? values[0].cents / 100 : null,
    max: valid ? values[values.length - 1].cents / 100 : null,
    zero: values.find((row) => row.cents === 0)?.count ?? 0,
    ten: values.find((row) => row.cents === 1000)?.count ?? 0,
    bins,
    bands,
  };
}
