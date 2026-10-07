import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal async data hook: loading / error / data + refetch.
 * Guards against state updates after unmount.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (mounted.current) setData(d);
      })
      .catch((e: Error) => {
        if (mounted.current) setError(e.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    setLoading(true);
    return fnRef
      .current()
      .then((d) => {
        setData(d);
        setError(null);
        return d;
      })
      .catch((e: Error) => {
        setError(e.message);
        throw e;
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error, refetch };
}

export function formatMatchScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function stipendLabel(job: { stipendMin: number | null; stipendMax: number | null; salaryMinLpa: number | null; salaryMaxLpa: number | null }): string {
  if (job.stipendMin || job.stipendMax) {
    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
    return job.stipendMin && job.stipendMax && job.stipendMin !== job.stipendMax
      ? `${fmt(job.stipendMin)}–${fmt(job.stipendMax)}/mo`
      : `${fmt(job.stipendMax ?? job.stipendMin ?? 0)}/mo`;
  }
  if (job.salaryMinLpa || job.salaryMaxLpa) {
    return job.salaryMinLpa && job.salaryMaxLpa && job.salaryMinLpa !== job.salaryMaxLpa
      ? `${job.salaryMinLpa}–${job.salaryMaxLpa} LPA`
      : `${job.salaryMaxLpa ?? job.salaryMinLpa} LPA`;
  }
  return 'Stipend/salary not disclosed';
}

export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T23:59:59' : ''));
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
