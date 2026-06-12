"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { fetchTotalPoints, getRankInfo } from "@/lib/points";
import { SectionLabel } from "@/components/Shell";
import type { Countdown, DateNight, Goal, Note } from "@/lib/types";

interface DashboardData {
  totalPoints: number;
  unreadNote: Note | null;
  habitsDoneToday: number;
  openTodos: number;
  eatIdeas: number;
  nextDateNight: DateNight | null;
  nextCountdown: Countdown | null;
  watchlistPending: number;
  topGoal: Goal | null;
  adventuresDone: number;
  adventuresTotal: number;
  firstDay: string | null;
  questionAnsweredByMe: boolean;
  questionAnsweredByThem: boolean;
}

export default function DashboardPage() {
  const { loading, userId, profile, partner, roomId } = useProfile();
  const [data, setData] = useState<DashboardData | null>(null);

  const load = useCallback(async () => {
    if (!roomId || !userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const [
      points,
      noteRes,
      habitRes,
      todoRes,
      eatRes,
      dateRes,
      countdownRes,
      watchRes,
      goalRes,
      advRes,
      profileRes,
      questionRes,
    ] = await Promise.all([
      fetchTotalPoints(roomId),
      supabase
        .from("notes")
        .select("*")
        .eq("room_id", roomId)
        .neq("from_user_id", userId)
        .eq("seen", false)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("habits")
        .select("exercise_done, sleep_done, water_count")
        .eq("room_id", roomId)
        .eq("user_id", userId)
        .eq("date", today),
      supabase
        .from("todos")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("done", false),
      supabase
        .from("eat_list")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("visited_together", false),
      supabase
        .from("date_nights")
        .select("*")
        .eq("room_id", roomId)
        .eq("completed", false)
        .order("scheduled_at", { ascending: true })
        .limit(1),
      supabase
        .from("countdowns")
        .select("*")
        .eq("room_id", roomId)
        .gte("target_date", today)
        .order("target_date", { ascending: true })
        .limit(1),
      supabase
        .from("watchlist")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("watched_together", false),
      supabase
        .from("goals")
        .select("*")
        .eq("room_id", roomId)
        .lt("progress", 100)
        .order("progress", { ascending: false })
        .limit(1),
      supabase.from("adventures").select("done").eq("room_id", roomId),
      supabase
        .from("profiles")
        .select("created_at")
        .eq("couple_room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(1),
      supabase
        .from("question_answers")
        .select("user_id")
        .eq("room_id", roomId)
        .eq("date", today),
    ]);

    const habit = habitRes.data?.[0];
    const habitsDone =
      (habit?.exercise_done ? 1 : 0) +
      (habit?.sleep_done ? 1 : 0) +
      ((habit?.water_count ?? 0) >= 8 ? 1 : 0);
    const adventures = advRes.data ?? [];

    setData({
      totalPoints: points,
      unreadNote: noteRes.data?.[0] ?? null,
      habitsDoneToday: habitsDone,
      openTodos: todoRes.count ?? 0,
      eatIdeas: eatRes.count ?? 0,
      nextDateNight: dateRes.data?.[0] ?? null,
      nextCountdown: countdownRes.data?.[0] ?? null,
      watchlistPending: watchRes.count ?? 0,
      topGoal: goalRes.data?.[0] ?? null,
      adventuresDone: adventures.filter((a) => a.done).length,
      adventuresTotal: adventures.length,
      firstDay: profileRes.data?.[0]?.created_at ?? null,
      questionAnsweredByMe: (questionRes.data ?? []).some(
        (a) => a.user_id === userId
      ),
      questionAnsweredByThem: (questionRes.data ?? []).some(
        (a) => a.user_id !== userId
      ),
    });
  }, [roomId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data || !profile) {
    return (
      <div className="min-h-screen bg-neutral-100">
        <div className="mx-auto min-h-screen max-w-[430px] space-y-4 bg-white px-5 pt-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-neutral-100"
            />
          ))}
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const daysTogether = data.firstDay
    ? Math.max(
        1,
        Math.floor(
          (Date.now() - new Date(data.firstDay).getTime()) / 86400000
        ) + 1
      )
    : 1;
  const names = partner
    ? `${profile.name} & ${partner.name}`
    : profile.name;
  const rank = getRankInfo(data.totalPoints);
  const daysUntil = (d: string) =>
    Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="mx-auto min-h-screen max-w-[430px] bg-white px-5 pb-16 pt-8">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              {greeting}, {profile.name}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {names} · day {daysTogether} together
            </p>
          </div>
          <div className="flex -space-x-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white ring-2 ring-white">
              {profile.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400 text-sm font-semibold text-white ring-2 ring-white">
              {(partner?.name ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Rank card */}
        <Link
          href="/rank"
          className="mb-7 block rounded-2xl border border-neutral-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{rank.current.emoji}</span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {rank.current.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {data.totalPoints} pts
                  {rank.next && ` · ${rank.toNext} to ${rank.next.name}`}
                </p>
              </div>
            </div>
            <span className="text-neutral-400">›</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-rose-400 transition-all"
              style={{ width: `${Math.round(rank.progress * 100)}%` }}
            />
          </div>
        </Link>

        {/* TODAY */}
        <section className="mb-7">
          <SectionLabel>Today</SectionLabel>
          <div className="space-y-3">
            {data.unreadNote && (
              <Link
                href="/notes"
                className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
              >
                <span>💌</span>
                <span className="truncate">
                  {partner?.name ?? "Your person"}: “{data.unreadNote.message}”
                </span>
              </Link>
            )}
            <DashCard
              href="/question"
              emoji="💬"
              accent="text-indigo-600"
              title="Question of the day"
              detail={
                data.questionAnsweredByMe && data.questionAnsweredByThem
                  ? "Both answered ✓"
                  : data.questionAnsweredByMe
                    ? `Waiting for ${partner?.name ?? "your person"}…`
                    : data.questionAnsweredByThem
                      ? `${partner?.name ?? "Your person"} answered — your turn!`
                      : "Answer today's question"
              }
            />
            <DashCard
              href="/habits"
              emoji="🌿"
              accent="text-green-600"
              title="Daily habits"
              detail={`${data.habitsDoneToday}/3 done today`}
            />
            <DashCard
              href="/todos"
              emoji="✅"
              accent="text-blue-600"
              title="To-do list"
              detail={
                data.openTodos === 0
                  ? "All clear"
                  : `${data.openTodos} open task${data.openTodos === 1 ? "" : "s"}`
              }
            />
            <DashCard
              href="/eat"
              emoji="🍜"
              accent="text-amber-600"
              title="What do we eat?"
              detail={
                data.eatIdeas === 0
                  ? "Add a craving"
                  : `${data.eatIdeas} place${data.eatIdeas === 1 ? "" : "s"} to try`
              }
            />
            <DashCard
              href="/date-night"
              emoji="🕯️"
              accent="text-rose-600"
              title="Date night"
              detail={
                data.nextDateNight
                  ? data.nextDateNight.scheduled_at
                    ? `${data.nextDateNight.title} · in ${daysUntil(data.nextDateNight.scheduled_at)} days`
                    : data.nextDateNight.title
                  : "Plan the next one"
              }
            />
          </div>
        </section>

        {/* SOON */}
        <section className="mb-7">
          <SectionLabel>Soon</SectionLabel>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <Link
              href="/countdowns"
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <p className="text-2xl font-semibold text-neutral-900">
                {data.nextCountdown
                  ? daysUntil(data.nextCountdown.target_date)
                  : "—"}
              </p>
              <p className="mt-1 truncate text-xs text-neutral-500">
                {data.nextCountdown
                  ? `days until ${data.nextCountdown.label}`
                  : "no countdown yet"}
              </p>
            </Link>
            <Link
              href="/countdowns"
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <p className="text-2xl font-semibold text-neutral-900">
                {daysTogether}
              </p>
              <p className="mt-1 text-xs text-neutral-500">days together</p>
            </Link>
          </div>
          <DashCard
            href="/watchlist"
            emoji="🎬"
            accent="text-purple-600"
            title="Watchlist"
            detail={
              data.watchlistPending === 0
                ? "Nothing queued"
                : `${data.watchlistPending} to watch together`
            }
          />
        </section>

        {/* OUR GOALS */}
        <section className="mb-7">
          <SectionLabel>Our goals</SectionLabel>
          <Link
            href="/goals"
            className="block rounded-2xl border border-neutral-200 p-4"
          >
            {data.topGoal ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-neutral-900">
                    🎯 {data.topGoal.title}
                  </p>
                  <span className="text-xs text-neutral-500">
                    {data.topGoal.progress}%
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900 transition-all"
                    style={{ width: `${data.topGoal.progress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-500">
                🎯 Set your first couple goal
              </p>
            )}
          </Link>
        </section>

        {/* SOMEDAY */}
        <section className="mb-6">
          <SectionLabel>Someday</SectionLabel>
          <DashCard
            href="/adventures"
            emoji="🗺️"
            accent="text-neutral-600"
            title="Our adventures"
            detail={
              data.adventuresTotal === 0
                ? "Start the bucket list"
                : `${data.adventuresDone}/${data.adventuresTotal} completed`
            }
          />
        </section>

        <button
          onClick={() => supabase.auth.signOut()}
          className="mx-auto block text-xs text-neutral-400 underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function DashCard({
  href,
  emoji,
  title,
  detail,
  accent,
}: {
  href: string;
  emoji: string;
  title: string;
  detail: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-neutral-200 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{emoji}</span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{title}</p>
          <p className={`text-xs ${accent}`}>{detail}</p>
        </div>
      </div>
      <span className="text-neutral-400">›</span>
    </Link>
  );
}
