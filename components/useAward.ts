"use client";

import { useToast } from "./Toast";
import {
  ACTION_LABELS,
  awardPoints,
  fetchTotalPoints,
  getRankInfo,
  POINTS,
} from "@/lib/points";

/**
 * Awards points, shows the points toast, and fires confetti on rank-ups
 * (always) or when the action itself is a big moment (opts.confetti).
 */
export function useAward() {
  const { showPoints, celebrate } = useToast();

  return async function award(
    roomId: string,
    userId: string,
    action: keyof typeof POINTS,
    opts?: { confetti?: boolean }
  ) {
    const before = await fetchTotalPoints(roomId);
    const points = await awardPoints(roomId, userId, action);
    showPoints(points, ACTION_LABELS[action] ?? action);
    const prevRank = getRankInfo(before);
    const newRank = getRankInfo(before + points);
    if (newRank.current.name !== prevRank.current.name) {
      celebrate(
        `${newRank.current.emoji} Rank up! You two are now ${newRank.current.name}`
      );
    } else if (opts?.confetti) {
      celebrate();
    }
    return points;
  };
}
