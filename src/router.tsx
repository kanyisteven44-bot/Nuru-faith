import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Most screens re-mount their queries on every navigation (Home →
        // Bible → Home, tab switches, etc). Without a staleTime, React
        // Query treats that as stale-on-arrival and refetches immediately,
        // so every nav round-trips to Supabase again even for data that
        // hasn't changed. Mutations already invalidate their own queries
        // explicitly, so this only cuts redundant background refetches.
        staleTime: 60_000,
        gcTime: 10 * 60_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
