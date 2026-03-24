export type TaskTag = "covey" | "home" | "health" | "deloitte" | "new";
export type GoalCategory = "health" | "family" | "projects" | "financial";
export type GoalHorizon = 30 | 90 | 180;

export interface Task {
  id: string;
  user_id: string;
  text: string;
  tag: TaskTag;
  completed: boolean;
  assigned_date: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  horizon: GoalHorizon;
  due_date: string;
  success_measure: string | null;
  progress: number;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
  actions?: GoalAction[];
}

export interface GoalAction {
  id: string;
  goal_id: string;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at" | "completed_at" | "assigned_date"> & { assigned_date?: string | null };
        Update: Partial<Omit<Task, "id" | "user_id">>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, "id" | "created_at" | "completed_at" | "actions">;
        Update: Partial<Omit<Goal, "id" | "user_id" | "actions">>;
      };
      goal_actions: {
        Row: GoalAction;
        Insert: Omit<GoalAction, "id" | "created_at" | "completed_at">;
        Update: Partial<Omit<GoalAction, "id" | "user_id" | "goal_id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
