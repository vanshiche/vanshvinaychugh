/**
 * app.js — BFHL Graph Hierarchy Explorer
 * Handles: input, API calls, rendering, tree visualizer, JSON highlighting.
 */

'use strict';

/* ── Example datasets ──────────────────────────────────────── */
const EXAMPLES = {
  basic: 'A->B, A->C, B->D, C->E',
  cycle: 'X->Y, Y->Z, Z->X',
  mixed: [
    'A->B', 'A->C', 'B->D', 'C->E', 'E->F',
    'X->Y', 'Y->Z', 'Z->X',
    'P->Q', 'Q->R',
    'G->H', 'G->I', 'G->H',
    'hello', '1->2', 'A->'
  ].join(', '),
  stress: (() => {
    // 50 edges across multiple trees and one cycle
    const edges = [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    // Tree 1: A→B→D, A→C→E→F→G
    ['A->B','A->C','B->D','C->E','E->F','F->G'].forEach(e => edges.push(e));
    // Tree 2: H→I→J, H→K→L
    ['H->I','I->J','H->K','K->L'].forEach(e => edges.push(e));
    // Cycle: M→N→O→P→M
    ['M->N','N->O','O->P','P->M'].forEach(e => edges.push(e));
    // Tree 3: Q→R→S→T→U→V
    ['Q->R','R->S','S->T','T->U','U->V'].forEach(e => edges.push(e));
    // Some invalids
    ['hello','AB->C','1->2','A->A',''].forEach(e => edges.push(e));
    // A duplicate
    edges.push('A->B');
    return edges.join(', ');
  })(),
};

/* ── DOM refs ──────────────────────────────────────────────── */
const edgeInput          = document.getElementById('edge-input');
const apiUrlInput        = document.getElementById('api-url');
const btnSubmit          = document.getElementById('btn-submit');
const btnClear           = document.getElementById('btn-clear');
const btnCopyJson        = document.getElementById('btn-copy-json');
const btnSpinner         = document.getElementById('btn-spinner');
const btnText            = btnSubmit.querySelector('.btn-text');
const edgeCounter        = document.getElementById('edge-count');
const responseTime       = document.getElementById('response-time');
const timeValue          = document.getElementById('time-value');
const errorBanner        = document.getElementById('error-banner');
const errorMessage       = document.getElementById('error-message');
const errorClose         = document.getElementById('error-close');
const resultsSection     = document.getElementById('results-section');
const hierarchiesContainer = document.getElementById('hierarchies-container');
const invalidContainer   = document.getElementById('invalid-container');
const duplicateContainer = document.getElementById('duplicate-container');
const jsonViewer         = document.getElementById('json-viewer');
const hierarchyCountBadge = document.getElementById('hierarchy-count-badge');
const invalidCount       = document.getElementById('invalid-count');
const dupCount           = document.getElementById('dup-count');
const sumTrees           = document.getElementById('sum-trees');
const sumCycles          = document.getElementById('sum-cycles');
const sumRoot            = document.getElementById('sum-root');
const resUserId          = document.getElementById('res-user-id');
const resEmail           = document.getElementById('res-email');
const resRoll            = document.getElementById('res-roll');

/* ── Utility: parse textarea into data array ──────────────── */
function parseInput(raw) {
  return raw
    .split(/[\n,]+/)          // split on newlines or commas
    .map(s => s.trim())       // trim each
    .filter(s => s !== '');   // remove blank
}

/* ── Utility: update edge counter ─────────────────────────── */
function updateCounter() {
  const entries = parseInput(edgeInput.value);
  edgeCounter.textContent = entries.length;
}

/* ── Error helpers ─────────────────────────────────────────── */
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.hidden = false;
}
function hideError() {
  errorBanner.hidden = true;
}

/* ── Loading state helpers ─────────────────────────────────── */
function setLoading(on) {
  btnSubmit.disabled = on;
  btnText.hidden = on;
  btnSpinner.hidden = !on;
}

