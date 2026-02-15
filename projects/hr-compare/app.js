// ── Config ───────────────────────────────────────────
var MAX_HR = 190;
var HR_ZONES = [
  { name: 'Recovery',   shortName: 'Z1', minPct: 0.50, maxPct: 0.60, color: 'rgba(107, 143, 113, 0.18)', borderColor: '#6b8f71' },
  { name: 'Endurance',  shortName: 'Z2', minPct: 0.60, maxPct: 0.70, color: 'rgba(95, 160, 110, 0.18)',  borderColor: '#5fa06e' },
  { name: 'Tempo',      shortName: 'Z3', minPct: 0.70, maxPct: 0.80, color: 'rgba(201, 162, 119, 0.20)', borderColor: '#c9a277' },
  { name: 'Threshold',  shortName: 'Z4', minPct: 0.80, maxPct: 0.90, color: 'rgba(168, 95, 82, 0.18)',   borderColor: '#a85f52' },
  { name: 'VO2 Max',    shortName: 'Z5', minPct: 0.90, maxPct: 1.00, color: 'rgba(138, 65, 52, 0.22)',   borderColor: '#8a4134' }
];

// ── State ────────────────────────────────────────────
var zachData = null;
var chartInstance = null;
var doughnutInstance = null;
var zoneActive = [false, false, false, false, false];
var selectMode = false;
var selectionStart = null;
var selectionEnd = null;
var sustainedEffortRange = null;
var peakIntervalRanges = {};

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadManifest();
  setupEventListeners();
}

// ── Load workout manifest ────────────────────────────
async function loadManifest() {
  try {
    var res = await fetch('workouts/manifest.json');
    var workouts = await res.json();
    var select = document.getElementById('workout-select');

    workouts.forEach(function (w) {
      var opt = document.createElement('option');
      opt.value = w.file;
      opt.textContent = w.name + ' \u2014 ' + w.date;
      select.appendChild(opt);
    });
  } catch (e) {
    console.warn('Could not load workout manifest:', e);
  }
}

// ── Event listeners ──────────────────────────────────
function setupEventListeners() {
  document.getElementById('workout-select').addEventListener('change', onWorkoutSelect);
  document.getElementById('reset-zoom-btn').addEventListener('click', function () {
    if (chartInstance) {
      chartInstance.resetZoom();
      document.getElementById('reset-zoom-btn').classList.add('hidden');
    }
  });
  document.getElementById('select-range-btn').addEventListener('click', toggleSelectMode);
  document.getElementById('clear-segment-btn').addEventListener('click', clearSegment);
  document.getElementById('zone-all-btn').addEventListener('click', toggleAllZones);

  document.querySelectorAll('.zone-pill[data-zone]').forEach(function (pill) {
    pill.addEventListener('click', function () {
      toggleZone(parseInt(pill.dataset.zone, 10));
    });
  });

  // Tooltip click-to-toggle
  document.querySelectorAll('.tooltip-trigger').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var content = btn.closest('.insight-card').querySelector('.tooltip-content');
      var isOpen = !content.classList.contains('hidden');
      // Close all tooltips first
      document.querySelectorAll('.tooltip-content').forEach(function (tc) { tc.classList.add('hidden'); });
      document.querySelectorAll('.tooltip-trigger').forEach(function (tb) { tb.classList.remove('active'); });
      if (!isOpen) {
        content.classList.remove('hidden');
        btn.classList.add('active');
      }
    });
  });

  // Cardiac drift click → highlight halves on chart
  document.getElementById('cardiac-drift').addEventListener('click', function () {
    if (!zachData || !chartInstance) return;
    highlightTimeRange(0, zachData.totalTimeSeconds / 2, 'rgba(107, 143, 113, 0.12)', 'driftFirst');
    highlightTimeRange(zachData.totalTimeSeconds / 2, zachData.totalTimeSeconds, 'rgba(201, 162, 119, 0.12)', 'driftSecond');
    scrollToChart();
  });

  // Sustained effort click → highlight range on chart
  document.getElementById('sustained-effort').addEventListener('click', function () {
    if (!sustainedEffortRange || !chartInstance) return;
    clearHighlights();
    highlightTimeRange(sustainedEffortRange.startTime, sustainedEffortRange.endTime, 'rgba(45, 90, 74, 0.15)', 'sustained');
    scrollToChart();
  });
}

// ── Load Zach's workout from JSON ────────────────────
async function onWorkoutSelect(e) {
  var file = e.target.value;
  var info = document.getElementById('workout-info');

  if (!file) {
    resetDashboard();
    info.textContent = '';
    info.className = 'workout-meta';
    return;
  }

  try {
    var res = await fetch('workouts/' + file);
    zachData = await res.json();
    info.textContent = zachData.name + ' \u2014 ' + zachData.date +
      ' \u2014 ' + zachData.dataPoints.length + ' data points';
    info.className = 'workout-meta success';
    renderDashboard();
  } catch (err) {
    zachData = null;
    info.textContent = 'Error loading workout';
    info.className = 'workout-meta error';
    resetDashboard();
  }
}

