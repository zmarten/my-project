export type { Task, Goal, GoalAction, TaskTag, GoalCategory, GoalHorizon, Database } from "./database";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  color?: string;
  allDay?: boolean;
  location?: string;
  calendarName?: string;
}

export interface GmailThread {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  date: string;
  unread: boolean;
  labels: string[];
}
