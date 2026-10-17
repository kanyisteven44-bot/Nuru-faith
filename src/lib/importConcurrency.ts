/** Bound network concurrency while preserving input order and partial failures. */
export async function mapImportInputs<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit = 3,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        try {
          results[index] = { status: "fulfilled", value: await worker(items[index]!) };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}
