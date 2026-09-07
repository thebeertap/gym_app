/* ---------- Storage ---------- */
const DB = {
  load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

let templates = DB.load('gt_templates', []);
let sessions = DB.load('gt_sessions', []);
let settings = DB.load('gt_settings', { unit: 'kg' });

function persist() {
  DB.save('gt_templates', templates);
  DB.save('gt_sessions', sessions);
  DB.save('gt_settings', settings);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------- App state (navigation) ---------- */
let state = {
  screen: 'home',
  editingTemplateId: null,   // for templateEditor
  draftTemplate: null,       // working copy while editing
  activeSession: null,       // in-progress workout
  activeExerciseIndex: 0,
  historyDetailId: null,
  toast: null,
};

function setScreen(screen, extra) {
  state.screen = screen;
  Object.assign(state, extra || {});
  render();
  document.querySelector('.content') && (document.querySelector('.content').scrollTop = 0);
}

function showToast(msg) {
  state.toast = msg;
  render();
  setTimeout(() => { state.toast = null; renderToastOnly(); }, 2200);
}
function renderToastOnly() {
  const el = document.getElementById('toast');
  if (el) el.remove();
}

/* ---------- Root render ---------- */
function render() {
  const app = document.getElementById('app');
  let html = '';
  switch (state.screen) {
    case 'home': html = renderHome(); break;
    case 'templateEditor': html = renderTemplateEditor(); break;
    case 'session': html = renderSession(); break;
    case 'exerciseDetail': html = renderExerciseDetail(); break;
    case 'history': html = renderHistoryList(); break;
    case 'historyDetail': html = renderHistoryDetail(); break;
    case 'settings': html = renderSettings(); break;
    default: html = renderHome();
  }
  if (state.toast) {
    html += `<div class="toast" id="toast">${escapeHtml(state.toast)}</div>`;
  }
  app.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function header(title, opts) {
  opts = opts || {};
  const back = opts.back ? `<button class="icon-btn" onclick="${opts.back}">←</button>` : '';
  const right = opts.right || '';
  return `<div class="header">${back}<h1>${escapeHtml(title)}</h1>${right}</div>`;
}

/* ---------- HOME ---------- */
function renderHome() {
  let body = `
    <div class="brand-mark">
      <span class="weight-dot"></span>
      <span class="title">Iron Log</span>
    </div>
    <div class="sub" style="color:var(--text-dim);font-size:13px;margin-bottom:8px;">Your workouts, tracked set by set.</div>
  `;
  body += `<div class="section-label">Templates</div>`;
  if (templates.length === 0) {
    body += `<div class="empty-state"><div class="glyph">＋</div><p>No templates yet.</p><p>Create one to start logging sets.</p></div>`;
  } else {
    templates.forEach(t => {
      body += `
        <div class="card">
          <div class="card-row">
            <div style="flex:1;min-width:0;" onclick="startSession('${t.id}')">
              <div class="card-title">${escapeHtml(t.name)}</div>
              <div class="card-meta">${t.exercises.length} exercise${t.exercises.length === 1 ? '' : 's'}</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="startSession('${t.id}')">Start</button>
            <button class="icon-btn" onclick="openTemplateEditor('${t.id}')">⋯</button>
          </div>
        </div>`;
    });
  }
  body += `
    <div class="section-label" style="margin-top:26px;">More</div>
    <div class="card" onclick="setScreen('history')">
      <div class="card-row"><div class="card-title">History</div><span class="chevron">›</span></div>
    </div>
    <div class="card" onclick="setScreen('settings')">
      <div class="card-row"><div class="card-title">Settings &amp; templates</div><span class="chevron">›</span></div>
    </div>
  `;
  const bottom = `<div class="bottom-bar"><button class="btn btn-primary" onclick="openTemplateEditor(null)">+ New template</button></div>`;
  return `<div class="header"><div class="brand-mark" style="padding:0;"><span class="weight-dot"></span><span class="title" style="font-size:20px;">Iron Log</span></div></div><div class="content">${body}</div>${bottom}`;
}

/* ---------- TEMPLATE EDITOR ---------- */
function openTemplateEditor(templateId) {
  if (templateId) {
    const t = templates.find(t => t.id === templateId);
    state.draftTemplate = JSON.parse(JSON.stringify(t));
  } else {
    state.draftTemplate = { id: uid(), name: '', exercises: [] };
  }
  setScreen('templateEditor', { editingTemplateId: templateId });
}

function addDraftExercise() {
  state.draftTemplate.exercises.push({ id: uid(), name: '', sets: 3, reps: 10, weight: 20 });
  render();
}
function removeDraftExercise(exId) {
  state.draftTemplate.exercises = state.draftTemplate.exercises.filter(e => e.id !== exId);
  render();
}
function updateDraftField(field, value) {
  state.draftTemplate.name = value;
}
function updateDraftExerciseField(exId, field, value) {
  const ex = state.draftTemplate.exercises.find(e => e.id === exId);
  if (!ex) return;
  ex[field] = (field === 'name') ? value : (parseFloat(value) || 0);
}
function saveTemplate() {
  const draft = state.draftTemplate;
  if (!draft.name.trim()) { showToast('Give the template a name first'); return; }
  if (draft.exercises.length === 0) { showToast('Add at least one exercise'); return; }
  const bad = draft.exercises.find(e => !e.name.trim());
  if (bad) { showToast('Every exercise needs a name'); return; }
  const idx = templates.findIndex(t => t.id === draft.id);
  if (idx >= 0) templates[idx] = draft; else templates.push(draft);
  persist();
  setScreen('home');
}
function deleteTemplate() {
  if (!confirm('Delete this template? This will not remove past history.')) return;
  templates = templates.filter(t => t.id !== state.draftTemplate.id);
  persist();
  setScreen('home');
}

function renderTemplateEditor() {
  const d = state.draftTemplate;
  let body = `
    <div class="field">
      <label>Template name</label>
      <input type="text" value="${escapeHtml(d.name)}" placeholder="e.g. Push Day" oninput="updateDraftField('name', this.value)">
    </div>
    <div class="section-label">Exercises</div>
  `;
  d.exercises.forEach(ex => {
    body += `
      <div class="exercise-edit-row">
        <button class="remove-x" onclick="removeDraftExercise('${ex.id}')">✕</button>
        <div class="field">
          <label>Exercise name</label>
          <input type="text" value="${escapeHtml(ex.name)}" placeholder="e.g. Bench Press" oninput="updateDraftExerciseField('${ex.id}','name',this.value)">
        </div>
        <div class="field-row">
          <div class="field"><label>Sets</label><input type="number" min="1" value="${ex.sets}" oninput="updateDraftExerciseField('${ex.id}','sets',this.value)"></div>
          <div class="field"><label>Reps / set</label><input type="number" min="1" value="${ex.reps}" oninput="updateDraftExerciseField('${ex.id}','reps',this.value)"></div>
          <div class="field"><label>Start weight (${settings.unit})</label><input type="number" min="0" step="0.5" value="${ex.weight}" oninput="updateDraftExerciseField('${ex.id}','weight',this.value)"></div>
        </div>
      </div>`;
  });
  body += `<button class="btn btn-secondary" onclick="addDraftExercise()">+ Add exercise</button>`;
  if (state.editingTemplateId) {
    body += `<div style="margin-top:24px;"><button class="btn btn-danger" onclick="deleteTemplate()">Delete template</button></div>`;
  }
  const bottom = `<div class="bottom-bar"><button class="btn btn-primary" onclick="saveTemplate()">Save template</button></div>`;
  return header(state.editingTemplateId ? 'Edit template' : 'New template', { back: "setScreen('home')" }) +
    `<div class="content">${body}</div>${bottom}`;
}

/* ---------- SESSION (active workout) ---------- */
function startSession(templateId) {
  const t = templates.find(t => t.id === templateId);
  const session = {
    id: uid(),
    templateId: t.id,
    templateName: t.name,
    date: new Date().toISOString(),
    exercises: t.exercises.map(ex => ({
      name: ex.name,
      unit: settings.unit,
      sets: Array.from({ length: ex.sets }, () => ({
        targetReps: ex.reps,
        weight: ex.weight,
        repsDone: Array(ex.reps).fill(false),
      })),
    })),
  };
  state.activeSession = session;
  setScreen('session', { activeExerciseIndex: 0 });
}

function exerciseIsDone(ex) {
  return ex.sets.length > 0 && ex.sets.every(s => s.repsDone.length > 0 && s.repsDone.every(Boolean));
}

function renderSession() {
  const s = state.activeSession;
  let body = '';
  s.exercises.forEach((ex, i) => {
    const done = exerciseIsDone(ex);
    const totalReps = ex.sets.reduce((a, st) => a + st.targetReps, 0);
    const doneReps = ex.sets.reduce((a, st) => a + st.repsDone.filter(Boolean).length, 0);
    body += `
      <div class="exercise-list-item ${done ? 'done' : ''}" onclick="openExercise(${i})">
        <div class="status-dot">${done ? '✓' : ''}</div>
        <div class="ex-name">${escapeHtml(ex.name)}</div>
        <div class="ex-progress">${doneReps}/${totalReps} reps</div>
        <span class="chevron">›</span>
      </div>`;
  });
  const bottom = `<div class="bottom-bar">
      <button class="btn btn-secondary" onclick="cancelSession()">Cancel</button>
      <button class="btn btn-primary" onclick="finishSession()">Finish workout</button>
    </div>`;
  return header(s.templateName, { back: "cancelSession()" }) + `<div class="content">${body}</div>${bottom}`;
}

function cancelSession() {
  if (!confirm('Discard this workout? Nothing will be saved.')) return;
  state.activeSession = null;
  setScreen('home');
}

function finishSession() {
  sessions.push(state.activeSession);
  persist();
  state.activeSession = null;
  setScreen('home');
  showToast('Workout saved');
}

/* ---------- EXERCISE DETAIL (sets & reps) ---------- */
function openExercise(index) {
  setScreen('exerciseDetail', { activeExerciseIndex: index });
}

function currentExercise() {
  return state.activeSession.exercises[state.activeExerciseIndex];
}

function toggleRep(setIndex, repIndex) {
  const set = currentExercise().sets[setIndex];
  set.repsDone[repIndex] = !set.repsDone[repIndex];
  render();
}
function addRep(setIndex) {
  const set = currentExercise().sets[setIndex];
  set.targetReps += 1;
  set.repsDone.push(false);
  render();
}
function adjustWeight(setIndex, delta) {
  const set = currentExercise().sets[setIndex];
  set.weight = Math.max(0, Math.round((set.weight + delta) * 100) / 100);
  render();
}
function setWeightDirect(setIndex, value) {
  const set = currentExercise().sets[setIndex];
  set.weight = Math.max(0, parseFloat(value) || 0);
}
function addSet() {
  const ex = currentExercise();
  const last = ex.sets[ex.sets.length - 1];
  const reps = last ? last.targetReps : 10;
  const weight = last ? last.weight : 20;
  ex.sets.push({ targetReps: reps, weight, repsDone: Array(reps).fill(false) });
  render();
}
function removeSet(setIndex) {
  currentExercise().sets.splice(setIndex, 1);
  render();
}

function renderExerciseDetail() {
  const ex = currentExercise();
  const step = settings.unit === 'kg' ? 2.5 : 5;
  let body = '';
  ex.sets.forEach((set, si) => {
    const complete = set.repsDone.length > 0 && set.repsDone.every(Boolean);
    let reps = '';
    set.repsDone.forEach((done, ri) => {
      reps += `<button class="rep-circle ${done ? 'done' : ''}" onclick="toggleRep(${si},${ri})">${ri + 1}</button>`;
    });
    reps += `<button class="rep-circle add-rep" title="Add a rep" onclick="addRep(${si})">+</button>`;
    body += `
      <div class="set-block ${complete ? 'complete' : ''}">
        <div class="set-block-head">
          <span class="set-num">SET ${si + 1}${complete ? ' · done' : ''}</span>
          ${ex.sets.length > 1 ? `<button class="remove-set-btn" onclick="removeSet(${si})">Remove set</button>` : ''}
        </div>
        <div class="weight-control">
          <button onclick="adjustWeight(${si}, -${step})">−</button>
          <div class="weight-value">
            <input type="number" value="${set.weight}" step="0.5" style="width:70px;background:none;border:none;color:var(--text);font:inherit;text-align:right;"
              oninput="setWeightDirect(${si}, this.value)" onblur="render()">
            <span class="unit">${settings.unit}</span>
          </div>
          <button onclick="adjustWeight(${si}, ${step})">+</button>
        </div>
        <div class="rep-grid">${reps}</div>
      </div>`;
  });
  body += `<button class="btn btn-secondary" onclick="addSet()">+ Add set</button>`;
  const bottom = `<div class="bottom-bar"><button class="btn btn-primary" onclick="setScreen('session')">Back to exercises</button></div>`;
  return header(ex.name, { back: "setScreen('session')" }) + `<div class="content">${body}</div>${bottom}`;
}

/* ---------- HISTORY ---------- */
function renderHistoryList() {
  let body = '';
  if (sessions.length === 0) {
    body = `<div class="empty-state"><div class="glyph">📋</div><p>No workouts logged yet.</p><p>Finish a session to see it here.</p></div>`;
  } else {
    const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(s => {
      const d = new Date(s.date);
      const dateLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
      body += `
        <div class="card" onclick="openHistoryDetail('${s.id}')">
          <div class="card-row">
            <div>
              <div class="card-title">${escapeHtml(s.templateName)}</div>
              <div class="card-meta">${dateLabel} · ${s.exercises.length} exercises · ${totalSets} sets</div>
            </div>
            <span class="chevron">›</span>
          </div>
        </div>`;
    });
  }
  return header('History', { back: "setScreen('home')" }) + `<div class="content">${body}</div>`;
}

function openHistoryDetail(id) {
  setScreen('historyDetail', { historyDetailId: id });
}

function deleteSession(id) {
  if (!confirm('Delete this workout from history?')) return;
  sessions = sessions.filter(s => s.id !== id);
  persist();
  setScreen('history');
}

function renderHistoryDetail() {
  const s = sessions.find(s => s.id === state.historyDetailId);
  if (!s) return header('Not found', { back: "setScreen('history')" }) + `<div class="content"></div>`;
  const d = new Date(s.date);
  const dateLabel = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  let rows = '';
  s.exercises.forEach(ex => {
    ex.sets.forEach((set, i) => {
      const done = set.repsDone.filter(Boolean).length;
      rows += `<tr>
        <td class="ex-name-cell">${i === 0 ? escapeHtml(ex.name) : ''}</td>
        <td>${i + 1}</td>
        <td>${done}/${set.targetReps}</td>
        <td>${set.weight} ${ex.unit}</td>
      </tr>`;
    });
  });
  const body = `
    <div class="card-meta" style="margin-bottom:14px;">${dateLabel}</div>
    <table class="detail-table">
      <thead><tr><th>Exercise</th><th>Set</th><th>Reps</th><th>Weight</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:24px;">
      <button class="btn btn-danger" onclick="deleteSession('${s.id}')">Delete this workout</button>
    </div>
  `;
  return header(s.templateName, { back: "setScreen('history')" }) + `<div class="content">${body}</div>`;
}

/* ---------- SETTINGS ---------- */
function setUnit(unit) {
  settings.unit = unit;
  persist();
  render();
}

function renderSettings() {
  let body = `
    <div class="settings-group">
      <div class="section-label">Weight unit</div>
      <div class="toggle-row">
        <button class="${settings.unit === 'kg' ? 'active' : ''}" onclick="setUnit('kg')">kg</button>
        <button class="${settings.unit === 'lb' ? 'active' : ''}" onclick="setUnit('lb')">lb</button>
      </div>
      <div class="card-meta" style="margin-top:8px;">Applies to new templates and sessions.</div>
    </div>

    <div class="settings-group">
      <div class="section-label">Templates</div>
  `;
  if (templates.length === 0) {
    body += `<div class="card-meta">No templates yet.</div>`;
  } else {
    templates.forEach(t => {
      body += `
        <div class="card" onclick="openTemplateEditor('${t.id}')">
          <div class="card-row"><div class="card-title">${escapeHtml(t.name)}</div><span class="chevron">›</span></div>
        </div>`;
    });
  }
  body += `<button class="btn btn-secondary" onclick="openTemplateEditor(null)" style="margin-top:8px;">+ New template</button>`;

  body += `
    </div>
    <div class="settings-group">
      <div class="section-label">Your data</div>
      <button class="btn btn-secondary" onclick="exportCSV()">Export history as CSV</button>
      <div class="card-meta" style="margin:10px 0 16px;">Opens your share sheet so you can send the CSV to your email app.</div>
      <button class="btn btn-danger" onclick="clearAllData()">Clear all data</button>
    </div>
    <div class="settings-group">
      <div class="card-meta">Iron Log stores everything only on this device. Nothing is sent anywhere except when you choose to export.</div>
    </div>
  `;
  return header('Settings', { back: "setScreen('home')" }) + `<div class="content">${body}</div>`;
}

function clearAllData() {
  if (!confirm('This deletes every template and every logged workout. This cannot be undone. Continue?')) return;
  templates = [];
  sessions = [];
  persist();
  setScreen('home');
  showToast('All data cleared');
}

/* ---------- CSV export ---------- */
function buildCSV() {
  const rows = [['Date', 'Template', 'Exercise', 'Set', 'Target Reps', 'Reps Completed', 'Weight', 'Unit']];
  const sorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach(s => {
    const dateStr = new Date(s.date).toISOString().slice(0, 10);
    s.exercises.forEach(ex => {
      ex.sets.forEach((set, i) => {
        const done = set.repsDone.filter(Boolean).length;
        rows.push([dateStr, s.templateName, ex.name, i + 1, set.targetReps, done, set.weight, ex.unit]);
      });
    });
  });
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
}
function csvEscape(v) {
  const s = String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

async function exportCSV() {
  if (sessions.length === 0) { showToast('No workout history to export yet'); return; }
  const csv = buildCSV();
  const filename = `iron-log-${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const file = new File([blob], filename, { type: 'text/csv' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Iron Log export', text: 'My workout history' });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded — attach it to an email from your files/downloads');
}

/* ---------- Boot ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}
render();
