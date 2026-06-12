"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useRealtime } from "@/lib/useRealtime";
import Shell, { Empty, Loading } from "@/components/Shell";
import { useAward } from "@/components/useAward";
import type { Note } from "@/lib/types";

export default function NotesPage() {
  const { loading, userId, partner, roomId } = useProfile();
  const award = useAward();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("notes")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as Note[]);
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);
  useRealtime("notes", roomId, load);

  // Mark partner's notes as seen once we're looking at them.
  useEffect(() => {
    if (!roomId || !userId || !notes) return;
    const unseen = notes.filter((n) => n.from_user_id !== userId && !n.seen);
    if (unseen.length === 0) return;
    supabase
      .from("notes")
      .update({ seen: true })
      .in(
        "id",
        unseen.map((n) => n.id)
      )
      .then(() => {});
  }, [notes, roomId, userId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !userId || !message.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("notes").insert({
      room_id: roomId,
      from_user_id: userId,
      message: message.trim(),
    });
    if (!error) {
      setMessage("");
      await award(roomId, userId, "note_sent");
      load();
    }
    setSending(false);
  }

  return (
    <Shell title="Notes" subtitle="Little messages for each other">
      <form onSubmit={send} className="mb-6 flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Write something sweet…`}
          className="flex-1 rounded-full border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="rounded-full bg-amber-500 px-5 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {!notes || loading ? (
        <Loading />
      ) : notes.length === 0 ? (
        <Empty emoji="💌" text="No notes yet. Send the first one!" />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isMine = note.from_user_id === userId;
            return (
              <div
                key={note.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isMine
                      ? "bg-neutral-900 text-white"
                      : "bg-amber-50 text-amber-950"
                  }`}
                >
                  <p className="text-sm">{note.message}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isMine ? "text-neutral-400" : "text-amber-700/60"
                    }`}
                  >
                    {isMine ? "You" : partner?.name ?? "Them"} ·{" "}
                    {new Date(note.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {isMine && note.seen && " · seen"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
