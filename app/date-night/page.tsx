"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { awardPoints, POINTS } from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import type { ChecklistItem, DateNight } from "@/lib/types";

export default function DateNightPage() {
  const { loading, userId, roomId } = useProfile();
  const { showPoints } = useToast();
  const [dates, setDates] = useState<DateNight[] | null>(null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [checklistDrafts, setChecklistDrafts] = useState<
    Record<string, string>
  >({});

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("date_nights")
      .select("*")
      .eq("room_id", roomId)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    setDates((data ?? []) as DateNight[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("date_nights", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("date_nights").insert({
      room_id: roomId,
      title: title.trim(),
      scheduled_at: when ? new Date(when).toISOString() : null,
    });
    setTitle("");
    setWhen("");
    await load();
    setBusy(false);
  }

  async function updateChecklist(date: DateNight, checklist: ChecklistItem[]) {
    await supabase
      .from("date_nights")
      .update({ checklist })
      .eq("id", date.id);
    load();
  }

  async function addChecklistItem(date: DateNight) {
    const text = (checklistDrafts[date.id] ?? "").trim();
    if (!text) return;
    setChecklistDrafts((d) => ({ ...d, [date.id]: "" }));
    await updateChecklist(date, [
      ...(date.checklist ?? []),
      { text, done: false },
    ]);
  }

  async function toggleChecklistItem(date: DateNight, index: number) {
    const checklist = (date.checklist ?? []).map((item, i) =>
      i === index ? { ...item, done: !item.done } : item
    );
    await updateChecklist(date, checklist);
  }

  async function complete(date: DateNight) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    await supabase
      .from("date_nights")
      .update({ completed: true })
      .eq("id", date.id);
    await awardPoints(roomId, userId, "date_night_completed");
    showPoints(POINTS.date_night_completed, "Date night completed");
    await load();
    setBusy(false);
  }

  async function remove(date: DateNight) {
    await supabase.from("date_nights").delete().eq("id", date.id);
    load();
  }

  const upcoming = (dates ?? []).filter((d) => !d.completed);
  const past = (dates ?? []).filter((d) => d.completed);

  return (
    <Shell title="Date night" subtitle="Plan it, then live it">
      <form
        onSubmit={add}
        className="mb-6 space-y-2 rounded-2xl border border-neutral-200 p-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Date night idea…"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-rose-400"
        />
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="flex-1 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-500 outline-none focus:border-rose-400"
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-rose-500 px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Plan
          </button>
        </div>
      </form>

      {!dates || loading ? (
        <Loading />
      ) : dates.length === 0 ? (
        <Empty emoji="🕯️" text="No date nights planned. Fix that immediately." />
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-neutral-500">
                Nothing planned — time for a new idea.
              </p>
            )}
            {upcoming.map((date) => (
              <div
                key={date.id}
                className="rounded-2xl border border-neutral-200 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      🕯️ {date.title}
                    </p>
                    <p className="text-xs text-rose-600">
                      {date.scheduled_at
                        ? new Date(date.scheduled_at).toLocaleString(
                            undefined,
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Not scheduled yet"}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(date)}
                    aria-label="Delete"
                    className="text-neutral-300 hover:text-neutral-500"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-3 space-y-1.5">
                  {(date.checklist ?? []).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => toggleChecklistItem(date, i)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                          item.done
                            ? "border-rose-500 bg-rose-500 text-white"
                            : "border-neutral-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-sm ${
                          item.done
                            ? "text-neutral-400 line-through"
                            : "text-neutral-700"
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      value={checklistDrafts[date.id] ?? ""}
                      onChange={(e) =>
                        setChecklistDrafts((d) => ({
                          ...d,
                          [date.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addChecklistItem(date);
                        }
                      }}
                      placeholder="Add checklist item…"
                      className="flex-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs outline-none focus:border-rose-400"
                    />
                    <button
                      onClick={() => addChecklistItem(date)}
                      className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => complete(date)}
                  disabled={busy}
                  className="mt-4 w-full rounded-full bg-rose-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  We did it! +{POINTS.date_night_completed} pts
                </button>
              </div>
            ))}
          </div>

          {past.length > 0 && (
            <div>
              <SectionLabel>Memories</SectionLabel>
              <div className="space-y-2">
                {past.map((date) => (
                  <div
                    key={date.id}
                    className="flex items-center justify-between rounded-2xl border border-neutral-200 p-3.5"
                  >
                    <div>
                      <p className="text-sm text-neutral-400 line-through">
                        {date.title}
                      </p>
                      {date.scheduled_at && (
                        <p className="text-xs text-neutral-400">
                          {new Date(date.scheduled_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="text-lg">💖</span>
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
