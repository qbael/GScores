import { useEffect, useState } from "react";

export interface RequestError {
  status: number;
  message: string;
}
export interface RequestState<T> {
  data?: T;
  error?: RequestError;
  loading: boolean;
  retry: () => void;
}

export function useRequest<T>(url: string | null): RequestState<T> {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    url: string | null;
    data?: T;
    error?: RequestError;
    loading: boolean;
  }>({ url, loading: !!url });
  useEffect(() => {
    if (!url) {
      setState({ url, loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ url, loading: true });
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          if (!controller.signal.aborted)
            setState({
              url,
              loading: false,
              error: {
                status: response.status,
                message: body.message ?? "Unable to load data. Please retry.",
              },
            });
          return;
        }
        const data = (await response.json()) as T;
        if (!controller.signal.aborted) setState({ url, loading: false, data });
      } catch {
        if (!controller.signal.aborted)
          setState({
            url,
            loading: false,
            error: {
              status: 0,
              message: "The data connection is unavailable. Please retry.",
            },
          });
      }
    })();
    return () => controller.abort();
  }, [url, attempt]);
  return {
    ...(state.url === url ? state : { loading: !!url }),
    retry: () => setAttempt((value) => value + 1),
  };
}
