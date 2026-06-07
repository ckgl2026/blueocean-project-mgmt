// Hook that uses tRPC data when backend is available,
// falls back to localStorage/Supabase when backend is unavailable

import { useState, useEffect } from 'react';

export function useFallbackData<T>(
  trpcData: T | undefined,
  trpcIsLoading: boolean,
  trpcError: unknown,
  localFetcher: () => T | Promise<T>
) {
  const [localData, setLocalData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!trpcIsLoading) {
      if (trpcError || !trpcData) {
        // Backend unavailable or no data, use local fetcher
        Promise.resolve(localFetcher())
          .then((data) => {
            setLocalData(data);
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }
  }, [trpcData, trpcIsLoading, trpcError]);

  return {
    data: trpcData || localData,
    isLoading: trpcIsLoading || (isLoading && !trpcData),
  };
}
