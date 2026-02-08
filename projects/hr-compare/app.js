// ── State ────────────────────────────────────────────
let zachData = null;
let visitorData = null;
let chartInstance = null;

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadManifest();
  setupEventListeners();
}

// ── Load workout manifest ────────────────────────────
async function loadManifest() {
  try {
    const res = await fetch('workouts/manifest.json');
    const workouts = await res.json();
    const select = document.getElementById('workout-select');

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
  var uploadZone = document.getElementById('upload-zone');
  var fileInput = document.getElementById('tcx-input');
  var select = document.getElementById('workout-select');
  var compareBtn = document.getElementById('compare-btn');

  // Click to browse
  uploadZone.addEventListener('click', function () {
    fileInput.click();
  });

  // Drag and drop
  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', function () {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    var file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.tcx')) {
      handleTCXFile(file);
    }
  });

  fileInput.addEventListener('change', function (e) {
    if (e.target.files[0]) handleTCXFile(e.target.files[0]);
  });

  // Workout selection
  select.addEventListener('change', onWorkoutSelect);

  // Compare button
  compareBtn.addEventListener('click', onCompareClick);

  // View solo button
  document.getElementById('view-btn').addEventListener('click', onViewClick);
}

// ── Load Zach's workout from JSON ────────────────────
async function onWorkoutSelect(e) {
  var file = e.target.value;
  var info = document.getElementById('workout-info');

  if (!file) {
    zachData = null;
    info.textContent = '';
    info.className = 'workout-meta';
    updateCompareButton();
    return;
  }

  try {
    var res = await fetch('workouts/' + file);
    zachData = await res.json();
    info.textContent = zachData.name + ' \u2014 ' + zachData.date +
      ' \u2014 ' + zachData.dataPoints.length + ' data points';
    info.className = 'workout-meta success';
  } catch (err) {
    zachData = null;
    info.textContent = 'Error loading workout';
    info.className = 'workout-meta error';
  }

  updateCompareButton();
}

// ── Handle uploaded TCX file ─────────────────────────
function handleTCXFile(file) {
  var info = document.getElementById('upload-info');
  var reader = new FileReader();

  reader.onload = function (e) {
    try {
      visitorData = parseTCX(e.target.result);
      info.textContent = visitorData.sport + ' \u2014 ' + visitorData.date +
        ' \u2014 ' + visitorData.dataPoints.length + ' data points';
      info.className = 'workout-meta success';
    } catch (err) {
      visitorData = null;
      info.textContent = 'Error: ' + err.message;
      info.className = 'workout-meta error';
    }
    updateCompareButton();
  };

  reader.readAsText(file);
}

// ── TCX Parser ───────────────────────────────────────
function parseTCX(xmlString) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(xmlString, 'application/xml');

  var parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid TCX file');
  }

  var ns = 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2';

  var activity = doc.getElementsByTagNameNS(ns, 'Activity')[0];
  var sport = activity ? activity.getAttribute('Sport') : 'Unknown';

  var idEl = doc.getElementsByTagNameNS(ns, 'Id')[0];
  var activityDate = idEl ? idEl.textContent : '';

  var trackpoints = doc.getElementsByTagNameNS(ns, 'Trackpoint');
  var dataPoints = [];
  var startTime = null;

  for (var i = 0; i < trackpoints.length; i++) {
    var tp = trackpoints[i];
    var timeEl = tp.getElementsByTagNameNS(ns, 'Time')[0];
    var hrEl = tp.getElementsByTagNameNS(ns, 'HeartRateBpm')[0];

    if (!timeEl || !hrEl) continue;

    var time = new Date(timeEl.textContent);
    var valEl = hrEl.getElementsByTagNameNS(ns, 'Value')[0];
    var hr = parseInt(valEl.textContent, 10);

    if (startTime === null) startTime = time;

    var elapsedSeconds = (time - startTime) / 1000;
    dataPoints.push({ elapsedSeconds: elapsedSeconds, hr: hr });
  }

  if (dataPoints.length === 0) {
    throw new Error('No heart rate data found in file');
  }

  return {
    name: sport,
    date: activityDate.split('T')[0],
    sport: sport,
    totalTimeSeconds: dataPoints[dataPoints.length - 1].elapsedSeconds,
    dataPoints: dataPoints
  };
}

// ── Button states ────────────────────────────────────
function updateCompareButton() {
  document.getElementById('compare-btn').disabled = !(zachData && visitorData);
  document.getElementById('view-btn').disabled = !zachData;
}

// ── View Zach's data solo ────────────────────────────
function onViewClick() {
  if (chartInstance) {
    chartInstance.destroy();
  }

  document.getElementById('chart-section').classList.remove('hidden');
  document.getElementById('stats-section').classList.remove('hidden');

  chartInstance = renderSoloChart(zachData);

  var zachStats = calculateStats(zachData);
  renderSoloStats(zachStats);

  document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth' });
}

