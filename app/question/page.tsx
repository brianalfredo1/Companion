"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { questionForDate, todayKey } from "@/lib/questions";
import { POINTS } from "@/lib/points";
import { useAward } from "@/components/useAward";
import Shell, { Loading, SectionLabel } from "@/components/Shell";

interface Answer {
  id: string;
  user_id: string;
  date: string;
  answer: string;
}

export default function QuestionPage() {
  const { loading, userId, profile, partner, roomId } = useProfile();
  const award = useAward();
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [history, setHistory] = useState<Answer[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const today = todayKey();
  const question = questionForDate(today);

  const load = useCallback(async () => {
    if (!roomId) return;
    const [todayRes, historyRes] = await Promise.all([
      supabase
        .from("question_answers")
        .select("id, user_id, date, answer")
        .eq("room_id", roomId)
        .eq("date", today),
      supabase
        .from("question_answers")
        .select("id, user_id, date, answer")
        .eq("room_id", roomId)
        .neq("date", today)
        .order("date", { ascending: false })
        .limit(20),
    ]);
    setAnswers((todayRes.data ?? []) as Answer[]);
    setHistory((historyRes.data ?? []) as Answer[]);
  }, [roomId, today]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("question_answers", roomId, load);

  const mine = answers?.find((a) => a.user_id === userId) ?? null;
  const theirs = answers?.find((a) => a.user_id !== userId) ?? null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !userId || !draft.trim() || busy || mine) return;
    setBusy(true);
    const { error } = await supabase.from("question_answers").insert({
      room_id: roomId,
      user_id: userId,
      date: today,
      answer: draft.trim(),
    });
    if (!error) {
      setDraft("");
      // The second person to answer completes the question for both.
      if (theirs) {
        await award(roomId, userId, "daily_question", { confetti: true });
      }
      await load();
    }
    setBusy(false);
  }

  // Group history answers by date, keeping only days where both answered.
  const pastDays = (() => {
    if (!history) return [];
    const byDate = new Map<string, Answer[]>();
    for (const a of history) {
      byDate.set(a.date, [...(byDate.get(a.date) ?? []), a]);
    }
    return Array.from(byDate.entries())
      .filter(([, list]) => list.length >= 2)
      .slice(0, 7);
  })();

  if (loading || !answers) {
    return (
      <Shell title="Question of the day">
        <Loading />
      </Shell>
    );
  }

  return (
    <Shell title="Question of the day" subtitle="One question, two answers">
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5 text-center">
        <p className="text-xs uppercase tracking-widest text-indigo-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <p className="mt-2 text-base font-semibold text-indigo-950">
          {question}
        </p>
      </div>

      {!mine ? (
        <form onSubmit={submit} className="mb-6 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Your answer… (revealed once you both answer)"
            rows={3}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="w-full rounded-full bg-indigo-600 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy
              ? "Saving…"
              : theirs
                ? `Answer & reveal both +${POINTS.daily_question} pts`
                : "Submit answer"}
          </button>
          {theirs && (
            <p className="text-center text-xs text-neutral-500">
              {partner?.name ?? "Your person"} already answered — yours unlocks
              both 👀
            </p>
          )}
        </form>
      ) : (
        <div className="mb-6 space-y-3">
          <AnswerCard name={`${profile?.name ?? "You"} (you)`} text={mine.answer} />
          {theirs ? (
            <AnswerCard name={partner?.name ?? "Them"} text={theirs.answer} />
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-5 text-center text-sm text-neutral-500">
              Waiting for {partner?.name ?? "your person"} to answer…
            </div>
          )}
        </div>
      )}

      {pastDays.length > 0 && (
        <div>
          <SectionLabel>Past questions</SectionLabel>
          <div className="space-y-3">
            {pastDays.map(([date, list]) => (
              <div
                key={date}
                className="rounded-2xl border border-neutral-200 p-4"
              >
                <p className="text-xs text-neutral-400">
                  {new Date(date + "T00:00:00").toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="mt-1 text-sm font-semibold text-neutral-900">
                  {questionForDate(date)}
                </p>
                <div className="mt-2 space-y-1.5">
                  {list.map((a) => (
                    <p key={a.id} className="text-sm text-neutral-600">
                      <span className="font-medium text-indigo-600">
                        {a.user_id === userId
                          ? profile?.name ?? "You"
                          : partner?.name ?? "Them"}
                        :
                      </span>{" "}
                      {a.answer}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function AnswerCard({ name, text }: { name: string; text: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4">
      <p className="text-xs font-medium text-indigo-600">{name}</p>
      <p className="mt-1 text-sm text-neutral-900">{text}</p>
    </div>
  );
}
