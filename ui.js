/**
 * ui.js — UI rendering layer
 * Builds and injects HTML. Uses Logic.* for data/formatting.
 * Does not call DB directly. Does not hold application state.
 */

'use strict';

/* ────────────────────────────────────────────────
   Toast notifications
───────────────────────────────────────────────── */

const TOAST_ICONS = {
  success: 'check-circle',
  warn:    'alert-triangle',
  error:   'x-circle',
  info:    'info',
};

/**
 * Show a toast notification.
 * @param {{ type?: 'success'|'warn'|'error'|'info', title: string, msg?: string, duration?: number }} opts
 */
function showToast({ type = 'info', title, msg = '', duration = 3500 }) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  toast.innerHTML = `
    <i data-lucide="${TOAST_ICONS[type]}" class="toast__icon"></i>
    <div class="toast__text">
      <div class="toast__title">${title}</div>
      ${msg ? `<div class="toast__msg">${msg}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);
  lucide.createIcons({ nodes: [toast] });

  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/* ────────────────────────────────────────────────
   Modal
───────────────────────────────────────────────── */

/**
 * Open a modal with arbitrary HTML content.
 * @param {{ title: string, body: string, footer?: string, onOpen?: Function }} opts
 */
function openModal({ title, body, footer = '', onOpen }) {
  const overlay = document.getElementById('modalOverlay');

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal__header">
        <span class="modal__title">${title}</span>
        <button class="modal__close" id="modalClose">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="modal__body">${body}</div>
      ${footer ? `<div class="modal__footer">${footer}</div>` : ''}
    </div>
  `;

  overlay.classList.add('open');
  lucide.createIcons({ nodes: [overlay] });

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  if (onOpen) onOpen(overlay.querySelector('.modal'));
}

/** Close the currently open modal */
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('open');
  overlay.innerHTML = '';
}

/* ────────────────────────────────────────────────
   Drawer
───────────────────────────────────────────────── */

/**
 * Open the side drawer.
 * @param {{ title: string, body: string, onOpen?: Function }} opts
 */
function openDrawer({ title, body, onOpen }) {
  const overlay = document.getElementById('drawerOverlay');
  const drawer  = document.getElementById('drawer');

  drawer.innerHTML = `
    <div class="drawer__header">
      <span class="drawer__title">${title}</span>
      <button class="btn btn--ghost btn--sm" id="drawerClose">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="drawer__body">${body}</div>
  `;

  overlay.classList.add('open');
  lucide.createIcons({ nodes: [drawer] });

  document.getElementById('drawerClose')?.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });

  if (onOpen) onOpen(drawer);
}

/** Close the side drawer */
function closeDrawer() {
  document.getElementById('drawerOverlay').classList.remove('open');
}

/* ────────────────────────────────────────────────
   Empty state
───────────────────────────────────────────────── */

/**
 * Render an empty state placeholder.
 * @param {{ icon?: string, title: string, text?: string, action?: string }} opts
 * @returns {string} HTML
 */
function renderEmptyState({ icon = 'inbox', title, text = '', action = '' }) {
  return `
    <div class="empty-state">
      <i data-lucide="${icon}"></i>
      <div class="empty-state__title">${title}</div>
      ${text   ? `<p class="empty-state__text">${text}</p>` : ''}
      ${action ? action : ''}
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Badge helper
───────────────────────────────────────────────── */

const STATUS_BADGE_MAP = {
  active:  'active',
  ending:  'warn',
  danger:  'danger',
  expired: 'danger',
  none:    'neutral',
};

/**
 * Render a status badge.
 * @param {{ label: string, type: string }} status
 * @returns {string} HTML
 */
function renderBadge(status) {
  const cls = STATUS_BADGE_MAP[status.type] ?? 'neutral';
  return `<span class="badge badge--${cls}">${status.label}</span>`;
}

/* ────────────────────────────────────────────────
   Progress bar
───────────────────────────────────────────────── */

/**
 * Render a subscription progress bar.
 * @param {Subscription|null} sub
 * @returns {string} HTML
 */
function renderProgressBar(sub) {
  if (!sub) return `<span class="text-muted text-sm">—</span>`;

  const { pct, cls } = Logic.getSubProgress(sub);
  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span>${Logic.subTypeLabel(sub.type)}</span>
        <span>${sub.remaining}/${sub.total}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--${cls}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   KPI cards
───────────────────────────────────────────────── */

/**
 * Render the KPI grid.
 * @param {{ total: number, monthTrainings: number, ending: number, expired: number }} kpis
 * @returns {string} HTML
 */
function renderKPIGrid(kpis) {
  const cards = [
    { label: 'Всего учеников',           value: kpis.total,          icon: 'users',           mod: 'accent' },
    { label: 'Тренировок в этом месяце', value: kpis.monthTrainings, icon: 'calendar-check',  mod: 'ok' },
    { label: 'Заканчивается абонемент',  value: kpis.ending,         icon: 'alert-triangle',  mod: 'warn' },
    { label: 'Нужно продлить',           value: kpis.expired,        icon: 'alert-circle',    mod: 'danger' },
  ];

  return `
    <div class="kpi-grid">
      ${cards.map(c => `
        <div class="kpi-card kpi-card--${c.mod}">
          <div class="kpi-card__icon"><i data-lucide="${c.icon}"></i></div>
          <div class="kpi-card__label">${c.label}</div>
          <div class="kpi-card__value" data-countup="${c.value}">0</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Animate count-up numbers on KPI cards.
 */
function animateCountUp() {
  document.querySelectorAll('[data-countup]').forEach(el => {
    const target = parseInt(el.dataset.countup, 10);
    if (isNaN(target) || target === 0) { el.textContent = '0'; return; }

    let start = 0;
    const dur = 600;
    const step = timestamp => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / dur, 1);
      el.textContent = Math.round(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ────────────────────────────────────────────────
   Student row (table)
───────────────────────────────────────────────── */

/**
 * Render a table row for a student.
 * @param {Student} student
 * @returns {string} HTML <tr>
 */
function renderStudentRow(student) {
  const status = Logic.getOverallSubStatus(student);
  const lastVisit = DB.getLastVisitDate(student);

  // Collect all active subs
  const activeSubs = student.subscriptions.filter(s => s.isActive);
  const subText = activeSubs.length
    ? activeSubs.map(s => `${s.groupId}: ${s.remaining}/${s.total}`).join(', ')
    : 'Нет активных';

  return `
    <tr data-student-id="${student.id}">
      <td>
        <div class="font-medium">${student.name}</div>
      </td>
      <td>
        <div class="flex gap-2" style="flex-wrap:wrap">
          ${student.groups.map(g => `<span class="badge badge--accent">${g}</span>`).join('')}
        </div>
      </td>
      <td class="text-sm text-secondary">${subText}</td>
      <td>${renderBadge(status)}</td>
      <td class="text-sm text-secondary">${lastVisit ? Logic.formatDateShort(lastVisit) : '—'}</td>
      <td>
        <button class="btn btn--ghost btn--sm" data-action="view-student" data-id="${student.id}">
          <i data-lucide="chevron-right"></i>
        </button>
      </td>
    </tr>
  `;
}

/* ────────────────────────────────────────────────
   Student drawer body
───────────────────────────────────────────────── */

/**
 * Render the drawer content for a student detail view.
 * @param {Student} student
 * @returns {string} HTML
 */
function renderStudentDetail(student) {
  const lastVisit = DB.getLastVisitDate(student);

  // Subscriptions section
  const subsHtml = student.groups.map(groupId => {
    const activeSub = student.subscriptions.find(s => s.groupId === groupId && s.isActive);
    const status = Logic.getSubStatus(student, groupId);

    return `
      <div class="card" style="padding: var(--sp-4)">
        <div class="flex items-center gap-3" style="margin-bottom:var(--sp-3)">
          <span class="font-semibold text-sm">${groupId}</span>
          <span class="ml-auto">${renderBadge(status)}</span>
        </div>
        ${renderProgressBar(activeSub)}
        <div style="margin-top:var(--sp-3); display:flex; gap:var(--sp-2)">
          <button class="btn btn--secondary btn--sm" data-action="renew-sub" 
                  data-student-id="${student.id}" data-group="${groupId}">
            <i data-lucide="refresh-cw"></i> Продлить
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Visit history
  const historyHtml = student.visitHistory.length
    ? [...student.visitHistory]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 15)
        .map(v => `
          <div class="flex items-center gap-3 text-sm" style="padding:var(--sp-2) 0; border-bottom:1px solid var(--border)">
            <span class="text-secondary">${Logic.formatDateShort(v.date)}</span>
            <span class="badge badge--accent">${v.groupId}</span>
          </div>
        `).join('')
    : `<p class="text-muted text-sm">Посещений пока нет</p>`;

  return `
    <div style="display:flex; flex-direction:column; gap:var(--sp-2); margin-bottom:var(--sp-4)">
      <div class="text-secondary text-sm">Последнее посещение: <strong>${lastVisit ? Logic.formatDateShort(lastVisit) : '—'}</strong></div>
      <div class="text-secondary text-sm">Групп: <strong>${student.groups.length}</strong></div>
    </div>

    <div class="section-title">Абонементы</div>
    <div style="display:flex; flex-direction:column; gap:var(--sp-3)">
      ${subsHtml}
    </div>

    <div class="section-title mt-6">История посещений</div>
    <div>${historyHtml}</div>

    <div style="margin-top:var(--sp-6)">
      <button class="btn btn--danger btn--sm" data-action="delete-student" data-id="${student.id}">
        <i data-lucide="trash-2"></i> Удалить ученика
      </button>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Training list item
───────────────────────────────────────────────── */

/**
 * Render a training list item.
 * @param {Training} training
 * @param {Student[]} allStudents
 * @returns {string} HTML
 */
function renderTrainingItem(training, allStudents) {
  const attendeeNames = training.attendees
    .map(id => allStudents.find(s => s.id === id)?.name ?? 'Удалён')
    .filter(Boolean);

  return `
    <div class="training-item" data-training-id="${training.id}">
      <div class="training-item__header">
        <div class="training-item__date">
          <span class="training-item__day">${Logic.formatDay(training.date)}</span>
          <span class="training-item__mon">${Logic.formatMonth(training.date)}</span>
        </div>
        <div class="training-item__info">
          <div class="training-item__group">${training.groupId}</div>
          <div class="training-item__meta">
            ${training.time ? training.time + ' · ' : ''}${training.attendees.length} чел.
            ${training.note ? ' · ' + training.note : ''}
          </div>
        </div>
        <i data-lucide="chevron-down" class="training-item__chevron"></i>
      </div>
      <div class="training-item__body">
        ${attendeeNames.length
          ? `<div style="display:flex; flex-wrap:wrap; gap:var(--sp-2)">
              ${attendeeNames.map(n => `<span class="badge badge--neutral">${n}</span>`).join('')}
             </div>`
          : `<p class="text-muted text-sm">Нет записей об учениках</p>`
        }
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Group card
───────────────────────────────────────────────── */

/**
 * Render a group card.
 * @param {string} groupId
 * @param {{ total: number, active: number, ending: number, expired: number }} stats
 * @returns {string} HTML
 */
function renderGroupCard(groupId, stats) {
  return `
    <div class="group-card" data-group="${groupId}">
      <div class="group-card__name">${groupId}</div>
      <div class="group-card__stats">
        <div class="group-stat">
          <span class="group-stat__label">Всего учеников</span>
          <span class="group-stat__value">${stats.total}</span>
        </div>
        <div class="group-stat">
          <span class="group-stat__label">Активный абонемент</span>
          <span class="group-stat__value">${stats.active}</span>
        </div>
        <div class="group-stat">
          <span class="group-stat__label">Заканчивается</span>
          <span class="group-stat__value group-stat__value--warn">${stats.ending}</span>
        </div>
        <div class="group-stat">
          <span class="group-stat__label">Нужно продлить</span>
          <span class="group-stat__value group-stat__value--danger">${stats.expired}</span>
        </div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Warning list item
───────────────────────────────────────────────── */

/**
 * Render a warning list item.
 * @param {{ student: Student, groupId: string, status: object }} w
 * @returns {string} HTML
 */
function renderWarningItem(w) {
  const isDanger = w.status.type === 'expired';
  return `
    <div class="warning-item ${isDanger ? 'warning-item--danger' : ''}"
         data-student-id="${w.student.id}">
      <div>
        <div class="warning-item__name">${w.student.name}</div>
        <div class="warning-item__detail">${w.groupId} · ${w.status.label}</div>
      </div>
      <button class="btn btn--primary btn--sm ml-auto"
              data-action="renew-sub" data-student-id="${w.student.id}" data-group="${w.groupId}">
        Продлить
      </button>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Modals: Add student
───────────────────────────────────────────────── */

/**
 * Render the "Add student" modal body.
 * @returns {string}
 */
function renderAddStudentModal() {
  const groupCheckboxes = DB.GROUPS.map(g => `
    <div class="checkbox-item">
      <input type="checkbox" id="grp-${g}" name="groups" value="${g}" />
      <label for="grp-${g}">${g}</label>
    </div>
  `).join('');

  return `
    <div class="form-group">
      <label class="form-label">Имя и фамилия</label>
      <input class="form-input" id="studentName" placeholder="Алексей Иванов" required />
    </div>
    <div class="form-group">
      <label class="form-label">Группы</label>
      <div class="checkbox-group">${groupCheckboxes}</div>
    </div>
    <div id="subFields"></div>
  `;
}

/**
 * Render subscription fields for each selected group.
 * @param {string[]} groups
 * @returns {string}
 */
function renderSubFields(groups) {
  if (!groups.length) return '';

  const fields = groups.map(g => `
    <div class="form-group">
      <label class="form-label">Абонемент — ${g}</label>
      <select class="form-select" data-group-sub="${g}">
        <option value="">— не добавлять —</option>
        <option value="1">Разовое посещение</option>
        <option value="4">4 занятия</option>
        <option value="8">8 занятий</option>
      </select>
    </div>
  `).join('');

  return `
    <div class="form-group">
      <label class="form-label">Дата начала абонемента</label>
      <input class="form-input" type="date" id="subStartDate" value="${new Date().toISOString().slice(0,10)}" />
    </div>
    ${fields}
  `;
}

/* ────────────────────────────────────────────────
   Modals: Add training
───────────────────────────────────────────────── */

/**
 * Render the "Add training" modal body.
 * @param {Student[]} students  — all students (will filter by group client-side)
 * @returns {string}
 */
function renderAddTrainingModal(students) {
  const groupOptions = DB.GROUPS.map(g =>
    `<option value="${g}">${g}</option>`
  ).join('');

  return `
    <div class="form-group">
      <label class="form-label">Группа</label>
      <select class="form-select" id="trainingGroup">
        <option value="">Выберите группу</option>
        ${groupOptions}
      </select>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">Дата</label>
        <input class="form-input" type="date" id="trainingDate" value="${new Date().toISOString().slice(0,10)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Время</label>
        <input class="form-input" type="time" id="trainingTime" value="18:00" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Ученики</label>
      <div class="checkbox-group" id="attendeeList">
        <p class="text-muted text-sm" style="padding:var(--sp-2)">Сначала выберите группу</p>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Комментарий (необязательно)</label>
      <textarea class="form-textarea" id="trainingNote" placeholder="Например: работали над флипами..."></textarea>
    </div>
  `;
}

/**
 * Render attendee checkboxes for a group.
 * @param {Student[]} students — already filtered for the group
 * @returns {string}
 */
function renderAttendeeCheckboxes(students) {
  if (!students.length) {
    return `<p class="text-muted text-sm" style="padding:var(--sp-2)">В этой группе нет учеников</p>`;
  }
  return students.map(s => `
    <div class="checkbox-item">
      <input type="checkbox" id="att-${s.id}" name="attendees" value="${s.id}" />
      <label for="att-${s.id}">${s.name}</label>
    </div>
  `).join('');
}

/* ────────────────────────────────────────────────
   Modals: Renew subscription
───────────────────────────────────────────────── */

/**
 * Render the renew subscription modal body.
 * @param {string} studentName
 * @param {string} groupId
 * @returns {string}
 */
function renderRenewSubModal(studentName, groupId) {
  return `
    <p class="text-secondary text-sm">
      Ученик: <strong>${studentName}</strong><br/>
      Группа: <strong>${groupId}</strong>
    </p>
    <div class="form-group">
      <label class="form-label">Тип абонемента</label>
      <select class="form-select" id="renewSubType">
        <option value="1">Разовое посещение</option>
        <option value="4">4 занятия</option>
        <option value="8" selected>8 занятий</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Дата начала</label>
      <input class="form-input" type="date" id="renewSubDate" value="${new Date().toISOString().slice(0,10)}" />
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Exports
───────────────────────────────────────────────── */
window.UI = {
  showToast,
  openModal,
  closeModal,
  openDrawer,
  closeDrawer,
  renderEmptyState,
  renderBadge,
  renderProgressBar,
  renderKPIGrid,
  animateCountUp,
  renderStudentRow,
  renderStudentDetail,
  renderTrainingItem,
  renderGroupCard,
  renderWarningItem,
  renderAddStudentModal,
  renderSubFields,
  renderAddTrainingModal,
  renderAttendeeCheckboxes,
  renderRenewSubModal,
};
