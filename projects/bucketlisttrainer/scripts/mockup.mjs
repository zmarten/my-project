/*
 * Bundles app/ into one self-contained HTML file.
 *
 * The PWA loads its CSS, JS and program over HTTP, which needs a server. This inlines all
 * three so the result opens from anywhere, including a hosted artifact page with a strict
 * CSP that blocks every external request. Same code, same data, one file.
 *
 *   node scripts/mockup.mjs [outfile]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const html = read('app/index.html');
const css = read('app/app.css');
const js = read('app/app.js');
const program = read('app/program.json');

/* Everything between the body tags, minus the tags themselves. */
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).trim()
  .replace(/<script src="app\.js"><\/script>/, '');

/*
 * Drop the network boot and the service worker. There is no server here, so the program is
 * handed straight to start(). Everything above that line is the app, unmodified.
 */
const appCode = js.slice(0, js.indexOf("fetch('program.json'"));

/*
 * `</script>` inside a string literal would close the tag early, and a bare `<` can start
 * a comment token in some parsers. JSON escapes both harmlessly.
 */
const safeProgram = program.replace(/</g, '\\u003c');

/*
 * Emit pure ASCII.
 *
 * The head of index.html carries `<meta charset="utf-8">` and this bundle does not have a
 * head to put it in, so a host that serves the file without a charset gets the middot in
 * every stimulus line decoded as Latin-1 and rendered "Â·". Escaping to \\uXXXX is
 * byte-identical in meaning inside JS and JSON string literals and cannot be misread.
 */
const ascii = (s) =>
  s.replace(/[-￿]/g, (c) =>
    '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const out = `<meta charset="utf-8">
<title>Bucket List</title>
<meta name="color-scheme" content="dark">
<style>
${css}
/* The artifact host paints its own ground behind the page, so this must be explicit. */
html,body{background:#0F1C18}
.boot{display:none}
</style>

${body}

<script>
${ascii(appCode)}
var __PROGRAM__ = ${ascii(safeProgram)};
start(__PROGRAM__);
</script>
`;

const leftover = [...out].filter((c) => c.charCodeAt(0) > 127).length;
if (leftover) throw new Error(`${leftover} non-ASCII characters survived the escape`);

const dest = process.argv[2] || resolve(root, 'dist/mockup.html');
writeFileSync(dest, out);
console.log(`Wrote ${dest}  ·  ${Math.round(out.length / 1024)} KB`);
