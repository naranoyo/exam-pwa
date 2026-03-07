// lib/storage.ts
import { get, set, del } from "idb-keyval";

export const STORAGE_KEY = "exam-pwa:v1";

/**
 * IndexedDBが使えるか（iPhone Safari / PWA 対策）
 */
function canUseIndexedDB(): boolean {
  if (typeof window === "undefined") return false;
  return typeof indexedDB !== "undefined";
}

/**
 * 保存データの読み込み
 * 優先：IndexedDB → フォールバック：LocalStorage
 */
export async function loadFromStorage<T>(): Promise<T | null> {
  if (typeof window === "undefined") return null;

  if (canUseIndexedDB()) {
    try {
      const value = await get<T>(STORAGE_KEY);
      if (value) return value;
    } catch {
      // IndexedDB失敗時はLocalStorageへ
    }
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * 保存
 * 優先：IndexedDB → フォールバック：LocalStorage
 */
export async function saveToStorage<T>(value: T): Promise<void> {
  if (typeof window === "undefined") return;

  if (canUseIndexedDB()) {
    try {
      await set(STORAGE_KEY, value);
      return;
    } catch {
      // IndexedDB失敗時はLocalStorageへ
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

/**
 * ★追加：保存データを完全初期化
 * IndexedDB / LocalStorage の両方を削除
 */
export async function clearStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  // IndexedDB
  if (canUseIndexedDB()) {
    try {
      await del(STORAGE_KEY);
    } catch {
      // 失敗しても localStorage は消す
    }
  }

  // LocalStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
