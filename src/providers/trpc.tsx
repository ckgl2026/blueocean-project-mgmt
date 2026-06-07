import { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import SuperJSON from "superjson";
import { localDataLink } from "./localDataLink";
import type { AppRouter } from "../../api/router";

export const trpc = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/trpc/ping", { method: "HEAD" })
      .then((r) => {
        setBackendAvailable(r.ok);
      })
      .catch(() => {
        setBackendAvailable(false);
      });
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  const trpcClient = useMemo(() => {
    if (backendAvailable === null) {
      return trpc.createClient({
        links: [],
      });
    }

    if (backendAvailable) {
      return trpc.createClient({
        links: [
          httpBatchLink({
            url: "/api/trpc",
            headers() {
              const token = localStorage.getItem("blueocean_token");
              return token ? { Authorization: `Bearer ${token}` } : {};
            },
            transformer: SuperJSON,
          }),
        ],
      });
    }

    // Backend unavailable — use localStorage
    return trpc.createClient({
      links: [localDataLink],
    });
  }, [backendAvailable]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
