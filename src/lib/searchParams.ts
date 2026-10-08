/**
 * Tiny search-param readers for route `validateSearch`.
 *
 * Route options (validateSearch, head, beforeLoad) are bundled into the main
 * entry chunk that every page downloads, so anything they import ships on
 * every screen. These helpers keep zod and large catalogues out of that chunk;
 * richer validation belongs inside the (code-split) component.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A string no longer than `max`, or undefined. */
export function optionalString(value: unknown, max: number): string | undefined {
  if (typeof value === "number") value = String(value);
  return typeof value === "string" && value.length <= max ? value : undefined;
}

/** A UUID, or undefined. */
export function optionalUuid(value: unknown): string | undefined {
  return typeof value === "string" && UUID.test(value) ? value : undefined;
}

/** One of `options`, or undefined. */
export function optionalOneOf<const T extends string>(
  value: unknown,
  options: readonly T[],
): T | undefined {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}
