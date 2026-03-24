import Anthropic from "@anthropic-ai/sdk";
import type { GatheredData } from "./gather";

export interface DailyBrief {
  lead: string;
  weather: {
    temp: number;
    condition: string;
    detail: string;
    icon: string;
  };
  focus: Array<{
    label: string;
    value: string;
    detail: string;
  }>;
  timeline: Array<{
    time: string;
    title: string;
    detail: string;
    type: "event" | "task" | "goal";
    color: "green" | "blue" | "amber" | "teal" | "red";
  }>;
  goal_actions: Array<{
    goal_name: string;
    action: string;
    why: string;
    progress: number;
    color: "green" | "amber" | "blue" | "red" | "teal";
    icon: string;
  }>;
  intel: Array<{
    source: string;
    category: string;
    headline: string;
    why: string;
  }>;
  closing: {
    quote: string;
    attribution: string;
  };
}

const SYSTEM_PROMPT = `You are a personal chief of staff generating a morning daily brief. You know the user intimately:

## User Profile
- Name: Zach Martens
- Location: Bozeman, Montana
- Role: Product Manager at Deloitte (currently on paternity leave)
- Baby: ~4 months old (born late November 2025)
- Active projects: Covey (bird hunting tracker app — covey.zachmartens.com), personal website
- Covey tech stack: Next.js, Supabase, Mapbox GL JS, Vercel
- Fitness: CrossFit athlete, trail runner, mountain biker. Carnivore-leaning diet.
- Outdoors: Upland bird hunter with pointing dogs, big game hunter (elk, mule deer, antelope — applied for MT permits)
- Dogs: Pointing/hunting dogs
- Reading: Currently reading Shoe Dog. Goal is 12 books this year.
- Health: Following up with PA Nicole DeArmond on lab work

## Brief Style
- Write like a trusted advisor, not a robot. Conversational but concise.
- The lead summary should be opinionated — tell Zach what matters most today and why.
- When weaving tasks into the timeline, think about logical sequencing.
- Goal actions should be SPECIFIC to today — not generic advice.
- News/intel items should each have a "why this matters to you" line.
- Weather should include activity-relevant context (trail conditions, outdoor windows).
- The closing quote should vary day to day — mix of outdoors, building, fatherhood, stoicism, adventure themes.

## Output Format
Respond with ONLY valid JSON matching this exact schema. No markdown, no preamble, no backticks.

{
  "lead": "string — 2-4 sentence narrative summary. Opinionated, direct, actionable.",
  "weather": {
    "temp": number,
    "condition": "string",
    "detail": "string — activity-relevant context",
    "icon": "string — single weather emoji"
  },
  "focus": [
    {
      "label": "string — like 'Top Priority', 'Don't Forget', 'Open Email', 'Move Today'",
      "value": "string — short 2-4 word value",
      "detail": "string — one line of context"
    }
  ],
  "timeline": [
    {
      "time": "string — like '7:00 AM'",
      "title": "string",
      "detail": "string — context, location, or why",
      "type": "event | task | goal",
      "color": "green | blue | amber | teal | red"
    }
  ],
  "goal_actions": [
    {
      "goal_name": "string",
      "action": "string — specific action for today",
      "why": "string — why this matters",
      "progress": number,
      "color": "green | amber | blue | red | teal",
      "icon": "string — emoji"
    }
  ],
  "intel": [
    {
      "source": "string",
      "category": "string — like 'Product', 'Hunting', 'Local', 'Fitness'",
      "headline": "string",
      "why": "string — why this matters to Zach specifically"
    }
  ],
  "closing": {
    "quote": "string",
    "attribution": "string"
  }
}

Rules:
- focus array must have exactly 4 items
- timeline should interleave events and tasks chronologically (5-9 items)
- goal_actions should have one entry per active goal (max 5)
- intel should have 3-5 items of genuinely relevant news
- timeline colors: green=fitness, blue=appointments/health, amber=work/projects, teal=outdoor, red=urgent
- Do NOT include any text outside the JSON object`;

export async function synthesizeBrief(data: GatheredData): Promise<DailyBrief> {
  const client = new Anthropic();

  const userMessage = `Generate today's daily brief. Here is all the data:

## Date
${data.date} (${data.dayOfWeek})

## Today's Calendar Events
${JSON.stringify(data.calendar, null, 2)}

## Tasks (open and recent)
${JSON.stringify(data.tasks, null, 2)}

## Active Goals
${JSON.stringify(data.goals, null, 2)}

## Priority Emails
${JSON.stringify(data.emails, null, 2)}

## Weather (Bozeman, MT)
${JSON.stringify(data.weather, null, 2)}

## Recent News
${JSON.stringify(data.news, null, 2)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as DailyBrief;
}