// ── Run comparison ───────────────────────────────────
function onCompareClick() {
  if (chartInstance) {
    chartInstance.destroy();
  }

  document.getElementById('chart-section').classList.remove('hidden');
  document.getElementById('stats-section').classList.remove('hidden');

  var visitorName = document.getElementById('athlete-name').value || 'You';

  chartInstance = renderChart(zachData, visitorData, visitorName);

  var zachStats = calculateStats(zachData);
  var visitorStats = calculateStats(visitorData);
  renderStats(zachStats, visitorStats, visitorName);

  document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth' });
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

// ── Render Chart.js dual-line chart ──────────────────
function renderChart(zach, visitor, visitorName) {
  var ctx = document.getElementById('hr-chart').getContext('2d');

  var maxTime = Math.max(
    zach.dataPoints[zach.dataPoints.length - 1].elapsedSeconds,
    visitor.dataPoints[visitor.dataPoints.length - 1].elapsedSeconds
  );

  var step = 30;
  var labels = [];
  for (var s = 0; s <= maxTime; s += step) {
    labels.push(formatTime(s));
  }

  var zachResampled = resampleToInterval(zach.dataPoints, step, maxTime);
  var visitorResampled = resampleToInterval(visitor.dataPoints, step, maxTime);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Zach',
          data: zachResampled,
          borderColor: '#2d5a4a',
          backgroundColor: 'rgba(45, 90, 74, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false
        },
        {
          label: visitorName,
          data: visitorResampled,
          borderColor: '#a85f52',
          backgroundColor: 'rgba(168, 95, 82, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: false
        }
      ]
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
              return ctx.dataset.label + ': ' + ctx.parsed.y + ' bpm';
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
          annotations: {
            redZoneBox: {
              type: 'box',
              yMin: 160,
              yMax: 220,
              backgroundColor: 'rgba(168, 95, 82, 0.08)',
              borderColor: 'transparent'
            },
            redZoneLine: {
              type: 'line',
              yMin: 160,
              yMax: 160,
              borderColor: 'rgba(168, 95, 82, 0.4)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: 'Red Zone (160 bpm)',
                position: 'start',
                backgroundColor: 'rgba(168, 95, 82, 0.85)',
                color: '#fff',
                font: { size: 11, family: "'Inter', sans-serif" },
                padding: { top: 4, bottom: 4, left: 8, right: 8 }
              }
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

// ── Calculate stats for one dataset ──────────────────
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
function renderStats(zachStats, visitorStats, visitorName) {
  var grid = document.getElementById('stats-grid');

  var metrics = [
    { label: 'Avg Heart Rate', zach: zachStats.avgHR + ' bpm', visitor: visitorStats.avgHR + ' bpm', zachVal: zachStats.avgHR, visitorVal: visitorStats.avgHR },
    { label: 'Max Heart Rate', zach: zachStats.maxHR + ' bpm', visitor: visitorStats.maxHR + ' bpm', zachVal: zachStats.maxHR, visitorVal: visitorStats.maxHR },
    { label: 'Time to Peak', zach: formatTime(zachStats.timeToPeak), visitor: formatTime(visitorStats.timeToPeak), zachVal: zachStats.timeToPeak, visitorVal: visitorStats.timeToPeak },
    { label: 'Duration', zach: formatTime(zachStats.duration), visitor: formatTime(visitorStats.duration), zachVal: zachStats.duration, visitorVal: visitorStats.duration },
    { label: 'Time in Red Zone', zach: formatTime(zachStats.redZoneSeconds), visitor: formatTime(visitorStats.redZoneSeconds), zachVal: zachStats.redZoneSeconds, visitorVal: visitorStats.redZoneSeconds },
  ];

  var html = '';
  metrics.forEach(function (m) {
    var zachHigher = m.zachVal > m.visitorVal ? ' stat-higher' : '';
    var visitorHigher = m.visitorVal > m.zachVal ? ' stat-higher' : '';

    html += '<div class="stat-card">' +
      '<div class="stat-label">' + m.label + '</div>' +
      '<div class="stat-values">' +
        '<span class="stat-zach' + zachHigher + '">' + m.zach +
          '<span class="stat-name">Zach</span></span>' +
        '<span class="stat-visitor' + visitorHigher + '">' + m.visitor +
          '<span class="stat-name">' + visitorName + '</span></span>' +
      '</div>' +
    '</div>';
  });

  grid.innerHTML = html;
}

// ── Render solo chart (Zach only) ────────────────────
function renderSoloChart(zach) {
  var ctx = document.getElementById('hr-chart').getContext('2d');

  var maxTime = zach.dataPoints[zach.dataPoints.length - 1].elapsedSeconds;

  var step = 30;
  var labels = [];
  for (var s = 0; s <= maxTime; s += step) {
    labels.push(formatTime(s));
  }

  var zachResampled = resampleToInterval(zach.dataPoints, step, maxTime);

  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Zach',
          data: zachResampled,
          borderColor: '#2d5a4a',
          backgroundColor: 'rgba(45, 90, 74, 0.15)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.3,
          fill: true
        }
      ]
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
          annotations: {
            redZoneBox: {
              type: 'box',
              yMin: 160,
              yMax: 220,
              backgroundColor: 'rgba(168, 95, 82, 0.08)',
              borderColor: 'transparent'
            },
            redZoneLine: {
              type: 'line',
              yMin: 160,
              yMax: 160,
              borderColor: 'rgba(168, 95, 82, 0.4)',
              borderWidth: 2,
              borderDash: [6, 4],
              label: {
                display: true,
                content: 'Red Zone (160 bpm)',
                position: 'start',
                backgroundColor: 'rgba(168, 95, 82, 0.85)',
                color: '#fff',
                font: { size: 11, family: "'Inter', sans-serif" },
                padding: { top: 4, bottom: 4, left: 8, right: 8 }
              }
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

// ── Render solo stats (Zach only) ────────────────────
function renderSoloStats(stats) {
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
        '<span class="stat-zach">' + m.value +
          '<span class="stat-name">Zach</span></span>' +
      '</div>' +
    '</div>';
  });

  grid.innerHTML = html;
}
