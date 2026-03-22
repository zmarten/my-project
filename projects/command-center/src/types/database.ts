export type TaskTag = "covey" | "home" | "health" | "deloitte" | "new";
export type GoalColor = "green" | "amber" | "blue" | "red" | "teal";

export interface Task {
  id: string;
  user_id: string;
  text: string;
  tag: TaskTag;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  progress: number;
  color: GoalColor;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "completed_at">;
        Update: Partial<Omit<Task, "id" | "user_id">>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, "id" | "created_at">;
        Update: Partial<Omit<Goal, "id" | "user_id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
