import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["caption", "ui", "heading", "title", "balance"] }] } },
});

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

// Protocol raw units are u128 with 1 BRN/TRST = 10^18 raw. u128 exceeds
// Number's 2^53 safe-integer range, so format with pure string math —
// Number(raw) silently corrupts anything above ~0.009 tokens.
export function formatAmount(raw: string): string {
  if (!raw || !/^\d+$/.test(raw)) return raw || "0";
  const padded = raw.padStart(19, "0");
  const integer = padded.slice(0, -18) || "0";
  const decimal = padded.slice(-18).slice(0, 6).replace(/0+$/, "");
  if (/^0+$/.test(integer) && !decimal && /[1-9]/.test(raw)) return "<0.000001";
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal ? `${grouped}.${decimal}` : grouped;
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
  if (secs === Number(18446744073709551615n)) return "No expiry";
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

export function formatTimestamp(ts: number | null): string {
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