/* ── JSON syntax highlighter ───────────────────────────────── */
function highlightJson(json) {
  // Escape HTML first
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g,
    match => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      } else if (/[{}[\]]/.test(match)) {
        cls = 'json-brace';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

/* ── Tree text visualizer ──────────────────────────────────── */
function buildTreeLines(treeObj, prefix = '', isLast = true, isRoot = true) {
  const lines = [];
  const keys = Object.keys(treeObj);

  if (isRoot) {
    // First key is the root
    const rootKey = keys[0];
    lines.push(`<span class="tree-node">◉ ${rootKey}</span>`);
    const children = treeObj[rootKey];
    const childKeys = Object.keys(children);
    childKeys.forEach((ck, i) => {
      const isChildLast = i === childKeys.length - 1;
      const childSubtree = { [ck]: children[ck] };
      lines.push(...renderSubtree(childSubtree, '', isChildLast));
    });
  }
  return lines;
}

function renderSubtree(obj, prefix, isLast) {
  const lines = [];
  const key = Object.keys(obj)[0];
  const children = obj[key];
  const childKeys = Object.keys(children);
  const connector = isLast ? '└── ' : '├── ';
  const ext       = isLast ? '    ' : '│   ';
  const isLeaf    = childKeys.length === 0;
  const cls       = isLeaf ? 'tree-leaf' : 'tree-node';

  lines.push(`${prefix}${connector}<span class="${cls}">${key}</span>`);

  childKeys.forEach((ck, i) => {
    const isChildLast = i === childKeys.length - 1;
    lines.push(...renderSubtree({ [ck]: children[ck] }, prefix + ext, isChildLast));
  });

  return lines;
}

/* ── Render hierarchies ────────────────────────────────────── */
function renderHierarchies(hierarchies) {
  hierarchiesContainer.innerHTML = '';
  hierarchyCountBadge.textContent = hierarchies.length;

  if (hierarchies.length === 0) {
    hierarchiesContainer.innerHTML = '<p class="empty-state" style="padding:8px 0">No hierarchies found.</p>';
    return;
  }

  hierarchies.forEach((h, idx) => {
    const isCycle = h.has_cycle === true;
    const item = document.createElement('div');
    item.className = 'hierarchy-item';
    item.style.animationDelay = `${idx * 50}ms`;

    const typeTag = isCycle
      ? '<span class="hier-type-tag tag-cycle">⟳ CYCLE</span>'
      : '<span class="hier-type-tag tag-tree">✓ TREE</span>';

    const depthInfo = !isCycle && h.depth !== undefined
      ? `<span class="hier-depth">depth: ${h.depth}</span>`
      : '';

    item.innerHTML = `
      <div class="hier-header" role="button" aria-expanded="false" aria-controls="hier-body-${idx}" tabindex="0">
        <span class="hier-root-badge">Root: ${h.root}</span>
        ${typeTag}
        ${depthInfo}
        <span class="hier-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
      <div class="hier-body" id="hier-body-${idx}">
        ${renderHierarchyBody(h, isCycle)}
      </div>
    `;

    // Toggle accordion
    const header = item.querySelector('.hier-header');
    const body   = item.querySelector('.hier-body');
    function toggle() {
      const isOpen = body.classList.toggle('open');
      header.classList.toggle('open', isOpen);
      header.setAttribute('aria-expanded', isOpen);
    }
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

    // Auto-open first item
    if (idx === 0) toggle();

    hierarchiesContainer.appendChild(item);
  });
}

function renderHierarchyBody(h, isCycle) {
  if (isCycle) {
    return `
      <div class="cycle-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.3"/>
        </svg>
        Cyclic group — all nodes in this component form a directed cycle.
      </div>
    `;
  }

  const lines = buildTreeLines(h.tree);
  const visual = lines.join('\n');

  return `
    <div class="tree-visual">${visual}</div>
  `;
}

/* ── Render tag lists ──────────────────────────────────────── */
function renderTagList(container, items, cssClass, countEl, emptyMsg) {
  container.innerHTML = '';
  countEl.textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = `<span class="empty-state">${emptyMsg}</span>`;
    return;
  }

  items.forEach((item, i) => {
    const tag = document.createElement('span');
    tag.className = `tag ${cssClass}`;
    tag.textContent = item || '""';
    tag.style.animationDelay = `${i * 30}ms`;
    container.appendChild(tag);
  });
}

