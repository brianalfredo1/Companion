"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import Shell, { Empty, Loading, SectionLabel } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import type { Todo } from "@/lib/types";

export default function TodosPage() {
  const { loading, userId, profile, partner, roomId } = useProfile();
  const award = useAward();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("Both");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("todos")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setTodos((data ?? []) as Todo[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("todos", roomId, load);

  const assignees = [
    profile?.name ?? "Me",
    partner?.name ?? "Partner",
    "Both",
  ];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !userId || !title.trim() || busy) return;
    setBusy(true);
    await supabase.from("todos").insert({
      room_id: roomId,
      title: title.trim(),
      assigned_to: assignee,
      created_by: userId,
    });
    setTitle("");
    await load();
    setBusy(false);
  }

  async function toggle(todo: Todo) {
    if (!roomId || !userId || busy) return;
    setBusy(true);
    await supabase
      .from("todos")
      .update({ done: !todo.done })
      .eq("id", todo.id);
    if (!todo.done) {
      await award(roomId, userId, "todo_done");
    }
    await load();
    setBusy(false);
  }

  async function remove(todo: Todo) {
    await supabase.from("todos").delete().eq("id", todo.id);
    load();
  }

  const open = (todos ?? []).filter((t) => !t.done);
  const done = (todos ?? []).filter((t) => t.done);

  return (
    <Shell title="To-do list" subtitle="Shared between you two">
      <form onSubmit={add} className="mb-6 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="w-full rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
        />
        <div className="flex items-center gap-2">
          {assignees.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAssignee(a)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                assignee === a
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {a}
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

      {!todos || loading ? (
        <Loading />
      ) : todos.length === 0 ? (
        <Empty emoji="✅" text="Nothing to do. Enjoy each other!" />
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            {open.length === 0 && (
              <p className="text-sm text-neutral-500">All caught up 🎉</p>
            )}
            {open.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                onToggle={() => toggle(todo)}
                onRemove={() => remove(todo)}
              />
            ))}
          </div>
          {done.length > 0 && (
            <div>
              <SectionLabel>Done</SectionLabel>
              <div className="space-y-2">
                {done.map((todo) => (
                  <TodoRow
                    key={todo.id}
                    todo={todo}
                    onToggle={() => toggle(todo)}
                    onRemove={() => remove(todo)}
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

function TodoRow({
  todo,
  onToggle,
  onRemove,
}: {
  todo: Todo;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3.5">
      <button
        onClick={onToggle}
        aria-label={todo.done ? "Mark as not done" : "Mark as done"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
          todo.done
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-neutral-300 text-transparent"
        }`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            todo.done
              ? "text-neutral-400 line-through"
              : "font-medium text-neutral-900"
          }`}
        >
          {todo.title}
        </p>
        {todo.assigned_to && (
          <p className="text-xs text-blue-600">{todo.assigned_to}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        aria-label="Delete task"
        className="text-neutral-300 hover:text-neutral-500"
      >
        ×
      </button>
    </div>
  );
}