// ── Full dashboard render ────────────────────────────
function renderDashboard() {
  if (!zachData) return;

  document.getElementById('chart-section').classList.remove('hidden');
  document.getElementById('stats-section').classList.remove('hidden');
  document.getElementById('insights-section').classList.remove('hidden');

  if (chartInstance) chartInstance.destroy();
  chartInstance = renderChart(zachData);

  var stats = calculateStats(zachData);
  renderStats(stats);

  renderInsights(zachData);

  document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth' });
}

// ── Reset dashboard ──────────────────────────────────
function resetDashboard() {
  zachData = null;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (doughnutInstance) { doughnutInstance.destroy(); doughnutInstance = null; }

  document.getElementById('chart-section').classList.add('hidden');
  document.getElementById('stats-section').classList.add('hidden');
  document.getElementById('insights-section').classList.add('hidden');

  // Reset zone toggles
  zoneActive = [false, false, false, false, false];
  document.querySelectorAll('.zone-pill[data-zone]').forEach(function (pill) {
    pill.classList.remove('active');
    pill.setAttribute('aria-pressed', 'false');
  });

  // Reset select mode and state
  selectMode = false;
  sustainedEffortRange = null;
  peakIntervalRanges = {};
  document.getElementById('select-range-btn').classList.remove('active');
  clearSegment();

  // Close any open tooltips
  document.querySelectorAll('.tooltip-content').forEach(function (tc) { tc.classList.add('hidden'); });
  document.querySelectorAll('.tooltip-trigger').forEach(function (tb) { tb.classList.remove('active'); });
}

// ── Resample data to regular intervals ───────────────
function resampleToInterval(dataPoints, stepSeconds, maxTime) {
  var result = [];
  var dpIndex = 0;

  for (var t = 0; t <= maxTime; t += stepSeconds) {
    while (dpIndex < dataPoints.length - 1 &&
           dataPoints[dpIndex + 1].elapsedSeconds <= t) {
      dpIndex++;
    }

    if (t > dataPoints[dataPoints.length - 1].elapsedSeconds) {
      result.push(null);
    } else if (dpIndex >= dataPoints.length - 1) {
      result.push(dataPoints[dpIndex].hr);
    } else {
      var p1 = dataPoints[dpIndex];
      var p2 = dataPoints[dpIndex + 1];
      var ratio = (t - p1.elapsedSeconds) / (p2.elapsedSeconds - p1.elapsedSeconds);
      result.push(Math.round(p1.hr + ratio * (p2.hr - p1.hr)));
    }
  }

  return result;
}

// ── Format seconds as MM:SS ──────────────────────────
function formatTime(totalSeconds) {
  var mins = Math.floor(totalSeconds / 60);
  var secs = Math.round(totalSeconds % 60);
  return mins + ':' + String(secs).padStart(2, '0');
}

// ── Build zone annotations ───────────────────────────
function buildZoneAnnotations() {
  var annotations = {};
  for (var i = 0; i < HR_ZONES.length; i++) {
    if (!zoneActive[i]) continue;
    var zone = HR_ZONES[i];
    var yMin = Math.round(MAX_HR * zone.minPct);
    var yMax = Math.round(MAX_HR * zone.maxPct);
    annotations['zoneBox' + i] = {
      type: 'box',
      yMin: yMin,
      yMax: yMax,
      backgroundColor: zone.color,
      borderColor: 'transparent'
    };
    annotations['zoneLine' + i] = {
      type: 'line',
      yMin: yMin,
      yMax: yMin,
      borderColor: zone.borderColor,
      borderWidth: 1,
      borderDash: [4, 3]
    };
  }
  return annotations;
}

// ── Render Chart.js line chart ───────────────────────
function renderChart(data) {
  var ctx = document.getElementById('hr-chart').getContext('2d');
  var maxTime = data.dataPoints[data.dataPoints.length - 1].elapsedSeconds;
  var step = 30;
  var labels = [];
  for (var s = 0; s <= maxTime; s += step) {
    labels.push(formatTime(s));
  }

  var resampled = resampleToInterval(data.dataPoints, step, maxTime);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Zach',
        data: resampled,
        borderColor: '#2d5a4a',
        backgroundColor: 'rgba(45, 90, 74, 0.15)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.parsed.y + ' bpm';
            }
          }
        },
        legend: {
          labels: {
            color: '#3d3d3d',
            font: { size: 14, family: "'Inter', sans-serif" }
          }
        },
        annotation: {
          annotations: buildZoneAnnotations()
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x'
          },
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: function () {
              document.getElementById('reset-zoom-btn').classList.remove('hidden');
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Elapsed Time', color: '#6b6b6b', font: { family: "'Inter', sans-serif" } },
          ticks: { color: '#6b6b6b', maxTicksLimit: 15 },
          grid: { color: 'rgba(26, 58, 46, 0.06)' }
        },
        y: {
          title: { display: true, text: 'Heart Rate (bpm)', color: '#6b6b6b', font: { family: "'Inter', sans-serif" } },
          ticks: { color: '#6b6b6b' },
          grid: { color: 'rgba(26, 58, 46, 0.06)' },
          suggestedMin: 60,
          suggestedMax: 200
        }
      }
    }
  });
}

// ── Zone Toggle ──────────────────────────────────────
function toggleZone(index) {
  zoneActive[index] = !zoneActive[index];
  var pill = document.querySelector('.zone-pill[data-zone="' + index + '"]');
  pill.classList.toggle('active');
  pill.setAttribute('aria-pressed', String(zoneActive[index]));
  updateChartAnnotations();
}

