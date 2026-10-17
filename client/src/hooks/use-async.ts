import { type DependencyList, useCallback, useEffect, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** Runs the request again, e.g. after saving */
  reload: () => void;
};

// Loads data from a service function, e.g. `useAsync(() => getPet(petId), [petId])`.
export const useAsync = <T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    load()
      .then((result) => !cancelled && setData(result))
      .catch((err: unknown) => !cancelled && setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; the caller's deps decide when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { data, error, loading, reload };
};
