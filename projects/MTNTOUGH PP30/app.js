let workouts = [];

const storageKey = "mtnToughPp30Tracker.v1";
const state = {
  selectedId: null,
  week: "all",
  type: "all",
  search: "",
  log: {},
  loading: true
};

const els = {
  list: document.querySelector("#workoutList"),
  detail: document.querySelector("#detailPanel"),
  template: document.querySelector("#workoutButtonTemplate"),
  search: document.querySelector("#searchInput"),
  visibleCount: document.querySelector("#visibleCount"),
  progressRing: document.querySelector("#progressRing"),
  progressPercent: document.querySelector("#progressPercent"),
  completedCount: document.querySelector("#completedCount"),
  currentWeek: document.querySelector("#currentWeek"),
  strengthCount: document.querySelector("#strengthCount"),
  conditioningCount: document.querySelector("#conditioningCount"),
  exportBtn: document.querySelector("#exportBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  mobileViewBtn: document.querySelector("#mobileViewBtn")
};

async function loadData() {
  const response = await fetch("/api/pp30/bootstrap", { credentials: "same-origin" });
  if (response.status === 401) {
    renderAuthRequired();
    return;
  }
  if (!response.ok) {
    throw new Error(`Unable to load workouts: ${response.status}`);
  }
  const payload = await response.json();
  workouts = payload.workouts || [];
  state.log = payload.log || {};
  state.selectedId = workouts[0]?.id || null;
  state.loading = false;
  render();
}

async function saveLog(workoutId) {
  const log = state.log[workoutId] || {
    complete: false,
    date: "",
    result: "",
    metrics: {},
    rpe: "",
    trackLog: "",
    notes: ""
  };
  const response = await fetch(`/api/pp30/log/${encodeURIComponent(workoutId)}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(log)
  });
  if (!response.ok) {
    showToast("Could not save log");
  }
}

function renderAuthRequired() {
  document.body.innerHTML = `
    <main class="auth-required">
      <section>
        <p class="eyebrow">Private app</p>
        <h1>Authentication required</h1>
        <p>This tracker is protected by Cloudflare Access. Sign in with an allowed account to view workouts and training logs.</p>
      </section>
    </main>
  `;
}

function entryFor(id) {
  if (!state.log[id]) {
    state.log[id] = {
      complete: false,
      date: "",
      result: "",
      metrics: {},
      rpe: "",
      trackLog: "",
      notes: ""
    };
  }
  if (!state.log[id].metrics) {
    state.log[id].metrics = {};
  }
  return state.log[id];
}

function filteredWorkouts() {
  const query = state.search.trim().toLowerCase();
  return workouts.filter((workout) => {
    const weekMatches = state.week === "all" || String(workout.week) === state.week;
    const typeMatches = state.type === "all" || workout.type === state.type;
    const searchText = `${workout.week} ${workout.day} ${workout.weekday} ${workout.title} ${workout.focus}`.toLowerCase();
    return weekMatches && typeMatches && (!query || searchText.includes(query));
  });
}

function renderList() {
  const visible = filteredWorkouts();
  els.visibleCount.textContent = visible.length;
  els.list.innerHTML = "";

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = '<i data-lucide="filter-x"></i><p>No workouts match those filters.</p>';
    els.list.append(empty);
    refreshIcons();
    return;
  }

  visible.forEach((workout) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    const log = entryFor(workout.id);
    node.dataset.id = workout.id;
    node.classList.toggle("active", workout.id === state.selectedId);
    node.classList.toggle("complete", Boolean(log.complete));
    node.querySelector(".row-title").textContent = `W${workout.week}D${workout.day} - ${workout.title}`;
    node.querySelector(".row-meta").textContent = `${workout.weekday} | ${labelForType(workout.type)}`;
    node.addEventListener("click", () => {
      state.selectedId = workout.id;
      render();
    });
    els.list.append(node);
  });

  refreshIcons();
}

function renderDetail() {
  const workout = workouts.find((item) => item.id === state.selectedId) || filteredWorkouts()[0] || workouts[0];
  if (!workout) {
    els.detail.innerHTML = `<div class="empty-state"><p>No workouts loaded yet.</p></div>`;
    return;
  }
  state.selectedId = workout.id;
  const log = entryFor(workout.id);
  const checkedIcon = log.complete ? "check-circle-2" : "circle";

  els.detail.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Week ${workout.week} Day ${workout.day} | ${workout.weekday}</p>
        <h2>${workout.title}</h2>
        <div class="detail-meta">
          <span class="tag">${labelForType(workout.type)}</span>
          <span class="tag">${workout.track.length} tracked metrics</span>
        </div>
      </div>
      <button class="complete-toggle ${log.complete ? "is-complete" : ""}" id="completeToggle" type="button">
        <i data-lucide="${checkedIcon}"></i>
        <span>${log.complete ? "Complete" : "Mark Complete"}</span>
      </button>
    </div>

    <div class="detail-grid">
      <div>
        <section class="section-block">
          <h3>Focus</h3>
          <p>${workout.focus}</p>
        </section>

        <section class="section-block">
          <h3>Workout</h3>
          <div class="workout-prescription">${formatWorkoutText(getExactWorkoutText(workout))}</div>
        </section>

        <section class="section-block">
          <h3>Track</h3>
          <ul class="track-list">
            ${workout.track.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </section>
      </div>

      <aside class="section-block">
        <h3>Training Log</h3>
        <form class="log-form" id="logForm">
          <label class="field">
            <span>Date completed</span>
            <input type="date" name="date" value="${escapeAttribute(log.date)}">
          </label>
          <div class="track-log-panel">
            <h4>Track Portions</h4>
            <p>Use this for the workout-specific items the PDF tells you to track during the session.</p>
            <label class="field">
              <span>Track log</span>
              <textarea name="trackLog" placeholder="${escapeAttribute(trackPlaceholder(workout))}">${escapeHtml(log.trackLog)}</textarea>
            </label>
          </div>
          <div class="metric-grid">
            ${workout.track.map((metric) => renderMetricField(metric, log)).join("")}
          </div>
          <label class="field">
            <span>RPE / feel</span>
            <input type="text" name="rpe" value="${escapeAttribute(log.rpe)}" placeholder="Example: RPE 8, legs heavy">
          </label>
          <label class="field">
            <span>Notes</span>
            <textarea name="notes" placeholder="What worked, what to adjust, gear/load notes">${escapeHtml(log.notes)}</textarea>
          </label>
        </form>
      </aside>
    </div>
  `;

  document.querySelector("#completeToggle").addEventListener("click", () => {
    log.complete = !log.complete;
    if (log.complete && !log.date) {
      log.date = new Date().toISOString().slice(0, 10);
    }
    saveLog(workout.id);
    render();
  });

  document.querySelector("#logForm").addEventListener("input", (event) => {
    if (event.target.dataset.metricKey) {
      log.metrics[event.target.dataset.metricKey] = event.target.value;
    } else {
      log[event.target.name] = event.target.value;
    }
    saveLog(workout.id);
    renderStats();
    renderList();
  });

  refreshIcons();
}

function renderStats() {
  if (!workouts.length) return;
  const completed = workouts.filter((workout) => entryFor(workout.id).complete);
  const completedStrength = workouts.filter((workout) => workout.type === "strength" && entryFor(workout.id).complete);
  const completedConditioning = workouts.filter((workout) => workout.type === "conditioning" && entryFor(workout.id).complete);
  const percent = Math.round((completed.length / workouts.length) * 100);
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (percent / 100) * circumference;
  const nextWorkout = workouts.find((workout) => !entryFor(workout.id).complete) || workouts[workouts.length - 1];

  els.progressRing.style.strokeDashoffset = offset;
  els.progressPercent.textContent = `${percent}%`;
  els.completedCount.textContent = `${completed.length} / ${workouts.length}`;
  els.currentWeek.textContent = `Week ${nextWorkout.week}`;
  els.strengthCount.textContent = `${completedStrength.length} / ${workouts.filter((workout) => workout.type === "strength").length}`;
  els.conditioningCount.textContent = `${completedConditioning.length} / ${workouts.filter((workout) => workout.type === "conditioning").length}`;
}

function render() {
  renderStats();
  renderList();
  renderDetail();
}

function labelForType(type) {
  if (type === "test") return "Test";
  if (type === "strength") return "Strength";
  return "Conditioning";
}

function getExactWorkoutText(workout) {
  return workout.prescription || workout.blocks.join("\n");
}

function formatWorkoutText(text) {
  const lines = text.split("\n").map((line) => line.trim());
  const day = lines[0] || "";
  const title = lines[1] || "";
  const sections = [];
  let current = null;

  lines.slice(2).forEach((line) => {
    if (!line) return;
    if (isMajorWorkoutHeading(line)) {
      current = { heading: line, lines: [] };
      sections.push(current);
      return;
    }
    if (!current) {
      current = { heading: "Overview", lines: [] };
      sections.push(current);
    }
    current.lines.push(line);
  });

  return `
    <div class="workout-day">${escapeHtml(day)}</div>
    <div class="workout-title-line">${escapeHtml(title)}</div>
    <div class="workout-sections">
      ${sections.map(renderWorkoutSection).join("")}
    </div>
  `;
}

function isMajorWorkoutHeading(line) {
  return /^(STRENGTH|CONDITIONING|MOVEMENT PREP|Glute Warmup|General Mobility Test|CORE\/GRIP|RUN|Wall Sit|BUY IN|BUY OUT|BLOCK|FINISHER|Recommended|FOAM ROLL|PACK|\"[^\"]+\")/i.test(line)
    || /^[A-Z][A-Z0-9 ./'()+-]+:$/.test(line);
}

function isInstructionLine(line) {
  return /^(Complete|Cardio|Males|Females|Beginner|Intermediate|Elite|This workout|Calculate|Record|Once you drop|with remaining time|and continue|then)/i.test(line);
}

function renderWorkoutSection(section) {
  return `
    <section class="workout-step">
      <h4>${escapeHtml(section.heading)}</h4>
      <div class="workout-step-lines">
        ${section.lines.map(renderWorkoutLine).join("")}
      </div>
    </section>
  `;
}

function renderWorkoutLine(line) {
  const safeLine = escapeHtml(line);
  if (line.startsWith("*")) {
    return `<div class="workout-note">${safeLine}</div>`;
  }
  if (/track|record|calculate/i.test(line)) {
    return `<div class="workout-track-callout">${safeLine}</div>`;
  }
  if (isInstructionLine(line)) {
    return `<div class="workout-instruction">${safeLine}</div>`;
  }
  if (/^(Min \d+|Rounds? \d|Block \d|[0-9./]+ ?minutes?|[0-9./]+ ?mile|[0-9]+ seconds?)/i.test(line)) {
    return `<div class="workout-timing">${safeLine}</div>`;
  }
  return `<div class="workout-exercise">${safeLine}</div>`;
}

function metricKey(metric) {
  return metric.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function renderMetricField(metric, log) {
  const key = metricKey(metric);
  const value = log.metrics?.[key] || "";
  return `
    <label class="field metric-field">
      <span>${escapeHtml(metric)}</span>
      <input type="text" data-metric-key="${escapeAttribute(key)}" value="${escapeAttribute(value)}" placeholder="${escapeAttribute(metricPlaceholder(metric))}">
    </label>
  `;
}

function metricPlaceholder(metric) {
  const lower = metric.toLowerCase();
  if (lower.includes("time") || lower.includes("run")) return "Example: 34:12";
  if (lower.includes("load") || lower.includes("5rm") || lower.includes("weight")) return "Example: 185 lb";
  if (lower.includes("reps") || lower.includes("amrap")) return "Example: 12 reps";
  if (lower.includes("calories") || lower.includes("output")) return "Example: 48 cals";
  if (lower.includes("rpe")) return "Example: RPE 8";
  return "Enter result";
}

function trackPlaceholder(workout) {
  const joined = workout.track.join("; ");
  return `Example: ${joined}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function exportLog() {
  const payload = workouts.map((workout) => ({
    week: workout.week,
    day: workout.day,
    weekday: workout.weekday,
    title: workout.title,
    type: workout.type,
    ...entryFor(workout.id)
  }));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mtn-tough-pp30-training-log.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Training log exported");
}

function resetLog() {
  const confirmed = window.confirm("Reset all completed workouts, notes, and metric entries?");
  if (!confirmed) return;
  state.log = {};
  fetch("/api/pp30/log", { method: "DELETE", credentials: "same-origin" });
  state.selectedId = workouts[0]?.id || null;
  render();
  showToast("Tracker reset");
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

document.querySelectorAll("[data-week]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-week]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.week = button.dataset.week;
    const first = filteredWorkouts()[0];
    if (first) state.selectedId = first.id;
    render();
  });
});

document.querySelectorAll("[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-type]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.type = button.dataset.type;
    const first = filteredWorkouts()[0];
    if (first) state.selectedId = first.id;
    render();
  });
});

els.search.addEventListener("input", (event) => {
  state.search = event.target.value;
  const first = filteredWorkouts()[0];
  if (first) state.selectedId = first.id;
  render();
});

els.exportBtn.addEventListener("click", exportLog);
els.resetBtn.addEventListener("click", resetLog);
els.mobileViewBtn.addEventListener("click", () => {
  const enabled = document.body.classList.toggle("mobile-preview");
  els.mobileViewBtn.setAttribute("aria-pressed", String(enabled));
  els.mobileViewBtn.querySelector("span").textContent = enabled ? "Desktop" : "Mobile";
  refreshIcons();
});

loadData().catch((error) => {
  console.error(error);
  showToast("Could not load tracker");
});
