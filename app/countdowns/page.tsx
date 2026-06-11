"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import Shell, { Empty, Loading } from "@/components/Shell";
import type { Countdown } from "@/lib/types";

export default function CountdownsPage() {
  const { loading, roomId } = useProfile();
  const [items, setItems] = useState<Countdown[] | null>(null);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("countdowns")
      .select("*")
      .eq("room_id", roomId)
      .order("target_date", { ascending: true });
    setItems((data ?? []) as Countdown[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("countdowns", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !label.trim() || !date || busy) return;
    setBusy(true);
    await supabase.from("countdowns").insert({
      room_id: roomId,
      label: label.trim(),
      target_date: date,
    });
    setLabel("");
    setDate("");
    await load();
    setBusy(false);
  }

  async function remove(item: Countdown) {
    await supabase.from("countdowns").delete().eq("id", item.id);
    load();
  }

  function daysUntil(d: string) {
    return Math.ceil(
      (new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000
    );
  }

  return (
    <Shell title="Countdowns" subtitle="Things worth waiting for">
      <form
        onSubmit={add}
        className="mb-6 space-y-2 rounded-2xl border border-neutral-200 p-4"
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="What are we counting down to?"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 rounded-full border border-neutral-200 px-4 py-2.5 text-sm text-neutral-500 outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={busy || !label.trim() || !date}
            className="rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {!items || loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty emoji="⏳" text="No countdowns yet. What's next for you two?" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const days = daysUntil(item.target_date);
            return (
              <div
                key={item.id}
                className="relative rounded-2xl border border-neutral-200 p-4"
              >
                <button
                  onClick={() => remove(item)}
                  aria-label="Delete"
                  className="absolute right-3 top-2 text-neutral-300 hover:text-neutral-500"
                >
                  ×
                </button>
                <p className="text-3xl font-semibold text-neutral-900">
                  {days >= 0 ? days : "🎉"}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {days >= 0
                    ? `day${days === 1 ? "" : "s"} until`
                    : "it happened —"}
                </p>
                <p className="truncate text-sm font-medium text-neutral-900">
                  {item.label}
                </p>
                <p className="mt-1 text-[10px] text-neutral-400">
                  {new Date(item.target_date + "T00:00:00").toLocaleDateString(
                    undefined,
                    { month: "short", day: "numeric", year: "numeric" }
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
