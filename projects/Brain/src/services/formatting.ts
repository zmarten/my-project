// =============================================================================
// Open Brain: Output Formatting Helpers
// =============================================================================

import type { Thought, ThoughtMatch, ThoughtStats, PaginatedResult } from "../types.js";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatThought(t: Thought | ThoughtMatch, index?: number): string {
  const prefix = index !== undefined ? `### ${index + 1}. ` : "### ";
  const similarity =
    "similarity" in t ? ` (relevance: ${(t.similarity * 100).toFixed(0)}%)` : "";

  const lines: string[] = [
    `${prefix}${t.summary || t.raw_text.slice(0, 80)}${similarity}`,
    `**Type:** ${t.thought_type} | **Captured:** ${formatDate(t.created_at)} | **Source:** ${t.source}`,
  ];

  if (t.people.length > 0) {
    lines.push(`**People:** ${t.people.join(", ")}`);
  }
  if (t.topics.length > 0) {
    lines.push(`**Topics:** ${t.topics.join(", ")}`);
  }
  if (t.action_items.length > 0) {
    lines.push(`**Action items:**`);
    for (const item of t.action_items) {
      lines.push(`- [ ] ${item}`);
    }
  }

  lines.push("", `> ${t.raw_text.slice(0, 500)}${t.raw_text.length > 500 ? "..." : ""}`, "");

  return lines.join("\n");
}

export function formatSearchResults(matches: ThoughtMatch[]): string {
  if (matches.length === 0) {
    return "No matching thoughts found. Try broadening your search or lowering the similarity threshold.";
  }

  const lines = [`## Semantic Search Results (${matches.length} found)\n`];
  for (let i = 0; i < matches.length; i++) {
    lines.push(formatThought(matches[i], i));
  }
  return lines.join("\n");
}

export function formatRecentList(result: PaginatedResult<Thought>): string {
  if (result.items.length === 0) {
    return "No thoughts found matching your filters.";
  }

  const lines = [
    `## Recent Thoughts (${result.count} of ${result.total})\n`,
  ];

  for (let i = 0; i < result.items.length; i++) {
    lines.push(formatThought(result.items[i], result.offset + i));
  }

  if (result.has_more) {
    lines.push(
      `---\n*Showing ${result.offset + 1}–${result.offset + result.count} of ${result.total}. Use offset=${result.next_offset} to see more.*`
    );
  }

  return lines.join("\n");
}

export function formatStats(stats: ThoughtStats): string {
  const lines = [
    `## Open Brain Stats\n`,
    `**Total thoughts:** ${stats.total_thoughts}`,
    `**This week:** ${stats.thoughts_this_week}`,
    `**This month:** ${stats.thoughts_this_month}`,
  ];

  if (stats.oldest_thought) {
    lines.push(`**First thought:** ${formatDate(stats.oldest_thought)}`);
  }
  if (stats.newest_thought) {
    lines.push(`**Latest thought:** ${formatDate(stats.newest_thought)}`);
  }

  if (stats.top_topics && stats.top_topics.length > 0) {
    lines.push("\n### Top Topics");
    for (const t of stats.top_topics) {
      lines.push(`- ${t.topic} (${t.count})`);
    }
  }

  if (stats.top_people && stats.top_people.length > 0) {
    lines.push("\n### Top People");
    for (const p of stats.top_people) {
      lines.push(`- ${p.person} (${p.count})`);
    }
  }

  if (stats.by_type && stats.by_type.length > 0) {
    lines.push("\n### By Type");
    for (const bt of stats.by_type) {
      lines.push(`- ${bt.thought_type}: ${bt.count}`);
    }
  }

  return lines.join("\n");
}

export function formatCaptureConfirmation(
  thought: Thought,
  metadata: { thought_type: string; people: string[]; topics: string[]; action_items: string[]; summary: string }
): string {
  const lines = [
    `## Thought Captured\n`,
    `**Summary:** ${metadata.summary}`,
    `**Type:** ${metadata.thought_type}`,
    `**ID:** \`${thought.id}\``,
  ];

  if (metadata.people.length > 0) {
    lines.push(`**People:** ${metadata.people.join(", ")}`);
  }
  if (metadata.topics.length > 0) {
    lines.push(`**Topics:** ${metadata.topics.join(", ")}`);
  }
  if (metadata.action_items.length > 0) {
    lines.push(`**Action items:** ${metadata.action_items.join("; ")}`);
  }

  return lines.join("\n");
}
