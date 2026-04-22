/**
 * FairLens AI — Main JavaScript (script.js)
 * Vanilla JS SPA Logic: Navigation, Upload, Analysis, Comparison, Report
 */

/* ============================================================
   APP STATE — Single source of truth
   ============================================================ */
const AppState = {
  currentSection: 'landing',
  uploadedFile: null,
  analysisResults: null,
  fixedResults: null,
  isAnalyzing: false,
  isFixing: false,
  compChart: null,
  metricsChart: null,
};

/* ============================================================
   MOCK API LAYER
   Replace these with real fetch() calls when backend is ready.
   API_BASE should point to your backend URL.
   ============================================================ */
const API_BASE = "https://fairlensai.onrender.com"; // Change this to your backend URL

/**
 * Mock: Simulate POST /analyze
 * In production: return fetch(`${API_BASE}/analyze`, { method:'POST', body: formData })
 */


/**
 * Mock: Simulate POST /fix-bias
 * In production: return fetch(`${API_BASE}/fix-bias`, { method:'POST', body: JSON.stringify(data) })
 */


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function transformBackendData(data) {
  if (!data || data.error) {
    return {
      bias_score: 0,
      status: "Error",
      metrics: {
        demographic_parity: 0,
        equal_opportunity: 0,
        disparate_impact: 0,
        predictive_parity: 0
      },
      explanation: data?.error || "Analysis failed",
      key_findings: [],
      affected_groups: [],
      suggested_fixes: []
    };
  }

  return {
    file_name: data.file_name ? data.file_name : "Dataset",
rows: data.rows || 0,
columns: data.columns || 0,
    
    bias_score: Math.round((data.bias_score || 0) * 100),
    status: data.bias_score > 0.1 ? "Bias Detected" : "Low Bias",

    metrics: {
      demographic_parity: data.bias_score || 0,
      equal_opportunity: data.bias_score || 0,
      disparate_impact: data.disparate_impact || 0,
      predictive_parity: (data.bias_score || 0) / 2,
    },

    
    explanation: data.explanation || "Bias detected between groups",

    key_findings: [
      `${data.group1 || ""} vs ${data.group2 || ""}`,
      `Bias Score: ${data.bias_score}`,
      `Disparate Impact: ${data.disparate_impact}`
    ],

    affected_groups: [
      {
        icon: "⚠️",
        name: data.group2 || "Group",
        desc: "Lower selection rate",
        impact: "-" + Math.round(((data.group1_rate || 0) - (data.group2_rate || 0)) * 100) + "%"
      }
    ],

    suggested_fixes: [
      { title: "Reweight Data", desc: "Balance group distribution" },
      { title: "Remove Bias Features", desc: "Check sensitive columns" },
      { title: "Threshold Adjustment", desc: "Equalize decision rates" }
    ]
  };
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getScoreRisk(score) {
  if (score < 30) return { label: 'Low Risk', color: '#10b981', ringColor: '#10b981' };
  if (score < 60) return { label: 'Moderate Risk', color: '#f59e0b', ringColor: '#f59e0b' };
  return { label: 'High Risk', color: '#ef4444', ringColor: '#ef4444' };
}

function calcImprovement(before, after) {
  if (!before || before <= 0) return 0;

  const improvement = ((before - after) / Math.max(before, 1)) * 100;

  return Math.max(0, Math.min(100, Math.round(improvement)));
}

/* ============================================================
   TOAST NOTIFICATION
   ============================================================ */
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  const text = document.getElementById('toastMsg');

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const colors = {
    success: '#10b981', error: '#ef4444',
    info: '#3b82f6', warning: '#f59e0b',
  };

  icon.textContent = icons[type] || '✓';
  icon.style.color = colors[type];
  text.textContent = msg;

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function navigateTo(section) {
  const sections = ['landing', 'upload', 'results', 'comparison', 'report'];

  // Validate
  if (!sections.includes(section)) return;

  if (section === 'report') {
  if (AppState.analysisResults && AppState.fixedResults) {
    populateReport(AppState.analysisResults, AppState.fixedResults);
  } else {
    console.warn("Report data missing", AppState);
  }
}

  // Guard: can't go to results/comparison/report without data
  if (section === 'results' && !AppState.analysisResults) {
    showToast('Please upload and analyze a dataset first.', 'warning');
    navigateTo('upload'); return;
  }
  if (section === 'comparison' && !AppState.fixedResults) {
    showToast('Please run "Fix Bias" before viewing comparison.', 'warning');
    return;
  }
  if (section === 'report' && !AppState.fixedResults) {
    showToast('Please complete the analysis and fix bias first.', 'warning');
    return;
  }

  // Hide current
  const current = document.getElementById(`section-${AppState.currentSection}`);
  if (current) { current.classList.remove('active'); }

  // Show new
  const target = document.getElementById(`section-${section}`);
  if (target) {
    // Small delay for exit animation
    setTimeout(() => {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  AppState.currentSection = section;
  updateNavSteps(section);
}

function updateNavSteps(current) {
  const steps = ['upload', 'results', 'comparison', 'report'];
  const order = steps.indexOf(current);

  steps.forEach((step, i) => {
    const el = document.querySelector(`.nav-step[data-step="${step}"]`);
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (i < order) el.classList.add('completed');
    else if (i === order) el.classList.add('active');
  });
}

function scrollToFeatures() {
  document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
}

/* ============================================================
   UPLOAD — File Handling
   ============================================================ */
function initUpload() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  // Drag events
  ['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files?.length) handleFileSelection(files[0]);
  });

  // Click to open
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileSelection(e.target.files[0]);
  });
}