function toggleAllZones() {
  var anyActive = zoneActive.some(function (v) { return v; });
  var newState = !anyActive;
  for (var i = 0; i < zoneActive.length; i++) {
    zoneActive[i] = newState;
    var pill = document.querySelector('.zone-pill[data-zone="' + i + '"]');
    pill.classList.toggle('active', newState);
    pill.setAttribute('aria-pressed', String(newState));
  }
  updateChartAnnotations();
}

function updateChartAnnotations() {
  if (!chartInstance) return;
  var annotations = buildZoneAnnotations();
  // Preserve selection annotation if present
  if (chartInstance.options.plugins.annotation.annotations.selectionBox) {
    annotations.selectionBox = chartInstance.options.plugins.annotation.annotations.selectionBox;
  }
  chartInstance.options.plugins.annotation.annotations = annotations;
  chartInstance.update('none');
}

// ── Select Mode ──────────────────────────────────────
function toggleSelectMode() {
  selectMode = !selectMode;
  var btn = document.getElementById('select-range-btn');
  btn.classList.toggle('active', selectMode);

  var canvas = document.getElementById('hr-chart');

  if (selectMode) {
    // Disable zoom/pan when in select mode
    chartInstance.options.plugins.zoom.pan.enabled = false;
    chartInstance.options.plugins.zoom.zoom.wheel.enabled = false;
    chartInstance.options.plugins.zoom.zoom.pinch.enabled = false;
    chartInstance.update('none');

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mousedown', onSelectionStart);
    canvas.addEventListener('mousemove', onSelectionMove);
    canvas.addEventListener('mouseup', onSelectionEnd);
  } else {
    // Re-enable zoom/pan
    chartInstance.options.plugins.zoom.pan.enabled = true;
    chartInstance.options.plugins.zoom.zoom.wheel.enabled = true;
    chartInstance.options.plugins.zoom.zoom.pinch.enabled = true;
    chartInstance.update('none');

    canvas.style.cursor = '';
    canvas.removeEventListener('mousedown', onSelectionStart);
    canvas.removeEventListener('mousemove', onSelectionMove);
    canvas.removeEventListener('mouseup', onSelectionEnd);
  }
}

function onSelectionStart(e) {
  if (!selectMode || !chartInstance) return;
  var rect = e.target.getBoundingClientRect();
  var x = e.clientX - rect.left;
  selectionStart = chartInstance.scales.x.getValueForPixel(x);
  selectionEnd = null;
}

function onSelectionMove(e) {
  if (!selectMode || selectionStart === null || !chartInstance) return;
  var rect = e.target.getBoundingClientRect();
  var x = e.clientX - rect.left;
  selectionEnd = chartInstance.scales.x.getValueForPixel(x);

  // Draw temporary selection box
  var annotations = buildZoneAnnotations();
  var startIdx = Math.min(selectionStart, selectionEnd);
  var endIdx = Math.max(selectionStart, selectionEnd);
  var labels = chartInstance.data.labels;
  annotations.selectionBox = {
    type: 'box',
    xMin: labels[Math.round(startIdx)] || labels[0],
    xMax: labels[Math.round(endIdx)] || labels[labels.length - 1],
    backgroundColor: 'rgba(45, 90, 74, 0.1)',
    borderColor: 'rgba(45, 90, 74, 0.4)',
    borderWidth: 1
  };
  chartInstance.options.plugins.annotation.annotations = annotations;
  chartInstance.update('none');
}

function onSelectionEnd(e) {
  if (!selectMode || selectionStart === null || !chartInstance) return;
  var rect = e.target.getBoundingClientRect();
  var x = e.clientX - rect.left;
  selectionEnd = chartInstance.scales.x.getValueForPixel(x);

  var startIdx = Math.round(Math.min(selectionStart, selectionEnd));
  var endIdx = Math.round(Math.max(selectionStart, selectionEnd));

  // Clamp to valid range
  var maxIdx = chartInstance.data.labels.length - 1;
  startIdx = Math.max(0, Math.min(startIdx, maxIdx));
  endIdx = Math.max(0, Math.min(endIdx, maxIdx));

  if (startIdx === endIdx) {
    selectionStart = null;
    selectionEnd = null;
    return;
  }

  renderSegmentPanel(startIdx, endIdx);
  selectionStart = null;
}

// ── Segment Stats ────────────────────────────────────
function computeSegmentStats(startIdx, endIdx) {
  var data = chartInstance.data.datasets[0].data;
  var labels = chartInstance.data.labels;
  var hrs = [];
  for (var i = startIdx; i <= endIdx; i++) {
    if (data[i] !== null) hrs.push(data[i]);
  }
  if (hrs.length === 0) return null;

  var sum = hrs.reduce(function (a, b) { return a + b; }, 0);
  var avg = Math.round(sum / hrs.length);
  var max = Math.max.apply(null, hrs);
  var min = Math.min.apply(null, hrs);

  // Zone breakdown for selection
  var zoneCounts = [0, 0, 0, 0, 0];
  hrs.forEach(function (hr) {
    for (var z = HR_ZONES.length - 1; z >= 0; z--) {
      if (hr >= Math.round(MAX_HR * HR_ZONES[z].minPct)) {
        zoneCounts[z]++;
        return;
      }
    }
  });

  return {
    startLabel: labels[startIdx],
    endLabel: labels[endIdx],
    avgHR: avg,
    maxHR: max,
    minHR: min,
    count: hrs.length,
    zoneCounts: zoneCounts
  };
}

