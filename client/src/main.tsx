import { trpc } from "@/lib/trpc";
import { API_BASE_URL } from "@/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

if (import.meta.env.DEV) {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.query.state.error;
      console.error("[API Query Error]", error);
    }
  });

  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.mutation.state.error;
      console.error("[API Mutation Error]", error);
    }
  });
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      transformer: superjson,
      fetch: (input, init) =>
        globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }),
    }),
  ],
});

if (import.meta.env.DEV) {
  window.addEventListener("error", (event) => {
    console.error("[Frontend Error]", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[Frontend Unhandled Rejection]", event.reason);
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
