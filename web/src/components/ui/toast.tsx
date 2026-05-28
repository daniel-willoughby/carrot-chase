"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; msg: string; type: ToastType };

type ToastApi = (msg: string, type?: ToastType) => void;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback<ToastApi>((msg, type = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        className="pointer-events-none fixed right-4 z-[9000] flex flex-col gap-2"
        style={{ bottom: 88 }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="slide-in-toast flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white"
            style={{
              background: t.type === "error" ? "var(--danger)" : "#1a1a1a",
              boxShadow: "0 4px 20px rgba(0,0,0,0.22)",
              maxWidth: 280,
            }}
          >
            <span className="text-[15px]">
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/** Drop-in helper for callers that just want to fire a toast without needing the hook context. */
export function useFlash(msg: string | null, type: ToastType = "success") {
  const show = useToast();
  useEffect(() => {
    if (msg) show(msg, type);
  }, [msg, type, show]);
}
