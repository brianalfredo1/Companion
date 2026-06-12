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
  celebrate: (message?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  showPoints: () => {},
  celebrate: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  emoji: string | null;
  color: string;
  size: number;
}

const CONFETTI_COLORS = ["#fb7185", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"];
const CONFETTI_EMOJIS = ["🤍", "💖", "✨"];

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const celebrate = useCallback(
    (msg?: string) => {
      const now = Date.now();
      setPieces(
        Array.from({ length: 50 }, (_, i) => ({
          id: now + i,
          left: Math.random() * 100,
          delay: Math.random() * 0.6,
          duration: 2 + Math.random() * 1.5,
          emoji:
            Math.random() < 0.18
              ? CONFETTI_EMOJIS[
                  Math.floor(Math.random() * CONFETTI_EMOJIS.length)
                ]
              : null,
          color:
            CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: 6 + Math.random() * 6,
        }))
      );
      if (confettiTimer.current) clearTimeout(confettiTimer.current);
      confettiTimer.current = setTimeout(() => setPieces([]), 4200);
      if (msg) showToast(msg);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showPoints, celebrate }}>
      {children}
      {pieces.length > 0 && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
        >
          {pieces.map((p) =>
            p.emoji ? (
              <span
                key={p.id}
                className="confetti-piece absolute top-0"
                style={{
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  fontSize: `${p.size + 8}px`,
                }}
              >
                {p.emoji}
              </span>
            ) : (
              <span
                key={p.id}
                className="confetti-piece absolute top-0 rounded-sm"
                style={{
                  left: `${p.left}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  backgroundColor: p.color,
                  width: `${p.size}px`,
                  height: `${p.size * 0.6}px`,
                }}
              />
            )
          )}
        </div>
      )}
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
