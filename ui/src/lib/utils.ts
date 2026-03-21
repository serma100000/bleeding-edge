import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAge(age: number): string {
  return age.toFixed(1);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function truncateHash(hash: string, start = 8, end = 4): string {
  if (hash.length <= start + end + 3) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function getAgeStatus(acceleration: number): 'younger' | 'ontrack' | 'accelerated' {
  if (acceleration < -2) return 'younger';
  if (acceleration > 2) return 'accelerated';
  return 'ontrack';
}

export function getAgeStatusColor(status: 'younger' | 'ontrack' | 'accelerated'): string {
  switch (status) {
    case 'younger': return 'text-chronos-younger';
    case 'ontrack': return 'text-chronos-ontrack';
    case 'accelerated': return 'text-chronos-accelerated';
  }
}
