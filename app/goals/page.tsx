"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { milestonesCrossed, POINTS } from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import type { Goal } from "@/lib/types";

export default function GoalsPage() {
  const { loading, userId, roomId } = useProfile();
  const award = useAward();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setGoals((data ?? []) as Goal[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("goals", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("goals").insert({
      room_id: roomId,
      title: title.trim(),
      target_date: targetDate || null,
    });
    setTitle("");
    setTargetDate("");
    await load();
    setBusy(false);
  }

  async function bumpProgress(goal: Goal, delta: number) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    const prev = goal.progress;
    const next = Math.max(0, Math.min(100, prev + delta));
    if (next !== prev) {
      await supabase.from("goals").update({ progress: next }).eq("id", goal.id);
      const crossed = milestonesCrossed(prev, next);
      for (let i = 0; i < crossed; i++) {
        await award(roomId, userId, "goal_milestone", {
          confetti: next >= 100,
        });
      }
      await load();
    }
    setBusy(false);
  }

  async function remove(goal: Goal) {
    await supabase.from("goals").delete().eq("id", goal.id);
    load();
  }

  const active = (goals ?? []).filter((g) => g.progress < 100);
  const achieved = (goals ?? []).filter((g) => g.progress >= 100);

  return (
    <Shell title="Couple goals" subtitle="Build the future, 5% at a time">
      <form
        onSubmit={add}
        className="mb-6 space-y-2 rounded-2xl border border-neutral-200 p-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New goal (trip, savings, milestone…)"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="flex-1 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-500 outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {!goals || loading ? (
        <Loading />
      ) : goals.length === 0 ? (
        <Empty emoji="🎯" text="No goals yet. Dream something up together." />
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {active.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-neutral-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      🎯 {goal.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {goal.progress}% complete
                      {goal.target_date &&
                        ` · by ${new Date(
                          goal.target_date + "T00:00:00"
                        ).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(goal)}
                    aria-label="Delete"
                    className="text-neutral-300 hover:text-neutral-500"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-all"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] text-neutral-400">
                    +{POINTS.goal_milestone} pts at 25 / 50 / 75 / 100%
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => bumpProgress(goal, -5)}
                      disabled={busy}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 disabled:opacity-50"
                    >
                      −5%
                    </button>
                    <button
                      onClick={() => bumpProgress(goal, 5)}
                      disabled={busy}
                      className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      +5%
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {active.length === 0 && (
              <p className="text-sm text-neutral-500">
                Every goal achieved. Incredible.
              </p>
            )}
          </div>

          {achieved.length > 0 && (
            <div>
              <SectionLabel>Achieved</SectionLabel>
              <div className="space-y-2">
                {achieved.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between rounded-2xl border border-neutral-200 p-3.5"
                  >
                    <p className="text-sm text-neutral-400 line-through">
                      {goal.title}
                    </p>
                    <span className="text-lg">🏆</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}
