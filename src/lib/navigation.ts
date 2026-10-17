/** Match complete route segments, including the learning hub's child screens. */
export function isNavigationActive(pathname: string, destination: string): boolean {
  const path = (pathname.split(/[?#]/, 1)[0] ?? "/").replace(/\/+$/, "") || "/";
  if (destination === "/grow") {
    return ["/grow", "/faith-courses", "/devotionals", "/series"].some(
      (route) => path === route || path.startsWith(`${route}/`),
    );
  }
  return path === destination || path.startsWith(`${destination}/`);
}
