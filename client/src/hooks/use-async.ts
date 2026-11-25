import { type DependencyList, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type AsyncState<T> = {
  data: T | null;
  error: Error | null;
  loading: boolean;
  /** Runs the request again, e.g. after saving */
  reload: () => void;
};

/** One request. A new object is made when the caller's deps change or reload() is called. */
type Request = { deps: DependencyList };

/** What the latest finished request ended with, and which request that was */
type Settled = { request: Request; error: Error | null };

const sameDeps = (a: DependencyList, b: DependencyList) =>
  a.length === b.length && a.every((value, index) => Object.is(value, b[index]));

// Loads data from a service function, e.g. `useAsync(() => getPet(petId), [petId])`.
// The previous data stays on screen while a new request runs. Data comes back in the app language,
// so a language change loads it again, also on screens that are already open.
export const useAsync = <T>(load: () => Promise<T>, callerDeps: DependencyList): AsyncState<T> => {
  const { i18n } = useTranslation();
  const deps = [...callerDeps, i18n.language];
  const [request, setRequest] = useState<Request>(() => ({ deps }));
  const [data, setData] = useState<T | null>(null);
  const [settled, setSettled] = useState<Settled | null>(null);

  // The caller's deps changed: start a new request (state set during render, not in an effect).
  if (!sameDeps(request.deps, deps)) {
    setRequest({ deps });
  }

  useEffect(() => {
    let cancelled = false;
    load()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setSettled({ request, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSettled({ request, error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; the request decides when to load again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const reload = useCallback(() => setRequest((current) => ({ deps: current.deps })), []);
  // Loading until the current request has finished; an older request's error no longer shows.
  const current = settled?.request === request;

  return { data, error: current ? settled.error : null, loading: !current, reload };
};
