"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { POINTS } from "@/lib/points";
import { localDateKey } from "@/lib/dates";
import Shell, { Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import type { Habit } from "@/lib/types";

function todayStr() {
  return localDateKey();
}

export default function HabitsPage() {
  const { loading, userId, profile, partner, roomId } = useProfile();
  const award = useAward();
  const [mine, setMine] = useState<Habit | null>(null);
  const [theirs, setTheirs] = useState<Habit | null>(null);
  const [fetched, setFetched] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!roomId || !userId) return;
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("room_id", roomId)
      .eq("date", todayStr());
    const rows = (data ?? []) as Habit[];
    setMine(rows.find((r) => r.user_id === userId) ?? null);
    setTheirs(rows.find((r) => r.user_id !== userId) ?? null);
    setFetched(true);
  }, [roomId, userId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("habits", roomId, load);

  async function upsertMine(patch: Partial<Habit>): Promise<Habit | null> {
    if (!roomId || !userId) return null;
    const base = mine ?? {
      room_id: roomId,
      user_id: userId,
      date: todayStr(),
      exercise_done: false,
      sleep_done: false,
      water_count: 0,
    };
    const { data, error } = await supabase
      .from("habits")
      .upsert({ ...base, ...patch }, { onConflict: "user_id,date" })
      .select()
      .single();
    if (error || !data) return null;
    setMine(data as Habit);
    return data as Habit;
  }

  async function toggle(field: "exercise_done" | "sleep_done") {
    if (busy || !roomId || !userId) return;
    setBusy(true);
    const wasDone = mine?.[field] ?? false;
    const updated = await upsertMine({ [field]: !wasDone });
    if (updated && !wasDone) {
      await award(
        roomId,
        userId,
        field === "exercise_done" ? "exercise" : "sleep"
      );
    }
    setBusy(false);
  }

  async function setWater(count: number) {
    if (busy || !roomId || !userId) return;
    setBusy(true);
    const prev = mine?.water_count ?? 0;
    const next = Math.max(0, Math.min(8, count));
    const updated = await upsertMine({ water_count: next });
    if (updated && prev < 8 && next >= 8) {
      await award(roomId, userId, "water_goal");
    }
    setBusy(false);
  }

  if (loading || !fetched) {
    return (
      <Shell title="Daily habits" subtitle="Small things, every day">
        <Loading />
      </Shell>
    );
  }

  return (
    <Shell title="Daily habits" subtitle={todayStr()}>
      <SectionLabel>{profile?.name ?? "You"} (you)</SectionLabel>
      <div className="mb-6 space-y-3">
        <HabitRow
          emoji="🏃"
          label="Exercise"
          points={POINTS.exercise}
          done={mine?.exercise_done ?? false}
          onToggle={() => toggle("exercise_done")}
        />
        <HabitRow
          emoji="😴"
          label="Slept well"
          points={POINTS.sleep}
          done={mine?.sleep_done ?? false}
          onToggle={() => toggle("sleep_done")}
        />
        <div className="rounded-2xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">💧</span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Water</p>
                <p className="text-xs text-green-600">
                  {mine?.water_count ?? 0}/8 glasses · +{POINTS.water_goal} pts
                  at 8
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWater((mine?.water_count ?? 0) - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
                aria-label="One less glass"
              >
                −
              </button>
              <button
                onClick={() => setWater((mine?.water_count ?? 0) + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white"
                aria-label="One more glass"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < (mine?.water_count ?? 0) ? "bg-green-500" : "bg-neutral-100"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <SectionLabel>{partner?.name ?? "Your person"}</SectionLabel>
      {theirs ? (
        <div className="flex gap-3">
          <PartnerPill done={theirs.exercise_done} label="🏃 Exercise" />
          <PartnerPill done={theirs.sleep_done} label="😴 Sleep" />
          <PartnerPill
            done={theirs.water_count >= 8}
            label={`💧 ${theirs.water_count}/8`}
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-4 py-5 text-center text-sm text-neutral-500">
          Nothing logged yet today.
        </p>
      )}
    </Shell>
  );
}

function HabitRow({
  emoji,
  label,
  points,
  done,
  onToggle,
}: {
  emoji: string;
  label: string;
  points: number;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 p-4 text-left transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <div>
          <p
            className={`text-sm font-semibold ${
              done ? "text-neutral-400 line-through" : "text-neutral-900"
            }`}
          >
            {label}
          </p>
          <p className="text-xs text-green-600">+{points} pts</p>
        </div>
      </div>
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
          done
            ? "border-green-500 bg-green-500 text-white"
            : "border-neutral-300 text-transparent"
        }`}
      >
        ✓
      </span>
    </button>
  );
}

function PartnerPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
        done
          ? "bg-green-100 text-green-700"
          : "bg-neutral-100 text-neutral-400"
      }`}
    >
      {label} {done ? "✓" : ""}
    </span>
  );
}