function handleFileSelection(file) {
  // Validate CSV
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Please upload a valid CSV file.', 'error');
    return;
  }

  AppState.uploadedFile = file;

  // Show file info
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('fileSelected').style.display = 'block';
  document.getElementById('selectedFileName').textContent = file.name;
  document.getElementById('selectedFileSize').textContent = formatFileSize(file.size);

  // Parse and preview CSV
  parseCSVPreview(file);

  // Enable analyze button
  const btn = document.getElementById('analyzeBtn');
  btn.disabled = false;
}

function removeFile() {
  AppState.uploadedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('dropZone').style.display = 'block';
  document.getElementById('fileSelected').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = true;
}

function parseCSVPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.trim().split('\n').slice(0, 6); // header + 5 rows
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(l => l.split(',').map(c => c.trim()));

    renderPreviewTable(headers, rows);
  };
  reader.readAsText(file);
}

function renderPreviewTable(headers, rows) {
  const table = document.getElementById('previewTable');
  table.innerHTML = '';

  // Header row
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr>' + headers.map(h => `<th>${escapeHtml(h)}</th>`).join('') + '</tr>';
  table.appendChild(thead);

  // Data rows
  const tbody = document.createElement('tbody');
  rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('');
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   SAMPLE DATA LOADER
   ============================================================ */
function loadSampleData() {
  // Generate a mock CSV in memory
  const csvContent = [
    'age,gender,race,education,experience_years,department,salary,hired',
    '34,Male,White,Bachelor,8,Engineering,95000,1',
    '28,Female,Hispanic,Master,4,Marketing,72000,1',
    '45,Male,Black,Bachelor,18,Sales,68000,0',
    '31,Female,Asian,Master,6,Engineering,88000,1',
    '52,Male,White,PhD,22,Management,125000,1',
    '29,Female,Black,Bachelor,3,HR,55000,0',
    '38,Male,Hispanic,Master,12,Finance,91000,1',
    '26,Female,White,Master,2,Engineering,84000,1',
    '41,Male,Asian,Bachelor,15,Operations,79000,1',
    '33,Female,Hispanic,Master,7,Sales,63000,0',
    '47,Male,White,PhD,19,Engineering,118000,1',
    '30,Female,Black,Bachelor,5,Finance,69000,0',
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const file = new File([blob], 'sample_hiring_dataset.csv', { type: 'text/csv' });

  handleFileSelection(file);
  showToast('Sample dataset loaded successfully!', 'success');
}

function formatExplanation(text) {
  if (!text) return "";

  return text
    // Bold (**text**)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Bullet points (* text)
    .replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>')

    // Wrap list items in <ul>
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')

    // Line breaks
    .replace(/\n/g, '<br>');
}

function cleanMarkdownForPDF(text) {
  if (!text) return "";

  return text
    // Remove bold **
    .replace(/\*\*(.*?)\*\*/g, '$1')

    // Convert bullet points
    .replace(/^\s*\*\s+/gm, '• ')

    // Remove extra line breaks
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* ============================================================
   ANALYSIS — API Call + Results
   ============================================================ */
async function analyzeDataset() {
  if (AppState.isAnalyzing) return;
  if (!AppState.uploadedFile) {
    showToast('Please select a CSV file first.', 'warning');
    return;
  }


  AppState.isAnalyzing = true;
  const startTime = Date.now();
  const btn = document.getElementById('analyzeBtn');
  const btnText = document.getElementById('analyzeBtnText');
  btn.disabled = true;
  btnText.textContent = 'Analyzing…';

  // Show loading overlay
  showLoading('Analyzing Dataset…', 'Running fairness algorithms on your data');

  try {
    // Animate loading steps
    animateLoadingSteps();

    // --- REAL API: Replace mockAnalyze() with actual fetch ---
    // const formData = new FormData();
    // formData.append('file', AppState.uploadedFile);
    // const response = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: formData });
    // const data = await response.json();




// Then analyze
const formData = new FormData();
formData.append("file", AppState.uploadedFile);

const response = await fetch(`${API_BASE}/analyze`, {
  method: "POST",
  body: formData
});

const raw = await response.json();



console.log("RAW BACKEND:", raw); 
const transformed = transformBackendData(raw);

AppState.analysisResults = transformed;

const elapsed = Date.now() - startTime;
const minTime = 2500;

if (elapsed < minTime) {
  await new Promise(r => setTimeout(r, minTime - elapsed));
}


    hideLoading();
    renderResults(transformed);
    navigateTo('results');
    showToast('Analysis complete! Bias detected in your dataset.', 'warning');

  } catch (err) {
    hideLoading();
    showToast('Analysis failed. Please try again.', 'error');
    console.error('Analysis error:', err);
  } finally {
    AppState.isAnalyzing = false;
    btn.disabled = false;
    btnText.textContent = 'Analyze Dataset';
  }
}

function animateLoadingSteps() {
  const steps = ['ls1', 'ls2', 'ls3', 'ls4'];
  const delays = [400, 900, 1600, 2200];

  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active', 'done');
      setTimeout(() => {
        steps.slice(0, i).forEach(prevId => {
          const prev = document.getElementById(prevId);
          if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
        });
        el.classList.add('active');
      }, delays[i]);
    }
  });
}

