"use client";

import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

/**
 * Subscribes to Supabase realtime changes for a table scoped to the couple
 * room and invokes the callback on any insert/update/delete.
 */
export function useRealtime(
  table: string,
  roomId: string | null,
  onChange: () => void
) {
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`${table}-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `room_id=eq.${roomId}`,
        },
        () => callbackRef.current()
      )
      .subscribe();

    // Phones suspend the websocket when the app is backgrounded, so realtime
    // events are missed. Refetch whenever the app comes back to life.
    const refetch = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };
    document.addEventListener("visibilitychange", refetch);
    window.addEventListener("focus", refetch);
    window.addEventListener("online", refetch);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", refetch);
      window.removeEventListener("focus", refetch);
      window.removeEventListener("online", refetch);
    };
  }, [table, roomId]);
}
