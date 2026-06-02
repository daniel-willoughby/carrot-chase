/**
 * IndexedDB-backed queue for offline event-result commits.
 *
 * The on-site event use case: a Lead is recording finishes outdoors with weak
 * or no signal. They must be able to complete the flow and trust that results
 * will reach the server eventually. This queue is the durability layer.
 *
 * Shape: each entry is {id, eventId, finishers, queuedAt}. `id` is auto-gen.
 */

import type { Finisher } from "@/app/dashboard/lead/events/[id]/run/actions";

const DB_NAME = "carrot-chase";
const DB_VERSION = 1;
const STORE = "result_queue";

export type QueueEntry = {
  id: number;
  eventId: string;
  finishers: Finisher[];
  queuedAt: number;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueResult(
  eventId: string,
  finishers: Finisher[],
): Promise<number> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.add({
      eventId,
      finishers,
      queuedAt: Date.now(),
    });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function listQueue(): Promise<QueueEntry[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Wipe every queued result. Called on sign-out so a shared school device
 * doesn't retain children's names/times in IndexedDB after a user leaves.
 * Best-effort: a failure here must never block logout.
 */
export async function clearQueue(): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}
