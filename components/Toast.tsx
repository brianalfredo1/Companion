"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ToastContextValue {
  showToast: (message: string) => void;
  showPoints: (points: number, label: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showPoints: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2600);
  }, []);

  const showPoints = useCallback(
    (points: number, label: string) => {
      showToast(`✨ +${points} pts · ${label}`);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showPoints }}>
      {children}
      <div
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all duration-300 ease-out ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-16 opacity-0"
        }`}
      >
        <div className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
