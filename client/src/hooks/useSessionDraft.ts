import { useCallback, useEffect, useRef, useState } from "react";

type DraftRecord = Record<string, unknown>;

function hasDraftContent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.some(hasDraftContent);
  if (value && typeof value === "object") return Object.values(value).some(hasDraftContent);
  return false;
}

export function readSessionDraft<T extends DraftRecord>(rawValue: string | null, fallback: T) {
  if (!rawValue) return { value: fallback, restored: false };
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { value: fallback, restored: false };
    const value = { ...fallback, ...parsed } as T;
    return { value, restored: hasDraftContent(value) };
  } catch {
    return { value: fallback, restored: false };
  }
}

function readFromSessionStorage(key: string) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

function writeToSessionStorage(key: string, value: DraftRecord) {
  try {
    if (hasDraftContent(value)) window.sessionStorage.setItem(key, JSON.stringify(value));
    else window.sessionStorage.removeItem(key);
  } catch {
    // Browsers may block storage in privacy modes; the form remains usable without a draft.
  }
}

function removeFromSessionStorage(key: string) {
  try { window.sessionStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
}

export function useSessionDraft<T extends DraftRecord>({ storageKey, initialValue }: { storageKey: string; initialValue: T }) {
  const initialValueRef = useRef(initialValue);
  const [value, setValue] = useState<T>(initialValue);
  const [restored, setRestored] = useState(false);
  const [loadedKey, setLoadedKey] = useState("");

  useEffect(() => {
    const draft = readSessionDraft(readFromSessionStorage(storageKey), initialValueRef.current);
    setValue(draft.value);
    setRestored(draft.restored);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    writeToSessionStorage(storageKey, value);
  }, [loadedKey, storageKey, value]);

  const discardDraft = useCallback(() => {
    removeFromSessionStorage(storageKey);
    setValue(initialValueRef.current);
    setRestored(false);
  }, [storageKey]);

  return { value, setValue, restored, discardDraft, clearDraft: discardDraft };
}