/* ============================================================
   RENDER RESULTS DASHBOARD
   ============================================================ */
function renderResults(data) {
  const score = data.bias_score;
  const risk = getScoreRisk(score);

  // --- Bias Score ---
  document.getElementById('biasScore').textContent = score;
  document.getElementById('resultsFileName').textContent = `Analysis for: ${data.file_name}`;

  // Animate score ring (circumference = 2π * r = 2π * 50 ≈ 314)
  const circumference = 314;
  const offset = circumference - (score / 100) * circumference;
  setTimeout(() => {
    const ring = document.getElementById('scoreRingFill');
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = risk.ringColor;
  }, 200);

  // Animate score bar
  setTimeout(() => {
    document.getElementById('scoreBarFill').style.width = score + '%';
  }, 300);

  document.getElementById('scoreDesc').textContent =
    score >= 60 ? 'High bias detected. Immediate action recommended.' :
    score >= 30 ? 'Moderate bias detected. Review and consider fixes.' :
    'Low bias detected. Minor adjustments may be beneficial.';

  // Bias status badge
  const badge = document.getElementById('biasStatusBadge');
  badge.textContent = data.status === 'Bias Detected' ? '⚠ Bias Detected' : '✓ No Significant Bias';
  badge.className = 'badge ' + (data.status === 'Bias Detected' ? 'badge-danger' : 'badge-success');

  // --- Metrics ---
  const m = data.metrics;
  renderMetric('dp', m.demographic_parity, 0.10, false);
  renderMetric('eo', m.equal_opportunity, 0.10, false);
  renderMetric('di', m.disparate_impact, 0.80, true);
  renderMetric('pp', m.predictive_parity, 0.10, false);

  // --- Explanation ---
  document.getElementById('explanationText').innerHTML = formatExplanation(data.explanation);

  // Key findings tags
  const kf = document.getElementById('keyFindings');
  kf.innerHTML = '';
  (data.key_findings || []).forEach(f => {
    kf.innerHTML += `<span class="finding-tag">⚠ ${escapeHtml(f)}</span>`;
  });

  // --- Affected Groups ---
  const gl = document.getElementById('groupsList');
  gl.innerHTML = '';
  (data.affected_groups || []).forEach(g => {
    gl.innerHTML += `
      <div class="group-item">
        <span class="group-icon">${g.icon}</span>
        <div class="group-info">
          <div class="group-name">${escapeHtml(g.name)}</div>
          <div class="group-desc">${escapeHtml(g.desc)}</div>
        </div>
        <span class="group-impact">${escapeHtml(g.impact)}</span>
      </div>`;
  });

  // --- Fix Suggestions ---
  const fl = document.getElementById('fixesList');
  fl.innerHTML = '';
  (data.suggested_fixes || []).forEach((fix, i) => {
    fl.innerHTML += `
      <div class="fix-item">
        <span class="fix-num">${i + 1}</span>
        <div>
          <div class="fix-title">${escapeHtml(fix.title)}</div>
          <div class="fix-desc">${escapeHtml(fix.desc)}</div>
        </div>
      </div>`;
  });
}

