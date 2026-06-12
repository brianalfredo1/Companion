"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import {
  ACTION_LABELS,
  fetchTotalPoints,
  getRankInfo,
  POINTS,
  RANKS,
} from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import type { PointsEntry } from "@/lib/types";

export default function RankPage() {
  const { loading, userId, profile, partner, roomId } = useProfile();
  const [total, setTotal] = useState<number | null>(null);
  const [log, setLog] = useState<PointsEntry[] | null>(null);

  const load = useCallback(async () => {
    if (!roomId) return;
    const [points, logRes] = await Promise.all([
      fetchTotalPoints(roomId),
      supabase
        .from("points_log")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setTotal(points);
    setLog((logRes.data ?? []) as PointsEntry[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("points_log", roomId, load);

  if (loading || total === null || !log) {
    return (
      <Shell title="Rank & points">
        <Loading />
      </Shell>
    );
  }

  const rank = getRankInfo(total);

  return (
    <Shell title="Rank & points" subtitle="Earned together">
      {/* Current rank hero */}
      <div className="mb-6 rounded-2xl border border-neutral-200 p-6 text-center">
        <p className="text-5xl">{rank.current.emoji}</p>
        <p className="mt-2 text-xl font-semibold text-neutral-900">
          {rank.current.name}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{total} points</p>
        {rank.next && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-rose-400 transition-all"
                style={{ width: `${Math.round(rank.progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {rank.toNext} pts to {rank.next.emoji} {rank.next.name}
            </p>
          </>
        )}
        {!rank.next && (
          <p className="mt-3 text-xs text-rose-500">
            Maximum rank. You two are official soulmates.
          </p>
        )}
      </div>

      {/* All ranks */}
      <SectionLabel>The journey</SectionLabel>
      <div className="mb-6 space-y-2">
        {RANKS.map((r) => {
          const reached = total >= r.min;
          const isCurrent = r.name === rank.current.name;
          return (
            <div
              key={r.name}
              className={`flex items-center justify-between rounded-2xl border p-3.5 ${
                isCurrent
                  ? "border-rose-300 bg-rose-50"
                  : "border-neutral-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xl ${reached ? "" : "grayscale opacity-40"}`}>
                  {r.emoji}
                </span>
                <p
                  className={`text-sm font-medium ${
                    reached ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {r.name}
                </p>
              </div>
              <p className="text-xs text-neutral-500">{r.min} pts</p>
            </div>
          );
        })}
      </div>

      {/* How to earn */}
      <SectionLabel>How to earn</SectionLabel>
      <div className="mb-6 rounded-2xl border border-neutral-200 p-4">
        <ul className="space-y-1.5 text-sm text-neutral-700">
          {(
            [
              ["🏃 Exercise", POINTS.exercise],
              ["😴 Good sleep", POINTS.sleep],
              ["💧 8 glasses of water", POINTS.water_goal],
              ["✅ Finish a to-do", POINTS.todo_done],
              ["💌 Send a note", POINTS.note_sent],
              ["💬 Daily question (both answer)", POINTS.daily_question],
              ["🎬 Watch together", POINTS.watched_together],
              ["🍜 Eat together", POINTS.ate_together],
              ["🕯️ Complete a date night", POINTS.date_night_completed],
              ["🗺️ Complete an adventure", POINTS.adventure_done],
              ["🎯 Goal milestone (25/50/75/100%)", POINTS.goal_milestone],
            ] as const
          ).map(([label, pts]) => (
            <li key={label} className="flex items-center justify-between">
              <span>{label}</span>
              <span className="text-xs font-medium text-rose-500">
                +{pts}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recent activity */}
      <SectionLabel>Recent activity</SectionLabel>
      {log.length === 0 ? (
        <Empty emoji="✨" text="No points yet. Go do something cute together." />
      ) : (
        <div className="space-y-2">
          {log.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200 p-3.5"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
                <p className="text-xs text-neutral-500">
                  {entry.user_id === userId
                    ? profile?.name ?? "You"
                    : partner?.name ?? "Them"}{" "}
                  ·{" "}
                  {new Date(entry.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <span className="text-sm font-semibold text-rose-500">
                +{entry.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
