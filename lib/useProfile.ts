"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import type { Profile } from "./types";

export interface ProfileState {
  loading: boolean;
  userId: string | null;
  profile: Profile | null;
  partner: Profile | null;
  roomId: string | null;
}

/**
 * Auth guard + profile loader. Redirects to /login when signed out and to
 * /signup when the account has no profile or room yet.
 */
export function useProfile(): ProfileState {
  const router = useRouter();
  const [state, setState] = useState<ProfileState>({
    loading: true,
    userId: null,
    profile: null,
    partner: null,
    roomId: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace("/login");
        return;
      }
      const userId = session.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!profile || !profile.couple_room_id) {
        router.replace("/signup");
        return;
      }
      const { data: partner } = await supabase
        .from("profiles")
        .select("*")
        .eq("couple_room_id", profile.couple_room_id)
        .neq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setState({
        loading: false,
        userId,
        profile,
        partner: partner ?? null,
        roomId: profile.couple_room_id,
      });
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return state;
}
