import { QueryClient } from '@tanstack/react-query';

// Singleton exported so non-component modules (e.g. the API client's token
// refresh interceptor) can call queryClient.clear() without accessing React
// context. QueryProvider.tsx consumes this directly — the useState guard in the
// original provider bought nothing in a single-root RN app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
