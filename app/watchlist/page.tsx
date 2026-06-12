"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { POINTS } from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import { useToast } from "@/components/Toast";
import type { WatchItem } from "@/lib/types";

const TYPES = ["Movie", "Show"];

export default function WatchlistPage() {
  const { loading, userId, roomId } = useProfile();
  const award = useAward();
  const { celebrate } = useToast();
  const [items, setItems] = useState<WatchItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("watchlist")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as WatchItem[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("watchlist", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !userId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("watchlist").insert({
      room_id: roomId,
      title: title.trim(),
      type,
      added_by: userId,
    });
    setTitle("");
    await load();
    setBusy(false);
  }

  async function markWatched(item: WatchItem) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    await supabase
      .from("watchlist")
      .update({ watched_together: !item.watched_together })
      .eq("id", item.id);
    if (!item.watched_together) {
      await award(roomId, userId, "watched_together");
    }
    await load();
    setBusy(false);
  }

  async function remove(item: WatchItem) {
    await supabase.from("watchlist").delete().eq("id", item.id);
    load();
  }

  const queue = (items ?? []).filter((i) => !i.watched_together);
  const watched = (items ?? []).filter((i) => i.watched_together);

  function decideForUs() {
    if (queue.length < 2 || picking) return;
    setPicking(true);
    let spins = 0;
    const interval = setInterval(() => {
      setPick(queue[Math.floor(Math.random() * queue.length)].title);
      spins++;
      if (spins > 14) {
        clearInterval(interval);
        setPicking(false);
        celebrate();
      }
    }, 90);
  }

  return (
    <Shell title="Watchlist" subtitle="Movies & shows for two">
      <form onSubmit={add} className="mb-6 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a movie or show…"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-purple-400"
        />
        <div className="flex items-center gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                type === t
                  ? "bg-purple-600 text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {t}
            </button>
          ))}
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="ml-auto rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {queue.length >= 2 && (
        <div className="mb-6">
          <button
            onClick={decideForUs}
            disabled={picking}
            className="w-full rounded-full border border-purple-200 bg-purple-50 py-2.5 text-sm font-medium text-purple-700 disabled:opacity-70"
          >
            🎲 Decide for us
          </button>
          {pick && (
            <p
              className={`mt-2 text-center text-sm ${
                picking
                  ? "text-neutral-400"
                  : "font-semibold text-purple-700"
              }`}
            >
              {picking ? pick : `Tonight: ${pick} 🍿`}
            </p>
          )}
        </div>
      )}

      {!items || loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty emoji="🎬" text="Nothing on the list. What should you two watch?" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {queue.length === 0 && (
              <p className="text-sm text-neutral-500">Queue is empty 🍿</p>
            )}
            {queue.map((item) => (
              <Row
                key={item.id}
                item={item}
                onToggle={() => markWatched(item)}
                onRemove={() => remove(item)}
              />
            ))}
          </div>
          {watched.length > 0 && (
            <div>
              <SectionLabel>Watched together</SectionLabel>
              <div className="space-y-2">
                {watched.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    onToggle={() => markWatched(item)}
                    onRemove={() => remove(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

function Row({
  item,
  onToggle,
  onRemove,
}: {
  item: WatchItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5">
      <span className="text-xl">{item.type === "Show" ? "📺" : "🎬"}</span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            item.watched_together
              ? "text-neutral-400 line-through"
              : "font-medium text-neutral-900"
          }`}
        >
          {item.title}
        </p>
        <p className="text-xs text-purple-600">
          {item.type}
          {item.watched_together && " · watched together"}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          item.watched_together
            ? "bg-neutral-100 text-neutral-500"
            : "bg-purple-600 text-white"
        }`}
      >
        {item.watched_together ? "Undo" : `Watched +${POINTS.watched_together}`}
      </button>
      <button
        onClick={onRemove}
        aria-label="Remove"
        className="text-neutral-300 hover:text-neutral-500"
      >
        ×
      </button>
    </div>
  );
}
