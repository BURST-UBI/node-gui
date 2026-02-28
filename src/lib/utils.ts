import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUptime(secs: number): string {
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatAmount(raw: string): string {
  const num = Number(raw);
  if (Number.isNaN(num)) return raw;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 20) return addr;
  return `${addr.slice(0, 12)}…${addr.slice(-8)}`;
}

export function formatExpiryPeriod(secs: number): string {
  const years = Math.floor(secs / (365.25 * 86400));
  const remaining = secs - years * 365.25 * 86400;
  const days = Math.floor(remaining / 86400);
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? "s" : ""}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? "s" : ""}`);
  if (parts.length === 0) {
    const hours = Math.floor(secs / 3600);
    if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
    const mins = Math.floor(secs / 60);
    return `${mins} minute${mins !== 1 ? "s" : ""}`;
  }
  return parts.join(", ");
}

export function formatTimestamp(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  return `${Math.floor(secs / 86400)}d ${Math.floor((secs % 86400) / 3600)}h`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
