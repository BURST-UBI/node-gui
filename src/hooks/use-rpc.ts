import { useState, useEffect, useCallback, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RpcUrlState {
  rpcUrl: string;
  setRpcUrl: (url: string) => void;
}

const useRpcStore = create<RpcUrlState>()(persist((set) => ({
  rpcUrl: "http://127.0.0.1:7077",
  setRpcUrl: (rpcUrl) => set({ rpcUrl }),
}), {
  name: "burst-node-connection",
  partialize: ({ rpcUrl }) => ({ rpcUrl }),
}));

export function useRpcUrl() {
  return useRpcStore();
}

interface UseRpcResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRpc<T>(
  command: string,
  params: Record<string, unknown> | null,
  interval?: number,
): UseRpcResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(params !== null);
  const [error, setError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const paramsKey = JSON.stringify(params);
  const requestId = useRef(0);
  const mounted = useRef(false);
  const inFlight = useRef<number | null>(null);

  const fetchData = useCallback(async () => {
    const p = paramsRef.current;
    if (!p || !mounted.current || inFlight.current !== null) return;
    const id = ++requestId.current;
    inFlight.current = id;
    setLoading(true);
    try {
      if (!isTauri()) throw new Error("This dashboard uses the desktop runtime. Start it with npm run tauri dev; npm run dev is a visual preview only.");
      const result = await invoke<T>(command, p);
      if (!mounted.current || id !== requestId.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (mounted.current && id === requestId.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (inFlight.current === id) inFlight.current = null;
      if (mounted.current && id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, paramsKey]);

  useEffect(() => {
    mounted.current = true;
    setData(null);
    setError(null);
    if (!paramsRef.current) {
      setLoading(false);
    } else {
      fetchData();
    }
    const timer = paramsRef.current && interval && interval > 0 ? setInterval(fetchData, interval) : undefined;
    return () => {
      mounted.current = false;
      ++requestId.current;
      inFlight.current = null;
      clearInterval(timer);
    };
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}