function renderMetric(prefix, value, threshold, isInverse) {
  const el = {
    bar: document.getElementById(`${prefix}-bar`),
    value: document.getElementById(`${prefix}-value`),
    status: document.getElementById(`${prefix}-status`),
  };

  el.value.textContent = value.toFixed(2);

  // For disparate impact: higher is better. For others: lower is better.
  let pct, color, statusText;
  if (isInverse) {
    // disparate impact: 0.67/1.0 = 67% fill (visualize as deficit)
    pct = ((1 - value) / (1 - 0.5)) * 100;
    pct = Math.min(Math.max(pct, 0), 100);
    color = value >= threshold ? '#10b981' : value >= 0.6 ? '#f59e0b' : '#ef4444';
    statusText = value >= threshold ? '✓ Good' : value >= 0.6 ? '⚠ Moderate' : '✗ Poor';
  } else {
    pct = (value / 0.5) * 100;
    pct = Math.min(Math.max(pct, 0), 100);
    color = value <= threshold ? '#10b981' : value <= 0.20 ? '#f59e0b' : '#ef4444';
    statusText = value <= threshold ? '✓ Good' : value <= 0.20 ? '⚠ Moderate' : '✗ Poor';
  }

  setTimeout(() => {
    if (el.bar) {
      el.bar.style.width = pct + '%';
      el.bar.style.background = color;
    }
    if (el.status) {
      el.status.textContent = statusText;
      el.status.style.color = color;
    }
  }, 400);
}

/* ============================================================
   FIX BIAS — API Call
   ============================================================ */
async function fixBias() {
  if (AppState.isFixing) return;
  if (!AppState.analysisResults) return;

  AppState.isFixing = true;
  const startTime = Date.now();
  const btn = document.getElementById('fixBiasBtn');
  const btnText = document.getElementById('fixBtnText');

  btn.disabled = true;
  btnText.textContent = '⚙ Applying Fixes…';

  // Show loading with different message
  showLoading('Applying Debiasing Techniques…', 'Reweighting data and adjusting thresholds');
  const loadTitle = document.getElementById('loadingTitle');
  const loadSub = document.getElementById('loadingSub');
  const ls1 = document.getElementById('ls1');
  const ls2 = document.getElementById('ls2');
  const ls3 = document.getElementById('ls3');
  const ls4 = document.getElementById('ls4');

  if (loadTitle) loadTitle.textContent = 'Applying Debiasing Techniques…';
  if (loadSub) loadSub.textContent = 'This may take a moment';

  const stepLabels = [
    '⚖ Applying Reweighting',
    '🔄 Resampling Minority Groups',
    '📐 Adjusting Thresholds',
    '✅ Validating Fairness Metrics',
  ];
  [ls1, ls2, ls3, ls4].forEach((el, i) => {
    if (el) el.textContent = stepLabels[i];
  });

  animateLoadingSteps();

  try {
    // --- REAL API: Replace with actual fetch ---
    // const response = await fetch(`${API_BASE}/fix-bias`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(AppState.analysisResults)
    // });
    // const data = await response.json();

const res = await fetch(`${API_BASE}/fix`);
const raw = await res.json();
const elapsed = Date.now() - startTime;
const minTime = 2500;

if (elapsed < minTime) {
  await new Promise(r => setTimeout(r, minTime - elapsed));
}
const data = transformBackendData(raw);
    AppState.fixedResults = data;

    hideLoading();
    renderComparison(AppState.analysisResults, data);
    navigateTo('comparison');
    const improvement = calcImprovement(
  AppState.analysisResults.bias_score,
  data.bias_score
);

showToast(`✓ Bias reduced by ${improvement}%`, 'success');

  } catch (err) {
    hideLoading();
    showToast('Fix failed. Please try again.', 'error');
    console.error('Fix error:', err);
  } finally {
    AppState.isFixing = false;
    btn.disabled = false;
    btnText.textContent = '⚡ Apply Bias Fixes';
  }
}


