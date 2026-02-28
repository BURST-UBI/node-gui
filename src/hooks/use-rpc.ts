import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";

interface RpcUrlState {
  rpcUrl: string;
  setRpcUrl: (url: string) => void;
}

const useRpcStore = create<RpcUrlState>((set) => ({
  rpcUrl: "http://127.0.0.1:7077",
  setRpcUrl: (rpcUrl) => set({ rpcUrl }),
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const paramsKey = JSON.stringify(params);

  const fetchData = useCallback(async () => {
    const p = paramsRef.current;
    if (!p) return;
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<T>(command, p);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, paramsKey]);

  useEffect(() => {
    if (!paramsRef.current) {
      setData(null);
      setLoading(false);
      return;
    }
    fetchData();
    if (interval) {
      const id = setInterval(fetchData, interval);
      return () => clearInterval(id);
    }
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
}
