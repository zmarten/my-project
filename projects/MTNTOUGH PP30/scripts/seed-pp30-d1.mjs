import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = dirname(here);
const seedPath = join(projectDir, "private", "pp30-workouts.seed.json");
const sqlPath = join(projectDir, "private", "pp30-workouts.seed.sql");
const workouts = JSON.parse(readFileSync(seedPath, "utf8"));

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = workouts.map((workout, index) => `(
  ${quote(workout.id)},
  ${Number(workout.week)},
  ${Number(workout.day)},
  ${quote(workout.weekday)},
  ${quote(workout.type)},
  ${quote(workout.title)},
  ${quote(workout.focus)},
  ${quote(JSON.stringify(workout.blocks))},
  ${quote(JSON.stringify(workout.track))},
  ${quote(workout.prescription)},
  ${index + 1}
)`).join(",\n");

const sql = `DELETE FROM workouts;
INSERT INTO workouts (
  id, week, day, weekday, type, title, focus, blocks_json, track_json, prescription, sort_order
) VALUES
${values};
`;

writeFileSync(sqlPath, sql);
console.log(`Wrote ${sqlPath}`);

if (process.argv.includes("--remote") || process.argv.includes("--local")) {
  const remote = process.argv.includes("--remote");
  console.log("Run this command from D:\\my-project:");
  console.log(`npx wrangler d1 execute pp30-tracker --file "${sqlPath}" ${remote ? "--remote" : "--local"}`);
}