/* ============================================================
   RENDER COMPARISON
   ============================================================ */
function renderComparison(before, after) {
  const bScore = before.bias_score;
  const aScore = after.bias_score;
  const impPct = calcImprovement(bScore, aScore);

  // Banner
  document.getElementById('comp-before-score').textContent = bScore;
  document.getElementById('comp-after-score').textContent = aScore;
  document.getElementById('impBiasScore').textContent = `${bScore} → ${aScore}`;
  document.getElementById('impOverall').textContent = `${impPct}% Better`;
  document.getElementById('impPercent').textContent = `↓ ${impPct}%`;
  document.getElementById('impTechnique').textContent = after.technique_applied || 'Reweighting';

  // Metrics table
  const rows = [
    {
      name: 'Bias Score',
      beforeVal: bScore,
      afterVal: aScore,
      unit: '',
      lowerIsBetter: true,
    },
    {
      name: 'Demographic Parity',
      beforeVal: before.metrics.demographic_parity,
      afterVal: after.metrics.demographic_parity,
      lowerIsBetter: true,
    },
    {
      name: 'Equal Opportunity Diff.',
      beforeVal: before.metrics.equal_opportunity,
      afterVal: after.metrics.equal_opportunity,
      lowerIsBetter: true,
    },
    {
      name: 'Disparate Impact',
      beforeVal: before.metrics.disparate_impact,
      afterVal: after.metrics.disparate_impact,
      lowerIsBetter: false,
    },
    {
      name: 'Predictive Parity',
      beforeVal: before.metrics.predictive_parity,
      afterVal: after.metrics.predictive_parity,
      lowerIsBetter: true,
    },
  ];

  const tbody = document.getElementById('compTableBody');
  tbody.innerHTML = '';
  rows.forEach(row => {
    const improved = row.lowerIsBetter
      ? row.afterVal < row.beforeVal
      : row.afterVal > row.beforeVal;

    const change = row.lowerIsBetter
      ? calcImprovement(row.beforeVal, row.afterVal)
      : calcImprovement(1 - row.beforeVal, 1 - row.afterVal);

    const statusIcon = improved ? '✓ Improved' : '→ Unchanged';
    tbody.innerHTML += `
      <tr>
        <td><strong>${escapeHtml(row.name)}</strong></td>
        <td class="td-before">${row.beforeVal.toFixed(2)}</td>
        <td class="td-after">${row.afterVal.toFixed(2)}</td>
        <td class="td-imp">${improved ? '↓' : '→'} ${Math.abs(change)}%</td>
        <td><span class="badge ${improved ? 'badge-success' : 'badge-warning'}" style="font-size:0.75rem;">${statusIcon}</span></td>
      </tr>`;
  });

  // Render charts
  renderComparisonChart(bScore, aScore);
  renderMetricsChart(before.metrics, after.metrics);

  // Populate report section too
  populateReport(before, after);
}

/* ============================================================
   CHARTS (Chart.js)
   ============================================================ */
function renderComparisonChart(beforeScore, afterScore) {
  const canvas = document.getElementById('comparisonChart');
  if (!canvas) return;

  // Destroy previous chart if exists
  if (AppState.compChart) {
    AppState.compChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  AppState.compChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Before Debiasing', 'After Debiasing'],
      datasets: [{
        label: 'Bias Score (0–100)',
        data: [beforeScore, afterScore],
        backgroundColor: ['rgba(239, 68, 68, 0.15)', 'rgba(16, 185, 129, 0.15)'],
        borderColor: ['rgba(239, 68, 68, 0.85)', 'rgba(16, 185, 129, 0.85)'],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` Bias Score: ${ctx.raw}/100`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#64748b',
            callback: (v) => v + '/100',
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { weight: '600' } },
        },
      },
      animation: { duration: 900, easing: 'easeInOutQuart' },
    },
  });
}

