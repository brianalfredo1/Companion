export interface CoupleRoom {
  id: string;
  invite_code: string;
  timezone: string | null;
  anniversary: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  couple_room_id: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  room_id: string;
  user_id: string;
  date: string;
  exercise_done: boolean;
  sleep_done: boolean;
  water_count: number;
  created_at: string;
}

export interface Note {
  id: string;
  room_id: string;
  from_user_id: string;
  message: string;
  seen: boolean;
  created_at: string;
}

export interface Todo {
  id: string;
  room_id: string;
  title: string;
  assigned_to: string | null;
  done: boolean;
  created_by: string;
  created_at: string;
}

export interface WatchItem {
  id: string;
  room_id: string;
  title: string;
  type: string;
  watched_together: boolean;
  added_by: string;
  created_at: string;
}

export interface EatItem {
  id: string;
  room_id: string;
  title: string;
  category: string;
  visited_together: boolean;
  added_by: string;
  created_at: string;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface DateNight {
  id: string;
  room_id: string;
  title: string;
  scheduled_at: string | null;
  checklist: ChecklistItem[];
  completed: boolean;
  created_at: string;
}

export interface Countdown {
  id: string;
  room_id: string;
  label: string;
  target_date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  room_id: string;
  title: string;
  progress: number;
  target_date: string | null;
  created_at: string;
}

export interface Adventure {
  id: string;
  room_id: string;
  title: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
}

export interface PointsEntry {
  id: string;
  room_id: string;
  user_id: string;
  action: string;
  points: number;
  created_at: string;
}