function renderSegmentPanel(startIdx, endIdx) {
  var stats = computeSegmentStats(startIdx, endIdx);
  if (!stats) return;

  var panel = document.getElementById('segment-panel');
  var container = document.getElementById('segment-stats');

  var zoneHtml = '';
  for (var z = 0; z < HR_ZONES.length; z++) {
    var pct = stats.count > 0 ? Math.round(stats.zoneCounts[z] / stats.count * 100) : 0;
    var dimmed = pct === 0 ? ' dimmed' : '';
    zoneHtml += '<span class="segment-zone' + dimmed + '" style="color: ' + HR_ZONES[z].borderColor + '">' +
      HR_ZONES[z].shortName + ': ' + pct + '%</span>';
  }

  container.innerHTML =
    '<div class="segment-stat"><span class="segment-stat-label">Range</span><span class="segment-stat-value">' + stats.startLabel + ' \u2013 ' + stats.endLabel + '</span></div>' +
    '<div class="segment-stat"><span class="segment-stat-label">Avg HR</span><span class="segment-stat-value">' + stats.avgHR + ' bpm</span></div>' +
    '<div class="segment-stat"><span class="segment-stat-label">Max HR</span><span class="segment-stat-value">' + stats.maxHR + ' bpm</span></div>' +
    '<div class="segment-stat"><span class="segment-stat-label">Min HR</span><span class="segment-stat-value">' + stats.minHR + ' bpm</span></div>' +
    '<div class="segment-stat segment-zones"><span class="segment-stat-label">Zones</span><span class="segment-stat-value">' + zoneHtml + '</span></div>';

  panel.classList.remove('hidden');
}

function clearSegment() {
  document.getElementById('segment-panel').classList.add('hidden');
  document.getElementById('segment-stats').innerHTML = '';
  selectionStart = null;
  selectionEnd = null;

  // Remove selection annotation
  if (chartInstance && chartInstance.options.plugins.annotation.annotations.selectionBox) {
    delete chartInstance.options.plugins.annotation.annotations.selectionBox;
    chartInstance.update('none');
  }
}

// ── Calculate stats for dataset ──────────────────────
function calculateStats(data) {
  var hrs = data.dataPoints.map(function (d) { return d.hr; });
  var sum = hrs.reduce(function (a, b) { return a + b; }, 0);
  var avgHR = Math.round(sum / hrs.length);
  var maxHR = Math.max.apply(null, hrs);
  var maxIndex = hrs.indexOf(maxHR);
  var timeToPeak = data.dataPoints[maxIndex].elapsedSeconds;
  var duration = data.totalTimeSeconds;

  var avgInterval = duration / data.dataPoints.length;
  var redZoneCount = data.dataPoints.filter(function (d) { return d.hr >= 160; }).length;
  var redZoneSeconds = Math.round(redZoneCount * avgInterval);

  return {
    avgHR: avgHR,
    maxHR: maxHR,
    timeToPeak: timeToPeak,
    duration: duration,
    redZoneSeconds: redZoneSeconds
  };
}

// ── Render stats grid ────────────────────────────────
function renderStats(stats) {
  var grid = document.getElementById('stats-grid');

  var metrics = [
    { label: 'Avg Heart Rate', value: stats.avgHR + ' bpm' },
    { label: 'Max Heart Rate', value: stats.maxHR + ' bpm' },
    { label: 'Time to Peak', value: formatTime(stats.timeToPeak) },
    { label: 'Duration', value: formatTime(stats.duration) },
    { label: 'Time in Red Zone', value: formatTime(stats.redZoneSeconds) },
  ];

  var html = '';
  metrics.forEach(function (m) {
    html += '<div class="stat-card">' +
      '<div class="stat-label">' + m.label + '</div>' +
      '<div class="stat-values">' +
        '<span class="stat-zach">' + m.value + '</span>' +
      '</div>' +
    '</div>';
  });

  grid.innerHTML = html;
}

// ── Chart Highlight Helpers ──────────────────────────
function highlightTimeRange(startSeconds, endSeconds, color, id) {
  if (!chartInstance) return;
  var labels = chartInstance.data.labels;
  var step = 30;
  var startIdx = Math.round(startSeconds / step);
  var endIdx = Math.round(endSeconds / step);
  startIdx = Math.max(0, Math.min(startIdx, labels.length - 1));
  endIdx = Math.max(0, Math.min(endIdx, labels.length - 1));

  chartInstance.options.plugins.annotation.annotations['highlight_' + id] = {
    type: 'box',
    xMin: labels[startIdx],
    xMax: labels[endIdx],
    backgroundColor: color,
    borderColor: 'rgba(45, 90, 74, 0.3)',
    borderWidth: 1
  };
  chartInstance.update('none');
}

function clearHighlights() {
  if (!chartInstance) return;
  var annotations = chartInstance.options.plugins.annotation.annotations;
  Object.keys(annotations).forEach(function (key) {
    if (key.indexOf('highlight_') === 0) delete annotations[key];
  });
  chartInstance.update('none');
}

function scrollToChart() {
  document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth' });
}

