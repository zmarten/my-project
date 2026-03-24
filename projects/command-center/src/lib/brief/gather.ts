import { createClient } from "@supabase/supabase-js";
import { getCalendarClient, getGmailClient } from "@/lib/google";

const CALENDAR_NAME_OVERRIDES: Record<string, string> = {
  "Amion - Hatch Pediatrics": "Sarah Work Schedule",
};

export interface GatheredData {
  calendar: BriefCalendarEvent[];
  tasks: BriefTask[];
  goals: BriefGoal[];
  emails: BriefEmail[];
  weather: WeatherData;
  news: NewsItem[];
  date: string;
  dayOfWeek: string;
}

export interface BriefCalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
  calendarName?: string;
}

export interface BriefTask {
  id: string;
  text: string;
  tag: string;
  completed: boolean;
  assigned_date: string | null;
  created_at: string;
}

export interface BriefGoal {
  id: string;
  title: string;
  category: string;
  horizon: number;
  due_date: string;
  progress: number;
  success_measure: string | null;
  completed: boolean;
}

export interface BriefEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  is_unread: boolean;
}

export interface WeatherData {
  temp_current: number;
  temp_high: number;
  temp_low: number;
  condition: string;
  wind_speed: number;
  wind_direction: string;
  precipitation_chance: number;
  sunrise: string;
  sunset: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  published: string;
  snippet?: string;
}

export async function gatherBriefData(
  userId: string,
  accessToken: string
): Promise<GatheredData> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [calendar, tasks, goals, emails, weather, news] =
    await Promise.allSettled([
      fetchCalendarEvents(accessToken, today),
      fetchTasks(userId),
      fetchGoals(userId),
      fetchPriorityEmails(accessToken),
      fetchWeather(),
      fetchRelevantNews(),
    ]);

  return {
    calendar: calendar.status === "fulfilled" ? calendar.value : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    goals: goals.status === "fulfilled" ? goals.value : [],
    emails: emails.status === "fulfilled" ? emails.value : [],
    weather:
      weather.status === "fulfilled" ? weather.value : getDefaultWeather(),
    news: news.status === "fulfilled" ? news.value : [],
    date: todayStr,
    dayOfWeek: today.toLocaleDateString("en-US", { weekday: "long" }),
  };
}

async function fetchCalendarEvents(
  accessToken: string,
  date: Date
): Promise<BriefCalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all calendars the user has access to (includes shared/family calendars)
  const calendarList = await calendar.calendarList.list({ minAccessRole: "reader" });
  const calendars = (calendarList.data.items || [])
    .filter((c) => c.selected !== false && c.id);

  console.log("[brief] calendars found:", calendars.map((c) => `${c.summary} (${c.id})`));

  // Fetch events from all calendars in parallel
  const results = await Promise.allSettled(
    calendars.map((c) =>
      calendar.events.list({
        calendarId: c.id!,
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      }).then((res) => ({
        res,
        calendarName: CALENDAR_NAME_OVERRIDES[c.summary || ""] ?? c.summary ?? "",
      }))
    )
  );

  const allEvents: BriefCalendarEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const event of result.value.res.data.items || []) {
        allEvents.push({
          title: event.summary || "Untitled",
          start: event.start?.dateTime || event.start?.date || "",
          end: event.end?.dateTime || event.end?.date || "",
          location: event.location || undefined,
          calendarName: result.value.calendarName,
        });
      }
    }
  }

  // Sort by start time
  return allEvents.sort((a, b) => a.start.localeCompare(b.start));
}

async function fetchTasks(userId: string): Promise<BriefTask[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("tasks")
    .select("id, text, tag, completed, assigned_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  return data || [];
}

async function fetchGoals(userId: string): Promise<BriefGoal[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("goals")
    .select(
      "id, title, category, horizon, due_date, progress, success_measure, completed"
    )
    .eq("user_id", userId)
    .eq("completed", false)
    .order("due_date", { ascending: true });

  return data || [];
}

async function fetchPriorityEmails(accessToken: string): Promise<BriefEmail[]> {
  const gmail = getGmailClient(accessToken);

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "is:important OR is:starred newer_than:3d",
    maxResults: 10,
  });

  if (!list.data.messages) return [];

  const threads = await Promise.all(
    list.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name === name)?.value || "";

      return {
        id: msg.id!,
        from: getHeader("From"),
        subject: getHeader("Subject"),
        snippet: detail.data.snippet || "",
        date: getHeader("Date"),
        is_unread: (detail.data.labelIds || []).includes("UNREAD"),
      };
    })
  );

  return threads;
}

async function fetchWeather(): Promise<WeatherData> {
  // Bozeman, MT — Open-Meteo (free, no API key)
  const lat = 45.677;
  const lon = -111.0429;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FDenver`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  const data = await res.json();

  const weatherCodes: Record<number, string> = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    51: "Light drizzle",
    61: "Light rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Moderate snow",
    75: "Heavy snow",
    95: "Thunderstorm",
  };

  const windDirs = [
    "N","NNE","NE","ENE","E","ESE","SE","SSE",
    "S","SSW","SW","WSW","W","WNW","NW","NNW",
  ];
  const windIdx = Math.round(data.current.wind_direction_10m / 22.5) % 16;

  return {
    temp_current: Math.round(data.current.temperature_2m),
    temp_high: Math.round(data.daily.temperature_2m_max[0]),
    temp_low: Math.round(data.daily.temperature_2m_min[0]),
    condition: weatherCodes[data.current.weather_code] || "Unknown",
    wind_speed: Math.round(data.current.wind_speed_10m),
    wind_direction: windDirs[windIdx],
    precipitation_chance: data.daily.precipitation_probability_max[0],
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
  };
}

function getDefaultWeather(): WeatherData {
  return {
    temp_current: 0,
    temp_high: 0,
    temp_low: 0,
    condition: "Unknown",
    wind_speed: 0,
    wind_direction: "N",
    precipitation_chance: 0,
    sunrise: "",
    sunset: "",
  };
}

async function fetchRelevantNews(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const keywords = [
    "supabase OR mapbox OR vercel OR nextjs",
    "montana hunting fishing wildlife",
    "crossfit",
  ];

  const allArticles: NewsItem[] = [];

  for (const q of keywords) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=3&apiKey=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();
      if (data.articles) {
        allArticles.push(
          ...data.articles.map((a: { title: string; source?: { name?: string }; url: string; publishedAt: string; description?: string }) => ({
            title: a.title,
            source: a.source?.name || "Unknown",
            url: a.url,
            published: a.publishedAt,
            snippet: a.description,
          }))
        );
      }
    } catch {
      // Skip failed fetches silently
    }
  }

  const seen = new Set<string>();
  return allArticles
    .filter((a) => {
      if (seen.has(a.title)) return false;
      seen.add(a.title);
      return true;
    })
    .slice(0, 8);
}
