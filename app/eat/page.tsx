"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import { POINTS } from "@/lib/points";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import { useToast } from "@/components/Toast";
import type { EatItem } from "@/lib/types";

const CATEGORIES = ["Restaurant", "Street food", "Cafe", "Cook at home"];

export default function EatPage() {
  const { loading, userId, roomId } = useProfile();
  const award = useAward();
  const { celebrate } = useToast();
  const [items, setItems] = useState<EatItem[] | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("eat_list")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as EatItem[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("eat_list", roomId, load);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !userId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("eat_list").insert({
      room_id: roomId,
      title: title.trim(),
      category,
      added_by: userId,
    });
    setTitle("");
    await load();
    setBusy(false);
  }

  async function markVisited(item: EatItem) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    await supabase
      .from("eat_list")
      .update({ visited_together: !item.visited_together })
      .eq("id", item.id);
    if (!item.visited_together) {
      await award(roomId, userId, "ate_together");
    }
    await load();
    setBusy(false);
  }

  async function remove(item: EatItem) {
    await supabase.from("eat_list").delete().eq("id", item.id);
    load();
  }

  const toTry = (items ?? []).filter((i) => !i.visited_together);
  const visited = (items ?? []).filter((i) => i.visited_together);

  function decideForUs() {
    if (toTry.length < 2 || picking) return;
    setPicking(true);
    let spins = 0;
    const interval = setInterval(() => {
      setPick(toTry[Math.floor(Math.random() * toTry.length)].title);
      spins++;
      if (spins > 14) {
        clearInterval(interval);
        setPicking(false);
        celebrate();
      }
    }, 90);
  }

  return (
    <Shell title="What do we eat?" subtitle="Cravings & places to try">
      <form onSubmit={add} className="mb-6 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a place or dish…"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-amber-400"
        />
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                category === c
                  ? "bg-amber-500 text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {c}
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

      {toTry.length >= 2 && (
        <div className="mb-6">
          <button
            onClick={decideForUs}
            disabled={picking}
            className="w-full rounded-full border border-amber-200 bg-amber-50 py-2.5 text-sm font-medium text-amber-700 disabled:opacity-70"
          >
            🎲 Decide for us
          </button>
          {pick && (
            <p
              className={`mt-2 text-center text-sm ${
                picking ? "text-neutral-400" : "font-semibold text-amber-700"
              }`}
            >
              {picking ? pick : `Tonight we eat: ${pick} 🍜`}
            </p>
          )}
        </div>
      )}

      {!items || loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty emoji="🍜" text="No cravings logged. What sounds good?" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {toTry.length === 0 && (
              <p className="text-sm text-neutral-500">
                Nothing left to try — add more!
              </p>
            )}
            {toTry.map((item) => (
              <Row
                key={item.id}
                item={item}
                onToggle={() => markVisited(item)}
                onRemove={() => remove(item)}
              />
            ))}
          </div>
          {visited.length > 0 && (
            <div>
              <SectionLabel>Visited together</SectionLabel>
              <div className="space-y-2">
                {visited.map((item) => (
                  <Row
                    key={item.id}
                    item={item}
                    onToggle={() => markVisited(item)}
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
  item: EatItem;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5">
      <span className="text-xl">🍽️</span>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            item.visited_together
              ? "text-neutral-400 line-through"
              : "font-medium text-neutral-900"
          }`}
        >
          {item.title}
        </p>
        <p className="text-xs text-amber-600">
          {item.category}
          {item.visited_together && " · visited together"}
        </p>
      </div>
      <button
        onClick={onToggle}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          item.visited_together
            ? "bg-neutral-100 text-neutral-500"
            : "bg-amber-500 text-white"
        }`}
      >
        {item.visited_together ? "Undo" : `Visited +${POINTS.ate_together}`}
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