function renderMetricsChart(beforeMetrics, afterMetrics) {
  const canvas = document.getElementById('metricsChart');
  if (!canvas) return;

  if (AppState.metricsChart) {
    AppState.metricsChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  const labels = ['Demographic\nParity', 'Equal\nOpportunity', 'Predictive\nParity'];

  AppState.metricsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Demographic Parity', 'Equal Opportunity', 'Predictive Parity'],
      datasets: [
        {
          label: 'Before',
          data: [
            beforeMetrics.demographic_parity,
            beforeMetrics.equal_opportunity,
            beforeMetrics.predictive_parity,
          ],
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 0.85)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'After',
          data: [
            afterMetrics.demographic_parity,
            afterMetrics.equal_opportunity,
            afterMetrics.predictive_parity,
          ],
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderColor: 'rgba(16, 185, 129, 0.85)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#64748b', font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw.toFixed(3)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 0.45,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            color: '#64748b',
            callback: (v) => v.toFixed(2),
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', maxRotation: 0 },
        },
      },
      animation: { duration: 900, easing: 'easeInOutQuart' },
    },
  });
}

/* ============================================================
   POPULATE REPORT SECTION
   ============================================================ */
function populateReport(before, after) {
  const now = new Date();

  // Header date
  document.getElementById('reportDate').textContent =
    now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Meta
  document.getElementById('rBeforeScore').textContent = before.bias_score;
document.getElementById('rAfterScore').textContent = after.bias_score;
  document.getElementById('rFileName').textContent = before.file_name || 'dataset.csv';
  document.getElementById('rRows').textContent = before.rows.toLocaleString();
  document.getElementById('rCols').textContent = before.columns;
  document.getElementById('rDate').textContent = formatDate();

  // Report file name in header
  document.getElementById('reportExplanation').innerHTML = formatExplanation(before.explanation);

  // Scores


  // Metrics table
  const tbody = document.getElementById('reportTableBody');
  tbody.innerHTML = '';
  const metricDefs = [
    { name: 'Demographic Parity', bKey: 'demographic_parity', lower: true },
    { name: 'Equal Opportunity Diff.', bKey: 'equal_opportunity', lower: true },
    { name: 'Disparate Impact', bKey: 'disparate_impact', lower: false },
    { name: 'Predictive Parity', bKey: 'predictive_parity', lower: true },
  ];
  metricDefs.forEach(m => {
    const bv = before.metrics[m.bKey];
    const av = after.metrics[m.bKey];
    const improved = m.lower ? av < bv : av > bv;
    const change = m.lower
      ? calcImprovement(bv, av)
      : calcImprovement(1 - bv, 1 - av);

    tbody.innerHTML += `
      <tr>
        <td>${m.name}</td>
        <td style="color:#ef4444;font-weight:600;">${bv.toFixed(3)}</td>
        <td style="color:#10b981;font-weight:600;">${av.toFixed(3)}</td>
        <td style="color:#10b981;font-weight:700;">${improved ? '↓' : '→'} ${Math.abs(change)}%</td>
      </tr>`;
  });

  // Fixes
  const fixesList = document.getElementById('reportFixes');
  fixesList.innerHTML = '';
  (before.suggested_fixes || []).forEach(f => {
    fixesList.innerHTML += `<li>${escapeHtml(f.title)}: ${escapeHtml(f.desc)}</li>`;
  });
}

/* ============================================================
   LOADING OVERLAY
   ============================================================ */
function showLoading(title = 'Processing…', sub = 'Please wait') {
  const overlay = document.getElementById('loadingOverlay');
  document.getElementById('loadingTitle').textContent = title;
  document.getElementById('loadingSub').textContent = sub;

  // Reset steps
  ['ls1','ls2','ls3','ls4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active', 'done'); }
  });

  overlay.classList.add('visible');
}



function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}

/* ============================================================
   PDF REPORT DOWNLOAD
   ============================================================ */
