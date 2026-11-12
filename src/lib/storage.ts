import { defaultData } from "./defaults";
import { dataSchema, type Data } from "./schema";

/**
 * Persistence layer. The app only talks to `StorageAdapter`, so localStorage can later be swapped
 * for IndexedDB or a remote database without touching the store.
 */
export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const localAdapter: StorageAdapter = {
  async read(key) {
    return window.localStorage.getItem(key);
  },
  async write(key, value) {
    window.localStorage.setItem(key, value);
  },
  async remove(key) {
    window.localStorage.removeItem(key);
  },
};

const KEY = "focusos:data";
const BACKUP_KEY = "focusos:backups";
const CORRUPT_KEY = "focusos:corrupt";
export const THEME_KEY = "focusos:theme";
export const CURRENT_VERSION = 1;

interface Envelope {
  app: "focus-os";
  version: number;
  savedAt: number;
  data: unknown;
}

/** migrations[n] upgrades data from version n to n + 1. */
const migrations: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

const upgrade = (env: Envelope): unknown => {
  let data = env.data as Record<string, unknown>;
  for (let v = env.version; v < CURRENT_VERSION; v++) data = migrations[v]?.(data) ?? data;
  return data;
};

export type ParseResult = { ok: true; data: Data } | { ok: false; error: string };

export const parseEnvelope = (raw: string): ParseResult => {
  let env: Envelope;
  try {
    env = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Plik nie jest poprawnym JSON-em." };
  }
  if (!env || env.app !== "focus-os" || typeof env.version !== "number")
    return { ok: false, error: "To nie jest kopia danych FOCUS OS." };
  if (env.version > CURRENT_VERSION)
    return { ok: false, error: "Kopia pochodzi z nowszej wersji aplikacji." };
  const parsed = dataSchema.safeParse(upgrade(env));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Niepoprawna struktura danych (${issue.path.join(".")}: ${issue.message}).` };
  }
  return { ok: true, data: parsed.data };
};

export const serialize = (data: Data): string =>
  JSON.stringify({ app: "focus-os", version: CURRENT_VERSION, savedAt: Date.now(), data } satisfies Envelope);

export interface LoadResult {
  data: Data;
  /** Set when stored data could not be read; the raw copy is kept under a separate key. */
  error?: string;
}

export const loadData = async (adapter: StorageAdapter = localAdapter): Promise<LoadResult> => {
  try {
    const raw = await adapter.read(KEY);
    if (!raw) return { data: defaultData() };
    const res = parseEnvelope(raw);
    if (res.ok) return { data: res.data };
    await adapter.write(CORRUPT_KEY, raw);
    return { data: defaultData(), error: res.error };
  } catch {
    return { data: defaultData(), error: "Brak dostępu do pamięci przeglądarki — dane nie będą zapisywane." };
  }
};

export const saveData = async (data: Data, adapter: StorageAdapter = localAdapter): Promise<boolean> => {
  try {
    await adapter.write(KEY, serialize(data));
    return true;
  } catch {
    return false;
  }
};

export interface BackupEntry {
  at: number;
  payload: string;
}

export const listBackups = async (adapter: StorageAdapter = localAdapter): Promise<BackupEntry[]> => {
  try {
    const raw = await adapter.read(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as BackupEntry[]) : [];
  } catch {
    return [];
  }
};

/** Keeps the three most recent local snapshots. */
export const createBackup = async (data: Data, adapter: StorageAdapter = localAdapter): Promise<boolean> => {
  try {
    const list = await listBackups(adapter);
    const next = [{ at: Date.now(), payload: serialize(data) }, ...list].slice(0, 3);
    await adapter.write(BACKUP_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
};

export const clearAll = async (adapter: StorageAdapter = localAdapter): Promise<void> => {
  await adapter.remove(KEY);
};
