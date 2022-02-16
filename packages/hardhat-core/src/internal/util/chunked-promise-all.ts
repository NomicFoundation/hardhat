/**
 * This function accepts an array of functions that each return a promise and
 * runs them in groups of `chunkSize` length at a time, replacing finished tasks
 * with those waiting in queue and returning an aggregation of the resulting data.
 */
export async function chunkedPromiseAll<T>(
  promises: Array<() => Promise<T>>,
  chunkSize: number = 4
): Promise<T[]> {
  const queue = [...promises];
  const running = queue.splice(0, chunkSize).map((p) => p());
  const results = [];

  while (running.length > 0) {
    const withIndexes = running.map((p, i) =>
      p.then((r) => [r, i] as [T, number])
    );

    const [result, index] = await Promise.race(withIndexes);

    results.push(result);

    const nextItem = queue.shift();
    if (nextItem !== undefined) {
      const started = nextItem();
      running.splice(index, 1, started);
      withIndexes.splice(
        index,
        1,
        started.then((r) => [r, index] as [T, number])
      );
    } else {
      running.splice(index, 1);
      withIndexes.splice(index, 1);
    }
  }

  return results;
}
