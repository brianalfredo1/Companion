"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { POINTS } from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import type { Adventure } from "@/lib/types";

const ADVENTURE_IDEAS = [
  "Watch a sunset together 🌅",
  "Road trip 🚗",
  "Try a new cuisine 🍱",
  "Hike a mountain ⛰️",
  "See the northern lights ✨",
];

export default function AdventuresPage() {
  const { loading, userId, roomId } = useProfile();
  const award = useAward();
  const [items, setItems] = useState<Adventure[] | null>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("adventures")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Adventure[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("adventures", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("adventures").insert({
      room_id: roomId,
      title: title.trim(),
    });
    setTitle("");
    await load();
    setBusy(false);
  }

  async function toggle(item: Adventure) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    await supabase
      .from("adventures")
      .update({
        done: !item.done,
        done_at: item.done ? null : new Date().toISOString(),
      })
      .eq("id", item.id);
    if (!item.done) {
      await award(roomId, userId, "adventure_done", { confetti: true });
    }
    await load();
    setBusy(false);
  }

  async function remove(item: Adventure) {
    await supabase.from("adventures").delete().eq("id", item.id);
    load();
  }

  const someday = (items ?? []).filter((i) => !i.done);
  const done = (items ?? []).filter((i) => i.done);

  return (
    <Shell title="Our adventures" subtitle="The bucket list">
      <form onSubmit={add} className="mb-6 space-y-2">
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add an adventure…"
            className="flex-1 rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {ADVENTURE_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setTitle(idea)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                title === idea
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {idea}
            </button>
          ))}
        </div>
      </form>

      {!items || loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty emoji="🗺️" text="Empty bucket list. Where to first?" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {someday.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5"
              >
                <span className="text-xl">🗺️</span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
                  {item.title}
                </p>
                <button
                  onClick={() => toggle(item)}
                  disabled={busy}
                  className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Done! +{POINTS.adventure_done}
                </button>
                <button
                  onClick={() => remove(item)}
                  aria-label="Remove"
                  className="text-neutral-300 hover:text-neutral-500"
                >
                  ×
                </button>
              </div>
            ))}
            {someday.length === 0 && (
              <p className="text-sm text-neutral-500">
                Bucket list complete — dream bigger!
              </p>
            )}
          </div>

          {done.length > 0 && (
            <div>
              <SectionLabel>Done together</SectionLabel>
              <div className="space-y-2">
                {done.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5"
                  >
                    <span className="text-xl">🏔️</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-neutral-400 line-through">
                        {item.title}
                      </p>
                      {item.done_at && (
                        <p className="text-xs text-neutral-400">
                          {new Date(item.done_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggle(item)}
                      className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-500"
                    >
                      Undo
                    </button>
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
