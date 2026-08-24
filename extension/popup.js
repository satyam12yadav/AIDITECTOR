/**
 * Fake News Killer — Browser Extension Client
 * Manifest V3 Extension popup script
 */

const CONFIG = {
  BACKEND_URL: 'http://localhost:5001/api/analyze',
  DASHBOARD_URL: 'http://localhost:3000',
  REQUEST_TIMEOUT_MS: 20000,
};

let currentTab = null;
let currentUrl = '';
let currentTitle = '';
let abortController = null;
let lastAnalysisResult = null;

// DOM Elements
const views = {
  ready: document.getElementById('state-ready'),
  loading: document.getElementById('state-loading'),
  results: document.getElementById('state-results'),
  error: document.getElementById('state-error'),
};

const elements = {
  pageTitle: document.getElementById('page-title'),
  pageUrl: document.getElementById('page-url'),
  btnAnalyze: document.getElementById('btn-analyze'),
  btnCancel: document.getElementById('btn-cancel'),
  btnViewFull: document.getElementById('btn-view-full'),
  btnReanalyze: document.getElementById('btn-reanalyze'),
  btnRetry: document.getElementById('btn-retry'),
  
  // Results
  resScore: document.getElementById('res-score'),
  resVerdict: document.getElementById('res-verdict'),
  resConfidence: document.getElementById('res-confidence'),
  statTotal: document.getElementById('stat-total'),
  statSupported: document.getElementById('stat-supported'),
  statContradicted: document.getElementById('stat-contradicted'),
  statUnverified: document.getElementById('stat-unverified'),
  resSummary: document.getElementById('res-summary'),
  scoreRadial: document.querySelector('.score-radial'),
  
  // Error
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
  errorCode: document.getElementById('error-code'),
  
  // Steps
  steps: [
    document.getElementById('step-1'),
    document.getElementById('step-2'),
    document.getElementById('step-3'),
    document.getElementById('step-4'),
  ],
};

function switchView(viewName) {
  Object.keys(views).forEach((key) => {
    if (views[key]) {
      views[key].classList.toggle('active', key === viewName);
    }
  });
}

function showError(title, message, code) {
  if (elements.errorTitle) elements.errorTitle.textContent = title || 'Analysis Failed';
  if (elements.errorMessage) elements.errorMessage.textContent = message || 'An unexpected error occurred.';
  if (elements.errorCode) elements.errorCode.textContent = code || 'CLIENT_ERROR';
  switchView('error');
}

function updateLoadingStep(stepIndex) {
  elements.steps.forEach((step, idx) => {
    if (!step) return;
    step.className = 'step';
    const bullet = step.querySelector('.step-bullet');
    if (idx < stepIndex) {
      step.classList.add('step-done');
      if (bullet) bullet.textContent = '✓';
    } else if (idx === stepIndex) {
      step.classList.add('step-active');
      if (bullet) bullet.textContent = '⏳';
    } else {
      step.classList.add('step-pending');
      if (bullet) bullet.textContent = '⏳';
    }
  });
}

async function analyzeArticle() {
  if (!currentUrl) {
    showError('Missing Target URL', 'No active webpage URL detected to analyze.', 'MISSING_URL');
    return;
  }

  switchView('loading');
  updateLoadingStep(0);

  // Progressive animation timers
  const t1 = setTimeout(() => updateLoadingStep(1), 800);
  const t2 = setTimeout(() => updateLoadingStep(2), 1800);
  const t3 = setTimeout(() => updateLoadingStep(3), 3200);

  abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(CONFIG.BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: currentUrl }),
      signal: abortController.signal,
    });

    clearTimeout(timeoutId);
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    const data = await response.json();

    if (!response.ok || !data.success) {
      const err = data.error || {};
      throw new Error(err.message || `Server returned HTTP ${response.status}`);
    }

    lastAnalysisResult = data;
    renderResults(data);
  } catch (err) {
    clearTimeout(timeoutId);
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);

    if (err.name === 'AbortError') {
      showError('Request Timeout', 'The analysis took longer than 20 seconds. Please try again.', 'TIMEOUT');
    } else if (err.message && err.message.includes('Failed to fetch')) {
      showError(
        'Backend Unavailable',
        'Could not connect to the Fake News Killer backend at http://localhost:5001. Ensure the backend server is running.',
        'BACKEND_OFFLINE'
      );
    } else {
      showError('Verification Error', err.message || 'Article could not be verified.', 'ANALYSIS_ERROR');
    }
  }
}