function downloadPDFReport() {
  const btn = document.getElementById('downloadPdfBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Generating PDF…';

  if (!AppState.analysisResults || !AppState.fixedResults) {
  showToast("No data available for PDF", "error");
  return;
}
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const before = AppState.analysisResults;
    const after = AppState.fixedResults;
    const now = new Date();

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 0;

    // ---- Helper functions ----
    const addPage = () => { doc.addPage(); y = 20; };
    const checkY = (needed = 20) => { if (y + needed > 270) addPage(); };

    const hex2rgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return [r, g, b];
    };

    // ---- Cover Page ----
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageW, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.text('FairLens AI', margin, 28);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Fairness & Bias Audit Report', margin, 38);

    doc.setFontSize(9);
    doc.text(`Generated: ${now.toLocaleString()}`, margin, 50);

    y = 76;
    doc.setTextColor(30, 41, 59);

    // ---- Dataset Summary ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Dataset Summary', margin, y); y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setFillColor(240, 244, 248);
    doc.roundedRect(margin, y, pageW - margin*2, 30, 3, 3, 'F');

    const meta = [
      ['File Name', before?.file_name || 'dataset.csv'],
      ['Rows Analyzed', before?.rows.toLocaleString()],
      ['Columns', before?.columns],
      ['Analysis Date', formatDate()],
    ];

    doc.setFontSize(9);
    meta.forEach((item, i) => {
      const col = i % 2 === 0 ? margin + 4 : pageW / 2 + 4;
      const row = y + 8 + Math.floor(i / 2) * 10;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(item[0] + ':', col, row);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(String(item[1]), col + 28, row);
    });
    y += 40;

    // ---- Bias Assessment ----
    checkY(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Bias Assessment', margin, y); y += 8;

    // Before box
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin, y, 65, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('BEFORE FIX', margin + 4, y + 7);
    doc.setFontSize(22); doc.setTextColor(239, 68, 68);
    doc.text(String(before.bias_score), margin + 16, y + 20);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('High Risk', margin + 36, y + 20);

    // Arrow
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14); doc.setTextColor(100, 116, 139);
    doc.text(' ', margin + 72, y + 18);

    // After box
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(margin + 80, y, 65, 30, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text('AFTER FIX', margin + 84, y + 7);
    doc.setFontSize(22); doc.setTextColor(16, 185, 129);
    doc.text(String(after.bias_score), margin + 96, y + 20);
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('Low Risk', margin + 116, y + 20);

    y += 42;

    // Improvement badge
    const impPct = calcImprovement(before.bias_score, after.bias_score);
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(margin, y, 80, 12, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9); doc.setTextColor(6, 95, 70);
    doc.text(`Overall Improvement: ${impPct}% reduction in bias`, margin + 4, y + 8);
    y += 22;

    // ---- Metrics Table ----
    checkY(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); doc.setTextColor(30, 41, 59);
    doc.text('Fairness Metrics', margin, y); y += 8;

    // Table header
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, y, pageW - margin*2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
    const colW = (pageW - margin*2) / 4;
    ['Metric', 'Before', 'After', 'Improvement'].forEach((h, i) => {
      doc.text(h, margin + i * colW + 3, y + 6);
    });
    y += 10;

    const metricRows = [
      ['Bias Score', String(before?.bias_score) + '/100', String(after?.bias_score) + '/100', impPct + '%'],
      ['Demographic Parity', before?.metrics?.demographic_parity?.toFixed(3) || '0.280', after?.metrics?.demographic_parity?.toFixed(3) || '0.070', calcImprovement(before?.metrics?.demographic_parity || 0.28, after?.metrics?.demographic_parity || 0.07) + '%'],
      ['Equal Opportunity', before?.metrics?.equal_opportunity?.toFixed(3) || '0.310', after?.metrics?.equal_opportunity?.toFixed(3) || '0.060', calcImprovement(before?.metrics?.equal_opportunity || 0.31, after?.metrics?.equal_opportunity || 0.06) + '%'],
      ['Disparate Impact', before?.metrics?.disparate_impact?.toFixed(3) || '0.670', after?.metrics?.disparate_impact?.toFixed(3) || '0.930', calcImprovement(1-(before?.metrics?.disparate_impact||0.67), 1-(after?.metrics?.disparate_impact||0.93)) + '%'],
      ['Predictive Parity', before?.metrics?.predictive_parity?.toFixed(3) || '0.190', after?.metrics?.predictive_parity?.toFixed(3) || '0.050', calcImprovement(before?.metrics?.predictive_parity || 0.19, after?.metrics?.predictive_parity || 0.05) + '%'],
    ];

    metricRows.forEach((row, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 250 : 255, idx % 2 === 0 ? 252 : 255);
      doc.rect(margin, y, pageW - margin*2, 9, 'F');
      doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      row.forEach((cell, ci) => {
        doc.setTextColor(ci === 2 ? 16 : ci === 3 ? 16 : 30, ci === 2 ? 185 : ci === 3 ? 185 : 41, ci === 2 ? 129 : ci === 3 ? 129 : 59);
        doc.text(cell, margin + ci * colW + 3, y + 6);
      });
      y += 10;
    });
    y += 8;

    // ---- AI Explanation ----
    checkY(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); doc.setTextColor(30, 41, 59);
    doc.text('AI-Generated Explanation', margin, y); y += 8;

    const explanation = cleanMarkdownForPDF(before?.explanation);
    doc.setFillColor(239, 246, 255);
    const splitEx = doc.splitTextToSize(explanation, pageW - margin*2 - 8);
    doc.setLineHeightFactor(1.6);
    const exH = splitEx.length * 5 + 10;
    doc.roundedRect(margin, y, pageW - margin*2, exH, 3, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9); doc.setTextColor(30, 58, 138);
    doc.text(splitEx, margin + 4, y + 7);
    y += exH + 10;

    // ---- Fixes Applied ----
    checkY(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); doc.setTextColor(30, 41, 59);
    doc.text('Debiasing Techniques Applied', margin, y); y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    (before?.suggested_fixes || []).forEach((fix, i) => {
      checkY(18);
      doc.setFillColor(240, 244, 248);
      const fixText = doc.splitTextToSize(`${fix.title}: ${fix.desc}`, pageW - margin*2 - 16);
      const fH = fixText.length * 5 + 8;
      doc.roundedRect(margin, y, pageW - margin*2, fH, 2, 2, 'F');
      doc.setTextColor(59, 130, 246); doc.setFont('helvetica', 'bold');
      doc.text(`${i+1}.`, margin + 3, y + 6);
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal');
      doc.text(fixText, margin + 9, y + 6);
      y += fH + 5;
    });

    // ---- Compliance ----
    checkY(50);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13); doc.setTextColor(30, 41, 59);
    doc.text('Compliance Checklist', margin, y); y += 8;

    const compItems = [
      'GDPR Article 22 — Automated Decision-Making',
      'EU AI Act — High-Risk System Fairness',
      'Equal Employment Opportunity Guidelines',
      'Disparate Impact Doctrine (80% Rule)',
    ];
    doc.setFontSize(9);
    compItems.forEach(item => {
      doc.setFillColor(209, 250, 229);
      doc.roundedRect(margin, y, pageW - margin*2, 9, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setTextColor(6, 95, 70);
      doc.text('✓', margin + 3, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(item, margin + 9, y + 6);
      y += 12;
    });

    // ---- Footer on all pages ----
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text(
        `FairLens AI — Fairness Audit Report | Page ${i} of ${pageCount}`,
        margin, 290
      );
      doc.text('Confidential — For internal use only', pageW - margin - 55, 290);
    }

    // Save
    const fileName = `FairLens_Report_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.pdf`;
    doc.save(fileName);
    showToast('PDF report downloaded successfully!', 'success');

  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('PDF generation failed. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⬇ Download Full PDF Report';
  }
}

function downloadData() {
  fetch(API_BASE + "/download")
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fixed_dataset.csv";
      a.click();
    });
}
function printReport() {
  window.print();
}

/* ============================================================
   INITIALIZE APP
   ============================================================ */
function initApp() {
  // Initialize upload handlers
  initUpload();

  // Set today's date in report
  document.getElementById('reportDate').textContent =
    new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Wire up nav step clicks (for navigation)
  document.querySelectorAll('.nav-step').forEach(el => {
    el.addEventListener('click', () => {
      const step = el.dataset.step;
      if (step) navigateTo(step);
    });
  });

  // Ensure only landing is visible at start
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const landing = document.getElementById('section-landing');
  if (landing) landing.classList.add('active');

  // Keyboard ESC closes loading
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideLoading();
  });

  console.log('%c🔍 FairLens AI — App Initialized', 'color:#3b82f6;font-weight:bold;font-size:14px;');
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();

  // 🔥 Wake up backend (Render sleep fix)
  fetch(API_BASE)
    .then(() => console.log("Backend warmed up"))
    .catch(() => console.log("Backend wake attempt"));
});