// ── Performance Insights ─────────────────────────────
function renderInsights(data) {
  renderZoneBreakdown(data);
  renderRecoveryAnalysis(data);
  renderPeakIntervals(data);
  renderCardiacDrift(data);
  renderSustainedEffort(data);
  renderTrimp(data);
}

// ── Card 1: HR Zone Breakdown ────────────────────────
function renderZoneBreakdown(data) {
  var points = data.dataPoints;
  var zoneTimes = [0, 0, 0, 0, 0];
  var belowZoneTime = 0;

  for (var i = 1; i < points.length; i++) {
    var dt = points[i].elapsedSeconds - points[i - 1].elapsedSeconds;
    var hr = points[i].hr;
    var assigned = false;
    for (var z = HR_ZONES.length - 1; z >= 0; z--) {
      if (hr >= Math.round(MAX_HR * HR_ZONES[z].minPct)) {
        zoneTimes[z] += dt;
        assigned = true;
        break;
      }
    }
    if (!assigned) belowZoneTime += dt;
  }

  var totalTime = zoneTimes.reduce(function (a, b) { return a + b; }, 0) + belowZoneTime;

  // Doughnut chart
  var ctx = document.getElementById('zone-doughnut').getContext('2d');
  if (doughnutInstance) doughnutInstance.destroy();

  var doughnutData = zoneTimes.slice();
  if (belowZoneTime > 0) doughnutData.unshift(belowZoneTime);

  var doughnutColors = HR_ZONES.map(function (z) { return z.borderColor; });
  if (belowZoneTime > 0) doughnutColors.unshift('#c0c0c0');

  var doughnutLabels = HR_ZONES.map(function (z) { return z.name; });
  if (belowZoneTime > 0) doughnutLabels.unshift('Below Z1');

  doughnutInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: doughnutLabels,
      datasets: [{
        data: doughnutData,
        backgroundColor: doughnutColors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var val = ctx.parsed;
              var pct = totalTime > 0 ? Math.round(val / totalTime * 100) : 0;
              return ctx.label + ': ' + formatTime(val) + ' (' + pct + '%)';
            }
          }
        }
      }
    }
  });

  // Zone list (clickable — toggles zone band on chart)
  var listEl = document.getElementById('zone-breakdown-list');
  var html = '';
  for (var z = 0; z < HR_ZONES.length; z++) {
    var pct = totalTime > 0 ? Math.round(zoneTimes[z] / totalTime * 100) : 0;
    var dimmed = pct === 0 ? ' dimmed' : '';
    html += '<div class="zone-list-item' + dimmed + '" data-zone-index="' + z + '">' +
      '<span class="zone-list-swatch" style="background: ' + HR_ZONES[z].borderColor + '"></span>' +
      '<span class="zone-list-name">' + HR_ZONES[z].name + '</span>' +
      '<span class="zone-list-time">' + formatTime(zoneTimes[z]) + '</span>' +
      '<span class="zone-list-pct">' + pct + '%</span>' +
    '</div>';
  }
  if (belowZoneTime > 0) {
    var belowPct = Math.round(belowZoneTime / totalTime * 100);
    html += '<div class="zone-list-item dimmed">' +
      '<span class="zone-list-swatch" style="background: #c0c0c0"></span>' +
      '<span class="zone-list-name">Below Z1</span>' +
      '<span class="zone-list-time">' + formatTime(belowZoneTime) + '</span>' +
      '<span class="zone-list-pct">' + belowPct + '%</span>' +
    '</div>';
  }
  listEl.innerHTML = html;

  // Wire up zone list click handlers
  listEl.querySelectorAll('[data-zone-index]').forEach(function (item) {
    item.addEventListener('click', function () {
      var idx = parseInt(item.dataset.zoneIndex, 10);
      toggleZone(idx);
      scrollToChart();
    });
  });
}