/* ── Render full result ────────────────────────────────────── */
function renderResult(data) {
  // Identity
  resUserId.textContent = data.user_id || '—';
  resEmail.textContent  = data.email_id || '—';
  resRoll.textContent   = data.college_roll_number || '—';

  // Summary
  const s = data.summary || {};
  sumTrees.textContent  = s.total_trees  ?? 0;
  sumCycles.textContent = s.total_cycles ?? 0;
  sumRoot.textContent   = s.largest_tree_root || '—';

  // Hierarchies
  renderHierarchies(data.hierarchies || []);

  // Invalid
  renderTagList(
    invalidContainer, data.invalid_entries || [],
    'tag-invalid', invalidCount,
    'No invalid entries 🎉'
  );

  // Duplicates
  renderTagList(
    duplicateContainer, data.duplicate_edges || [],
    'tag-dup', dupCount,
    'No duplicate edges 🎉'
  );

  // Raw JSON
  jsonViewer.innerHTML = highlightJson(JSON.stringify(data, null, 2));

  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Main submit handler ───────────────────────────────────── */
async function handleSubmit() {
  hideError();

  let apiUrl = apiUrlInput.value.trim();
  if (!apiUrl) {
    showError('Please enter an API endpoint URL.');
    return;
  }
  // Auto-append /bfhl if missing, so the user can just paste the Base URL safely
  if (!apiUrl.endsWith('/bfhl')) {
    if (apiUrl.endsWith('/')) {
      apiUrl += 'bfhl';
    } else {
      apiUrl += '/bfhl';
    }
    // Update the input box to show the user what we are doing
    apiUrlInput.value = apiUrl;
  }

  const rawInput = edgeInput.value;
  const data = parseInput(rawInput);

  setLoading(true);
  const t0 = performance.now();

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    const elapsed = Math.round(performance.now() - t0);

    if (!res.ok) {
      let errMsg = `API returned ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody.error) errMsg += `: ${errBody.error}`;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const json = await res.json();

    timeValue.textContent = `${elapsed} ms`;
    responseTime.hidden = false;

    renderResult(json);
  } catch (err) {
    const elapsed = Math.round(performance.now() - t0);
    timeValue.textContent = `${elapsed} ms`;
    responseTime.hidden = false;

    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      showError(`Cannot reach API at "${apiUrl}". Is the server running? Check CORS settings.`);
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
}

/* ── Copy JSON ─────────────────────────────────────────────── */
async function copyJson() {
  const text = jsonViewer.textContent;
  try {
    await navigator.clipboard.writeText(text);
    btnCopyJson.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!
    `;
    setTimeout(() => {
      btnCopyJson.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
        Copy
      `;
    }, 2000);
  } catch (_) {}
}

/* ── Event Listeners ───────────────────────────────────────── */
edgeInput.addEventListener('input', updateCounter);

btnSubmit.addEventListener('click', handleSubmit);

btnClear.addEventListener('click', () => {
  edgeInput.value = '';
  updateCounter();
  resultsSection.hidden = true;
  responseTime.hidden = true;
  hideError();
});

errorClose.addEventListener('click', hideError);

btnCopyJson.addEventListener('click', copyJson);

// Example buttons
document.querySelectorAll('.btn-example').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.example;
    if (EXAMPLES[key]) {
      edgeInput.value = EXAMPLES[key];
      updateCounter();
    }
  });
});

// Allow Ctrl+Enter to submit
edgeInput.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    handleSubmit();
  }
});

// Initial count
updateCounter();
