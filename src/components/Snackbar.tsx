"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

export type SnackbarTone = "success" | "error" | "info";

type SnackbarItem = {
  id: string;
  message: string;
  tone: SnackbarTone;
};

type ShowOptions = {
  tone?: SnackbarTone;
  durationMs?: number;
};

type SnackbarApi = {
  show: (message: string, options?: ShowOptions) => void;
  success: (message: string, durationMs?: number) => void;
  error: (message: string, durationMs?: number) => void;
  info: (message: string, durationMs?: number) => void;
};

const SnackbarContext = createContext<SnackbarApi | null>(null);

const DEFAULT_DURATION = 3600;
const MAX_VISIBLE = 3;

function toneIcon(tone: SnackbarTone) {
  if (tone === "success") return CheckCircle2;
  if (tone === "error") return CircleAlert;
  return Info;
}

export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<SnackbarItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ShowOptions) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tone = options?.tone ?? "info";
      const durationMs = options?.durationMs ?? DEFAULT_DURATION;

      setItems((prev) => {
        const next = [...prev, { id, message: trimmed, tone }];
        return next.slice(-MAX_VISIBLE);
      });

      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const api = useMemo<SnackbarApi>(
    () => ({
      show,
      success: (message, durationMs) => show(message, { tone: "success", durationMs }),
      error: (message, durationMs) => show(message, { tone: "error", durationMs }),
      info: (message, durationMs) => show(message, { tone: "info", durationMs }),
    }),
    [show]
  );

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div className="snackbar-host" aria-live="polite" aria-relevant="additions text">
        {items.map((item) => {
          const Icon = toneIcon(item.tone);
          return (
            <div
              key={item.id}
              className={`snackbar snackbar-${item.tone}`}
              role={item.tone === "error" ? "alert" : "status"}
            >
              <Icon size={22} strokeWidth={2.4} className="snackbar-icon shrink-0" aria-hidden />
              <p className="snackbar-message">{item.message}</p>
              <button
                type="button"
                className="snackbar-dismiss"
                aria-label="Dismiss"
                onClick={() => dismiss(item.id)}
              >
                <X size={16} strokeWidth={2.75} />
              </button>
            </div>
          );
        })}
      </div>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within SnackbarProvider");
  }
  return ctx;
}