// ── Card 2: Recovery Analysis ────────────────────────
function renderRecoveryAnalysis(data) {
  var points = data.dataPoints;
  var threshold = Math.round(MAX_HR * 0.70); // 70% of max HR
  var windowSeconds = 30;
  var recoveryWindow = 60;

  // Find peaks: local max within ±30s where HR >= threshold
  var peaks = [];
  for (var i = 0; i < points.length; i++) {
    if (points[i].hr < threshold) continue;

    var isPeak = true;
    // Scan backward within window
    for (var j = i - 1; j >= 0 && points[i].elapsedSeconds - points[j].elapsedSeconds <= windowSeconds; j--) {
      if (points[j].hr > points[i].hr) { isPeak = false; break; }
    }
    if (!isPeak) continue;
    // Scan forward within window
    for (var j = i + 1; j < points.length && points[j].elapsedSeconds - points[i].elapsedSeconds <= windowSeconds; j++) {
      if (points[j].hr > points[i].hr) { isPeak = false; break; }
    }
    if (isPeak) {
      // Don't add peaks too close together
      if (peaks.length > 0) {
        var lastPeak = peaks[peaks.length - 1];
        if (points[i].elapsedSeconds - lastPeak.time < recoveryWindow) {
          if (points[i].hr > lastPeak.hr) peaks.pop();
          else continue;
        }
      }
      peaks.push({ index: i, time: points[i].elapsedSeconds, hr: points[i].hr });
    }
  }

  // Calculate recovery rate for each peak (HR drop 60s after peak)
  var recoveries = [];
  peaks.forEach(function (peak) {
    var targetTime = peak.time + recoveryWindow;
    var hrAfter = null;

    for (var i = peak.index; i < points.length; i++) {
      if (points[i].elapsedSeconds >= targetTime) {
        hrAfter = points[i].hr;
        break;
      }
    }

    if (hrAfter !== null) {
      var drop = peak.hr - hrAfter;
      recoveries.push({
        peakTime: peak.time,
        peakHR: peak.hr,
        recoveryHR: hrAfter,
        drop: drop
      });
    }
  });

  var metricsEl = document.getElementById('recovery-metrics');
  var tableEl = document.getElementById('recovery-table-wrapper');

  if (recoveries.length === 0) {
    metricsEl.innerHTML = '<p class="no-data-msg">No significant HR peaks detected for recovery analysis.</p>';
    tableEl.innerHTML = '';
    return;
  }

  var drops = recoveries.map(function (r) { return r.drop; });
  var avgDrop = Math.round(drops.reduce(function (a, b) { return a + b; }, 0) / drops.length);
  var bestDrop = Math.max.apply(null, drops);

  metricsEl.innerHTML =
    '<div class="recovery-metric">' +
      '<span class="recovery-metric-label">Avg 60s Recovery</span>' +
      '<span class="recovery-metric-value">' + avgDrop + ' bpm drop</span>' +
    '</div>' +
    '<div class="recovery-metric">' +
      '<span class="recovery-metric-label">Best Recovery</span>' +
      '<span class="recovery-metric-value">' + bestDrop + ' bpm drop</span>' +
    '</div>' +
    '<div class="recovery-metric">' +
      '<span class="recovery-metric-label">Peaks Analyzed</span>' +
      '<span class="recovery-metric-value">' + recoveries.length + '</span>' +
    '</div>';

  // Sort by drop descending, show top 5
  var topRecoveries = recoveries.slice().sort(function (a, b) { return b.drop - a.drop; }).slice(0, 5);

  var tableHtml = '<table class="recovery-table">' +
    '<thead><tr><th>Peak Time</th><th>Peak HR</th><th>After 60s</th><th>Drop</th></tr></thead><tbody>';
  topRecoveries.forEach(function (r) {
    tableHtml += '<tr data-peak-time="' + r.peakTime + '">' +
      '<td>' + formatTime(r.peakTime) + '</td>' +
      '<td>' + r.peakHR + ' bpm</td>' +
      '<td>' + r.recoveryHR + ' bpm</td>' +
      '<td>' + r.drop + ' bpm</td>' +
    '</tr>';
  });
  tableHtml += '</tbody></table>';
  tableEl.innerHTML = tableHtml;

  // Wire up row click → highlight peak + 60s recovery window on chart
  tableEl.querySelectorAll('tr[data-peak-time]').forEach(function (row) {
    row.addEventListener('click', function () {
      var peakTime = parseFloat(row.dataset.peakTime);
      clearHighlights();
      highlightTimeRange(peakTime, peakTime + 60, 'rgba(168, 95, 82, 0.15)', 'recovery');
      scrollToChart();
    });
  });
}

// ── Card 3: Peak Intervals ──────────────────────────
function renderPeakIntervals(data) {
  var points = data.dataPoints;
  var container = document.getElementById('peak-intervals');
  var duration = data.totalTimeSeconds;
  var html = '';
  peakIntervalRanges = {};

  // 1-minute peak
  var oneMin = findPeakInterval(points, 60);
  if (oneMin) {
    peakIntervalRanges['1min'] = oneMin;
    html += '<div class="peak-interval-card" data-peak-key="1min">' +
      '<h4>Hardest 1 Minute</h4>' +
      '<div class="peak-interval-stats">' +
        '<div class="peak-stat"><span class="peak-stat-label">Time</span><span class="peak-stat-value">' + formatTime(oneMin.startTime) + ' \u2013 ' + formatTime(oneMin.endTime) + '</span></div>' +
        '<div class="peak-stat"><span class="peak-stat-label">Avg HR</span><span class="peak-stat-value">' + oneMin.avgHR + ' bpm</span></div>' +
        '<div class="peak-stat"><span class="peak-stat-label">Max HR</span><span class="peak-stat-value">' + oneMin.maxHR + ' bpm</span></div>' +
      '</div>' +
    '</div>';
  }

  // 5-minute peak (only if workout >= 5 min)
  if (duration >= 300) {
    var fiveMin = findPeakInterval(points, 300);
    if (fiveMin) {
      peakIntervalRanges['5min'] = fiveMin;
      html += '<div class="peak-interval-card" data-peak-key="5min">' +
        '<h4>Hardest 5 Minutes</h4>' +
        '<div class="peak-interval-stats">' +
          '<div class="peak-stat"><span class="peak-stat-label">Time</span><span class="peak-stat-value">' + formatTime(fiveMin.startTime) + ' \u2013 ' + formatTime(fiveMin.endTime) + '</span></div>' +
          '<div class="peak-stat"><span class="peak-stat-label">Avg HR</span><span class="peak-stat-value">' + fiveMin.avgHR + ' bpm</span></div>' +
          '<div class="peak-stat"><span class="peak-stat-label">Max HR</span><span class="peak-stat-value">' + fiveMin.maxHR + ' bpm</span></div>' +
        '</div>' +
      '</div>';
    }
  } else {
    html += '<div class="peak-interval-card">' +
      '<h4>Hardest 5 Minutes</h4>' +
      '<p class="no-data-msg">Workout is shorter than 5 minutes.</p>' +
    '</div>';
  }

  container.innerHTML = html;

  // Wire up click → highlight on chart
  container.querySelectorAll('[data-peak-key]').forEach(function (card) {
    card.addEventListener('click', function () {
      var range = peakIntervalRanges[card.dataset.peakKey];
      if (!range) return;
      clearHighlights();
      highlightTimeRange(range.startTime, range.endTime, 'rgba(168, 95, 82, 0.15)', 'peak');
      scrollToChart();
    });
  });
}

