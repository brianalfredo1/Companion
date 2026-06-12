import { supabase } from "./supabase";

export const RANKS = [
  { name: "Strangers", emoji: "🤍", min: 0 },
  { name: "Bronze", emoji: "🥉", min: 100 },
  { name: "Silver", emoji: "🥈", min: 300 },
  { name: "Gold", emoji: "🥇", min: 700 },
  { name: "Diamond", emoji: "💎", min: 1500 },
  { name: "Soulmates", emoji: "👑", min: 3000 },
] as const;

export interface RankInfo {
  current: (typeof RANKS)[number];
  next: (typeof RANKS)[number] | null;
  progress: number;
  toNext: number;
}

export function getRankInfo(points: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (points >= RANKS[i].min) index = i;
  }
  const current = RANKS[index];
  const next = index + 1 < RANKS.length ? RANKS[index + 1] : null;
  const progress = next
    ? Math.min(1, (points - current.min) / (next.min - current.min))
    : 1;
  return { current, next, progress, toNext: next ? next.min - points : 0 };
}

export const POINTS = {
  exercise: 15,
  sleep: 10,
  water_goal: 10,
  todo_done: 5,
  note_sent: 5,
  watched_together: 20,
  ate_together: 25,
  date_night_completed: 40,
  adventure_done: 50,
  goal_milestone: 30,
  daily_question: 10,
} as const;

export const ACTION_LABELS: Record<string, string> = {
  exercise: "Exercise done",
  sleep: "Good night's sleep",
  water_goal: "8 glasses of water",
  todo_done: "To-do completed",
  note_sent: "Note sent",
  watched_together: "Watched together",
  ate_together: "Ate together",
  date_night_completed: "Date night completed",
  adventure_done: "Adventure completed",
  goal_milestone: "Goal milestone reached",
  daily_question: "Question answered together",
};

export async function awardPoints(
  roomId: string,
  userId: string,
  action: keyof typeof POINTS
): Promise<number> {
  const points = POINTS[action];
  await supabase
    .from("points_log")
    .insert({ room_id: roomId, user_id: userId, action, points });
  return points;
}

export async function fetchTotalPoints(roomId: string): Promise<number> {
  const { data } = await supabase
    .from("points_log")
    .select("points")
    .eq("room_id", roomId);
  return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);
}

export const GOAL_MILESTONES = [25, 50, 75, 100];

export function milestonesCrossed(prev: number, next: number): number {
  return GOAL_MILESTONES.filter((m) => prev < m && next >= m).length;
}
