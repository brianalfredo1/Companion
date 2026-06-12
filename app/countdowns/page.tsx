"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useToast } from "@/components/Toast";
import type { Countdown } from "@/lib/types";

const LABEL_IDEAS = ["Next meetup 🥺", "Anniversary 🤍", "Birthday 🎂", "Trip ✈️"];

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CountdownsPage() {
  const { loading, roomId, room } = useProfile();
  const { showToast } = useToast();
  const [items, setItems] = useState<Countdown[] | null>(null);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [annDraft, setAnnDraft] = useState("");
  const [annEditing, setAnnEditing] = useState(false);
  const [annSaving, setAnnSaving] = useState(false);
  const [anniversary, setAnniversary] = useState<string | null>(null);

  useEffect(() => {
    if (room) {
      setAnniversary(room.anniversary);
      if (room.anniversary) setAnnDraft(toLocalInput(room.anniversary));
    }
  }, [room]);

  async function saveAnniversary() {
    if (!roomId || !annDraft || annSaving) return;
    setAnnSaving(true);
    const iso = new Date(annDraft).toISOString();
    const { error } = await supabase
      .from("couple_rooms")
      .update({ anniversary: iso })
      .eq("id", roomId);
    if (!error) {
      setAnniversary(iso);
      setAnnEditing(false);
      showToast("🤍 Together-since date saved");
    }
    setAnnSaving(false);
  }

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

  const together = anniversary
    ? (() => {
        const ms = Math.max(0, Date.now() - new Date(anniversary).getTime());
        return {
          days: Math.floor(ms / 86400000),
          hours: Math.floor((ms % 86400000) / 3600000),
        };
      })()
    : null;

  return (
    <Shell title="Countdowns" subtitle="Things worth waiting for">
      {/* Together since */}
      <SectionLabel>Together since</SectionLabel>
      <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 p-4">
        {together && !annEditing ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-rose-700">
                {together.days} days · {together.hours} hours 🤍
              </p>
              <p className="text-xs text-rose-400">
                since{" "}
                {new Date(anniversary!).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              onClick={() => setAnnEditing(true)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-rose-600"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-rose-700">
              When did you two become <em>us</em>?
            </p>
            <div className="flex gap-2">
              <input
                type="datetime-local"
                value={annDraft}
                onChange={(e) => setAnnDraft(e.target.value)}
                className="flex-1 rounded-full border border-rose-200 bg-white px-4 py-2.5 text-sm text-neutral-700 outline-none focus:border-rose-400"
              />
              <button
                onClick={saveAnniversary}
                disabled={annSaving || !annDraft}
                className="rounded-full bg-rose-500 px-4 text-sm font-medium text-white disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

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
        <div className="flex flex-wrap gap-2">
          {LABEL_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setLabel(idea)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                label === idea
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {idea}
            </button>
          ))}
        </div>
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