function renderResults(data) {
  const score = data.score !== undefined ? data.score : 50;
  const confidence = Math.round((data.confidence || 0.8) * 100);
  const verdict = data.verdict || 'Needs Verification';

  if (elements.resScore) elements.resScore.textContent = score;
  if (elements.resConfidence) elements.resConfidence.textContent = `${confidence}%`;
  if (elements.scoreRadial) {
    elements.scoreRadial.style.setProperty('--score', score);
  }

  // Verdict badge class
  if (elements.resVerdict) {
    elements.resVerdict.textContent = verdict;
    elements.resVerdict.className = 'verdict-badge';
    const normalized = verdict.toLowerCase().replace(/\s+/g, '-');
    elements.resVerdict.classList.add(normalized);
  }

  // Claims calculation
  const claims = Array.isArray(data.claims) ? data.claims : [];
  const evidence = Array.isArray(data.evidence) ? data.evidence : [];

  let supportedCount = 0;
  let contradictedCount = 0;
  let unverifiedCount = 0;

  claims.forEach((c) => {
    const claimEvidence = evidence.filter((ev) => ev.claimId === c.id);
    const hasContradiction = claimEvidence.some((ev) => ev.relation === 'contradicts');
    const hasSupport = claimEvidence.some((ev) => ev.relation === 'supports');

    if (hasContradiction) {
      contradictedCount++;
    } else if (hasSupport) {
      supportedCount++;
    } else {
      unverifiedCount++;
    }
  });

  if (elements.statTotal) elements.statTotal.textContent = claims.length;
  if (elements.statSupported) elements.statSupported.textContent = supportedCount;
  if (elements.statContradicted) elements.statContradicted.textContent = contradictedCount;
  if (elements.statUnverified) elements.statUnverified.textContent = unverifiedCount;

  if (elements.resSummary) {
    elements.resSummary.textContent =
      data.summary ||
      (data.reasons && data.reasons[0]) ||
      'Deterministic credibility score synthesized across independent wire and institutional databases.';
  }

  switchView('results');
}

function init() {
  // Check Chrome Extension API availability
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        showError('No Active Tab', 'Unable to detect active webpage in current window.', 'NO_ACTIVE_TAB');
        return;
      }

      currentTab = tabs[0];
      currentUrl = currentTab.url;
      currentTitle = currentTab.title || 'Current Webpage';

      // Validate URL scheme
      if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://')) {
        showError(
          'Unsupported Page',
          'Fake News Killer can only analyze standard public HTTP and HTTPS online articles.',
          'UNSUPPORTED_SCHEME'
        );
        return;
      }

      if (elements.pageTitle) elements.pageTitle.textContent = currentTitle;
      if (elements.pageUrl) elements.pageUrl.textContent = currentUrl;
      switchView('ready');
    });
  } else {
    // Browser standalone / preview mode fallback
    currentUrl = 'https://en.wikipedia.org/wiki/Deep_learning';
    currentTitle = 'Deep Learning — Wikipedia';
    if (elements.pageTitle) elements.pageTitle.textContent = currentTitle;
    if (elements.pageUrl) elements.pageUrl.textContent = currentUrl;
    switchView('ready');
  }

  // Event Listeners
  if (elements.btnAnalyze) {
    elements.btnAnalyze.addEventListener('click', analyzeArticle);
  }

  if (elements.btnReanalyze) {
    elements.btnReanalyze.addEventListener('click', analyzeArticle);
  }

  if (elements.btnRetry) {
    elements.btnRetry.addEventListener('click', analyzeArticle);
  }

  if (elements.btnCancel) {
    elements.btnCancel.addEventListener('click', () => {
      if (abortController) abortController.abort();
      switchView('ready');
    });
  }

  if (elements.btnViewFull) {
    elements.btnViewFull.addEventListener('click', () => {
      const fullUrl = `${CONFIG.DASHBOARD_URL}/?url=${encodeURIComponent(currentUrl)}`;
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: fullUrl });
      } else {
        window.open(fullUrl, '_blank');
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