function findPeakInterval(points, windowSeconds) {
  if (points.length === 0) return null;

  var bestAvg = -1;
  var bestStart = 0;
  var bestEnd = 0;

  for (var i = 0; i < points.length; i++) {
    var startTime = points[i].elapsedSeconds;
    var endTime = startTime + windowSeconds;
    var sum = 0;
    var count = 0;
    var maxHR = 0;
    var lastJ = i;

    for (var j = i; j < points.length; j++) {
      if (points[j].elapsedSeconds > endTime) break;
      sum += points[j].hr;
      count++;
      if (points[j].hr > maxHR) maxHR = points[j].hr;
      lastJ = j;
    }

    if (count > 0) {
      var avg = sum / count;
      // Only consider if window actually covers reasonable portion of the target duration
      var actualDuration = points[lastJ].elapsedSeconds - startTime;
      if (actualDuration >= windowSeconds * 0.5 && avg > bestAvg) {
        bestAvg = avg;
        bestStart = i;
        bestEnd = lastJ;
      }
    }
  }

  if (bestAvg < 0) return null;

  // Find max HR within the best window
  var bestMaxHR = 0;
  for (var k = bestStart; k <= bestEnd; k++) {
    if (points[k].hr > bestMaxHR) bestMaxHR = points[k].hr;
  }

  return {
    startTime: points[bestStart].elapsedSeconds,
    endTime: points[bestEnd].elapsedSeconds,
    avgHR: Math.round(bestAvg),
    maxHR: bestMaxHR
  };
}

// ── Card 4: Cardiac Drift ───────────────────────────
function renderCardiacDrift(data) {
  var points = data.dataPoints;
  var container = document.getElementById('cardiac-drift');
  var duration = data.totalTimeSeconds;

  if (duration < 600) {
    container.innerHTML = '<p class="no-data-msg">Workout is too short for cardiac drift analysis (need 10+ minutes).</p>';
    return;
  }

  var midTime = duration / 2;

  // Calculate avg HR for first and second half
  var firstSum = 0, firstCount = 0;
  var secondSum = 0, secondCount = 0;

  for (var i = 0; i < points.length; i++) {
    if (points[i].elapsedSeconds <= midTime) {
      firstSum += points[i].hr;
      firstCount++;
    } else {
      secondSum += points[i].hr;
      secondCount++;
    }
  }

  if (firstCount === 0 || secondCount === 0) {
    container.innerHTML = '<p class="no-data-msg">Not enough data for drift analysis.</p>';
    return;
  }

  var firstAvg = firstSum / firstCount;
  var secondAvg = secondSum / secondCount;
  var driftBpm = secondAvg - firstAvg;
  var driftPct = (driftBpm / firstAvg) * 100;

  // Rating
  var rating, ratingClass;
  if (driftPct <= 5) {
    rating = 'Excellent';
    ratingClass = 'drift-excellent';
  } else if (driftPct <= 10) {
    rating = 'Normal';
    ratingClass = 'drift-normal';
  } else {
    rating = 'Needs Work';
    ratingClass = 'drift-high';
  }

  container.innerHTML =
    '<div class="drift-rating ' + ratingClass + '">' +
      '<span class="drift-pct">' + (driftPct >= 0 ? '+' : '') + driftPct.toFixed(1) + '%</span>' +
      '<span class="drift-label">' + rating + '</span>' +
    '</div>' +
    '<div class="drift-details">' +
      '<div class="drift-detail"><span class="drift-detail-label">1st Half Avg</span><span class="drift-detail-value">' + Math.round(firstAvg) + ' bpm</span></div>' +
      '<div class="drift-detail"><span class="drift-detail-label">2nd Half Avg</span><span class="drift-detail-value">' + Math.round(secondAvg) + ' bpm</span></div>' +
      '<div class="drift-detail"><span class="drift-detail-label">HR Change</span><span class="drift-detail-value">' + (driftBpm >= 0 ? '+' : '') + driftBpm.toFixed(1) + ' bpm</span></div>' +
    '</div>';
}

