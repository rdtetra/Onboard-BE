import { existsSync, mkdirSync, createReadStream } from 'fs';
import type { ReadStream } from 'fs';

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function createFileReadStream(path: string): ReadStream {
  return createReadStream(path);
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