// ── Card 5: Longest Sustained Effort ────────────────
function renderSustainedEffort(data) {
  var points = data.dataPoints;
  var container = document.getElementById('sustained-effort');

  // Z2 + Z3 range: 60-80% of MAX_HR
  var aerobicMin = Math.round(MAX_HR * 0.60); // 114 bpm
  var aerobicMax = Math.round(MAX_HR * 0.80); // 152 bpm

  var bestStart = -1, bestEnd = -1, bestDuration = 0;
  var curStart = -1;

  for (var i = 0; i < points.length; i++) {
    var inZone = points[i].hr >= aerobicMin && points[i].hr <= aerobicMax;

    if (inZone) {
      if (curStart === -1) curStart = i;
      var curDuration = points[i].elapsedSeconds - points[curStart].elapsedSeconds;
      if (curDuration > bestDuration) {
        bestDuration = curDuration;
        bestStart = curStart;
        bestEnd = i;
      }
    } else {
      curStart = -1;
    }
  }

  if (bestStart === -1 || bestDuration < 30) {
    sustainedEffortRange = null;
    container.innerHTML = '<p class="no-data-msg">No sustained aerobic effort (Z2–Z3) detected in this workout.</p>';
    return;
  }

  sustainedEffortRange = { startTime: points[bestStart].elapsedSeconds, endTime: points[bestEnd].elapsedSeconds };

  // Compute avg HR during the sustained stretch
  var sum = 0, count = 0;
  for (var i = bestStart; i <= bestEnd; i++) {
    sum += points[i].hr;
    count++;
  }
  var avgHR = Math.round(sum / count);

  // Rating
  var rating, ratingClass;
  if (bestDuration >= 3600) {
    rating = 'Elite';
    ratingClass = 'sustained-elite';
  } else if (bestDuration >= 1800) {
    rating = 'Strong';
    ratingClass = 'sustained-strong';
  } else if (bestDuration >= 600) {
    rating = 'Building';
    ratingClass = 'sustained-building';
  } else {
    rating = 'Developing';
    ratingClass = 'sustained-developing';
  }

  container.innerHTML =
    '<div class="sustained-rating ' + ratingClass + '">' +
      '<span class="sustained-duration">' + formatTime(bestDuration) + '</span>' +
      '<span class="sustained-label">' + rating + '</span>' +
    '</div>' +
    '<div class="sustained-details">' +
      '<div class="sustained-detail"><span class="sustained-detail-label">Time Range</span><span class="sustained-detail-value">' + formatTime(points[bestStart].elapsedSeconds) + ' \u2013 ' + formatTime(points[bestEnd].elapsedSeconds) + '</span></div>' +
      '<div class="sustained-detail"><span class="sustained-detail-label">Avg HR</span><span class="sustained-detail-value">' + avgHR + ' bpm</span></div>' +
      '<div class="sustained-detail"><span class="sustained-detail-label">Target Zone</span><span class="sustained-detail-value">Z2\u2013Z3 (' + aerobicMin + '\u2013' + aerobicMax + ' bpm)</span></div>' +
    '</div>';
}

// ── Card 6: TRIMP Score ─────────────────────────────
function renderTrimp(data) {
  var points = data.dataPoints;
  var container = document.getElementById('trimp-score');

  // Zone-based TRIMP (Lucia's method): time in each zone * zone weight
  var ZONE_WEIGHTS = [1, 2, 3, 4, 5];
  var zoneMins = [0, 0, 0, 0, 0];
  var belowMins = 0;

  for (var i = 1; i < points.length; i++) {
    var dt = (points[i].elapsedSeconds - points[i - 1].elapsedSeconds) / 60; // minutes
    var hr = points[i].hr;
    var assigned = false;
    for (var z = HR_ZONES.length - 1; z >= 0; z--) {
      if (hr >= Math.round(MAX_HR * HR_ZONES[z].minPct)) {
        zoneMins[z] += dt;
        assigned = true;
        break;
      }
    }
    if (!assigned) belowMins += dt;
  }

  var trimp = 0;
  var breakdown = [];
  for (var z = 0; z < HR_ZONES.length; z++) {
    var contribution = Math.round(zoneMins[z] * ZONE_WEIGHTS[z]);
    trimp += contribution;
    breakdown.push({ zone: HR_ZONES[z], mins: zoneMins[z], weight: ZONE_WEIGHTS[z], contribution: contribution });
  }

  trimp = Math.round(trimp);

  // Rating
  var rating, ratingClass;
  if (trimp >= 300) {
    rating = 'Very Hard';
    ratingClass = 'trimp-very-hard';
  } else if (trimp >= 200) {
    rating = 'Hard';
    ratingClass = 'trimp-hard';
  } else if (trimp >= 100) {
    rating = 'Moderate';
    ratingClass = 'trimp-moderate';
  } else {
    rating = 'Easy';
    ratingClass = 'trimp-easy';
  }

  var breakdownHtml = '';
  breakdown.forEach(function (b) {
    var dimmed = b.contribution === 0 ? ' dimmed' : '';
    breakdownHtml += '<div class="trimp-zone-row' + dimmed + '">' +
      '<span class="trimp-zone-swatch" style="background: ' + b.zone.borderColor + '"></span>' +
      '<span class="trimp-zone-name">' + b.zone.shortName + '</span>' +
      '<span class="trimp-zone-calc">' + b.mins.toFixed(1) + 'm \u00d7 ' + b.weight + '</span>' +
      '<span class="trimp-zone-val">' + b.contribution + '</span>' +
    '</div>';
  });

  container.innerHTML =
    '<div class="trimp-rating ' + ratingClass + '">' +
      '<span class="trimp-value">' + trimp + '</span>' +
      '<span class="trimp-label">' + rating + '</span>' +
    '</div>' +
    '<div class="trimp-breakdown">' + breakdownHtml + '</div>';
}
