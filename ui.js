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
  const days = Logic.getDaysRemaining(sub);

  let daysLabel = '';
  if (days !== null) {
    if (days < 0)       daysLabel = `<span style="color:var(--danger)">истёк ${Math.abs(days)} дн. назад</span>`;
    else if (days === 0) daysLabel = `<span style="color:var(--danger)">последний день</span>`;
    else if (days <= 7) daysLabel = `<span style="color:var(--warning)">${days} дн.</span>`;
    else                daysLabel = `<span class="text-secondary">${days} дн.</span>`;
  }

  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span>${Logic.subTypeLabel(sub.type)}</span>
        <span>${sub.remaining}/${sub.total} занятий</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar__fill progress-bar__fill--${cls}" style="width:${pct}%"></div>
      </div>
      ${sub.expiresAt ? `
        <div class="progress-label" style="margin-top:3px">
          <span class="text-muted">до ${Logic.formatDateShort(sub.expiresAt)}</span>
          ${daysLabel}
        </div>
      ` : ''}
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
 * @param {object[]} allGroups — full group objects to distinguish individual vs group
 * @returns {string} HTML
 */
function renderStudentDetail(student, allGroups = []) {
  const lastVisit    = DB.getLastVisitDate(student);
  const indNames     = allGroups.filter(g => g.isIndividual).map(g => g.name);
  const groupGroups  = student.groups.filter(g => !indNames.includes(g));
  const indGroups    = student.groups.filter(g =>  indNames.includes(g));

  const renderSubCard = groupId => {
    const activeSub  = student.subscriptions.find(s => s.groupId === groupId && s.isActive);
    const status     = Logic.getSubStatus(student, groupId);
    const isInd      = indNames.includes(groupId);
    const isRazovoe  = activeSub?.type === '1';

    const secondAction = (isInd && isRazovoe)
      ? `<span class="text-muted text-sm" style="display:flex;align-items:center;gap:4px;padding:var(--sp-1) 0">
           <i data-lucide="phone-call" style="width:13px;height:13px;flex-shrink:0"></i>
           Узнать о следующей тренировке
         </span>`
      : `<button class="btn btn--ghost btn--sm" data-action="extend-sub-time"
                 data-student-id="${student.id}" data-group="${groupId}">
           <i data-lucide="clock"></i> Продлить срок
         </button>`;

    return `
      <div class="card" style="padding:var(--sp-4)">
        <div class="flex items-center gap-3" style="margin-bottom:var(--sp-3)">
          <span class="font-semibold text-sm">${groupId}</span>
          <span class="ml-auto">${renderBadge(status)}</span>
        </div>
        ${renderProgressBar(activeSub)}
        <div style="margin-top:var(--sp-3); display:flex; gap:var(--sp-2); flex-wrap:wrap; align-items:center">
          <button class="btn btn--secondary btn--sm" data-action="renew-sub"
                  data-student-id="${student.id}" data-group="${groupId}">
            <i data-lucide="refresh-cw"></i> Новый абонемент
          </button>
          ${secondAction}
        </div>
      </div>
    `;
  };

  const groupSubsHtml = groupGroups.length
    ? groupGroups.map(renderSubCard).join('')
    : `<p class="text-muted text-sm">Нет групповых занятий</p>`;

  const indSubsHtml = indGroups.length
    ? indGroups.map(renderSubCard).join('')
    : '';

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
    </div>

    <div class="section-title">Групповые занятия</div>
    <div style="display:flex; flex-direction:column; gap:var(--sp-3)">
      ${groupSubsHtml}
    </div>

    ${indSubsHtml ? `
      <div class="section-title mt-6">
        <i data-lucide="user-round" style="width:14px;height:14px;flex-shrink:0"></i>
        Индивидуальные
      </div>
      <div style="display:flex; flex-direction:column; gap:var(--sp-3)">
        ${indSubsHtml}
      </div>
    ` : ''}

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
  // If the groupId is absent from the regular groups list, it's an individual session
  const isInd      = !DB.GROUPS.includes(training.groupId);
  const clientName = isInd ? (allStudents.find(s => s.id === training.attendees[0])?.name ?? null) : null;
  const groupLabel = clientName
    ? `Индивидуальная тренировка с ${clientName}`
    : training.groupId;
  const metaParts  = [
    training.time || '',
    isInd ? '' : `${training.attendees.length} чел.`,
    training.note || '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="training-item" data-training-id="${training.id}">
      <div class="training-item__header">
        <div class="training-item__date">
          <span class="training-item__day">${Logic.formatDay(training.date)}</span>
          <span class="training-item__mon">${Logic.formatMonth(training.date)}</span>
        </div>
        <div class="training-item__info">
          <div class="training-item__group">${groupLabel}</div>
          <div class="training-item__meta">${metaParts}</div>
        </div>
        <button class="btn btn--ghost btn--sm training-item__add-btn"
                data-action="add-to-training" data-training-id="${training.id}"
                title="Добавить ученика">
          <i data-lucide="user-plus"></i>
        </button>
        <i data-lucide="chevron-down" class="training-item__chevron"></i>
      </div>
      <div class="training-item__body">
        ${training.attendees.length
          ? `<div style="display:flex; flex-wrap:wrap; gap:var(--sp-2)">
              ${training.attendees.map(id => {
                const name = allStudents.find(s => s.id === id)?.name ?? 'Удалён';
                return `
                  <span class="attendee-tag">
                    ${name}
                    <button class="attendee-tag__remove"
                            data-action="remove-from-training"
                            data-training-id="${training.id}"
                            data-student-id="${id}"
                            title="Убрать с тренировки">
                      <i data-lucide="x"></i>
                    </button>
                  </span>
                `;
              }).join('')}
             </div>`
          : `<p class="text-muted text-sm">Нет записей об учениках</p>`
        }
        <div style="margin-top:var(--sp-4); display:flex; justify-content:space-between; align-items:center">
          <button class="btn btn--secondary btn--sm"
                  data-action="add-to-training" data-training-id="${training.id}">
            <i data-lucide="user-plus"></i> Добавить ученика
          </button>
          <button class="btn btn--ghost btn--sm training-item__delete-btn"
                  data-action="delete-training" data-training-id="${training.id}"
                  title="Удалить тренировку">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Group card
───────────────────────────────────────────────── */

/**
 * Render a group card.
 * @param {{ id: string, name: string, days: string[], time: string, duration: number }} group
 * @param {{ total: number, active: number, ending: number, expired: number }} stats
 * @returns {string} HTML
 */
function renderGroupCard(group, stats) {
  const schedule = Logic.formatSchedule(group);
  return `
    <div class="group-card" data-group="${group.id}">
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:var(--sp-2)">
        <div class="group-card__name" style="margin-bottom:0">${group.name}</div>
        <button class="btn btn--ghost btn--sm" data-action="edit-group" data-group-id="${group.id}"
                title="Редактировать группу" style="margin:-4px -4px 0 0; flex-shrink:0">
          <i data-lucide="pencil"></i>
        </button>
      </div>
      <div class="text-sm text-muted" style="margin-bottom:var(--sp-4)">${schedule}</div>
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
function renderAddTrainingModal(students, defaultGroup = null) {
  const groupOptions = DB.GROUPS.map(g =>
    `<option value="${g}" ${g === defaultGroup ? 'selected' : ''}>${g}</option>`
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
   Modals: Create / Edit group
───────────────────────────────────────────────── */

const WEEK_DAYS = [
  { abbr: 'Пн', full: 'Понедельник' },
  { abbr: 'Вт', full: 'Вторник' },
  { abbr: 'Ср', full: 'Среда' },
  { abbr: 'Чт', full: 'Четверг' },
  { abbr: 'Пт', full: 'Пятница' },
  { abbr: 'Сб', full: 'Суббота' },
  { abbr: 'Вс', full: 'Воскресенье' },
];
const DURATIONS = [30, 45, 60, 90, 120];

/**
 * Render the group create/edit modal body.
 * Each day gets its own time input for custom schedules.
 * @param {object|null} group — null for create
 * @returns {string}
 */
function renderGroupModal(group) {
  const isEdit   = !!group;
  const schedule = group?.schedule ?? [];
  const duration = group?.duration ?? 60;

  const getEntry = abbr => schedule.find(s => s.day === abbr);

  const scheduleRows = WEEK_DAYS.map(({ abbr, full }) => {
    const entry     = getEntry(abbr);
    const isChecked = !!entry;
    const time      = entry?.time ?? '';
    const [hh = '', mm = ''] = time ? time.split(':') : [];
    return `
      <div class="schedule-row${isChecked ? ' active' : ''}" data-day="${abbr}">
        <label class="schedule-day-label">
          <input type="checkbox" class="schedule-day-cb" value="${abbr}" ${isChecked ? 'checked' : ''} />
          <span class="schedule-day-name">${full}</span>
        </label>
        <div class="time-input${isChecked ? '' : ' disabled'}">
          <input type="text" class="time-h" maxlength="2" placeholder="ЧЧ"
                 value="${hh}" ${isChecked ? '' : 'disabled'} inputmode="numeric" />
          <span class="time-sep">:</span>
          <input type="text" class="time-m" maxlength="2" placeholder="ММ"
                 value="${mm}" ${isChecked ? '' : 'disabled'} inputmode="numeric" />
        </div>
      </div>
    `;
  }).join('');

  const durationOptions = DURATIONS.map(m =>
    `<option value="${m}" ${duration === m ? 'selected' : ''}>${m} мин</option>`
  ).join('');

  return `
    ${isEdit ? `
      <div class="form-group">
        <label class="form-label">Название</label>
        <div class="form-input" style="background:var(--surface-2);color:var(--text-muted);cursor:default">${group.name}</div>
      </div>
    ` : `
      <div class="form-group">
        <label class="form-label">Название группы</label>
        <input class="form-input" id="groupName" placeholder="Например: Дети" />
      </div>
    `}
    <div class="form-group">
      <label class="form-label">Расписание</label>
      <div class="schedule-list">${scheduleRows}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Длительность занятия</label>
      <select class="form-select" id="groupDuration">${durationOptions}</select>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Modals: Add student to existing training
───────────────────────────────────────────────── */

/**
 * Render modal for adding a student to an existing training.
 * @param {string} groupId
 * @param {Student[]} groupStudents — students in group NOT yet attending
 * @returns {string}
 */
function renderAddToTrainingModal(groupId, groupStudents) {
  const existingList = groupStudents.length
    ? groupStudents.map(s => {
        const sub    = s.subscriptions.find(sub => sub.groupId === groupId && sub.isActive);
        const status = Logic.getSubStatus(s, groupId);
        const days   = sub ? Logic.getDaysRemaining(sub) : null;
        const meta   = sub
          ? `${sub.remaining}/${sub.total} зан.${days !== null ? ' · ' + (days < 0 ? 'срок истёк' : days + ' дн.') : ''}`
          : 'нет абонемента';
        return `
          <div class="checkbox-item">
            <input type="checkbox" id="add-${s.id}" name="addAttendees" value="${s.id}" />
            <label for="add-${s.id}" style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:var(--sp-3)">
              <span class="font-medium">${s.name}</span>
              <span style="display:flex; align-items:center; gap:var(--sp-2); flex-shrink:0">
                <span class="text-muted text-sm">${meta}</span>
                ${renderBadge(status)}
              </span>
            </label>
          </div>
        `;
      }).join('')
    : `<p class="text-muted text-sm" style="padding:var(--sp-2)">Все ученики группы уже записаны на эту тренировку</p>`;

  return `
    <div style="display:flex; gap:var(--sp-2); margin-bottom:var(--sp-5); border-bottom:1px solid var(--border); padding-bottom:var(--sp-4)">
      <button class="btn btn--primary btn--sm" id="tabExisting" style="flex:1">Из группы</button>
      <button class="btn btn--secondary btn--sm" id="tabNew" style="flex:1">Новый ученик</button>
    </div>

    <div id="sectionExisting">
      <div class="form-group">
        <label class="form-label">Ученики группы «${groupId}»</label>
        <div class="checkbox-group">${existingList}</div>
      </div>
    </div>

    <div id="sectionNew" style="display:none">
      <div class="form-group">
        <label class="form-label">Имя и фамилия</label>
        <input class="form-input" id="newStudentName" placeholder="Алексей Иванов" />
      </div>
      <div class="form-group">
        <label class="form-label">Абонемент</label>
        <select class="form-select" id="newStudentSub">
          <option value="">— без абонемента —</option>
          <option value="1">Разовое посещение</option>
          <option value="4">4 занятия</option>
          <option value="8">8 занятий</option>
        </select>
      </div>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Modals: Extend subscription by days
───────────────────────────────────────────────── */

/**
 * Render the "Extend subscription time" modal body.
 * @param {string} studentName
 * @param {string} groupId
 * @param {Subscription|null} sub — current subscription to show current expiry
 * @returns {string}
 */
function renderExtendSubModal(studentName, groupId, sub) {
  const options = [7, 14, 21, 30, 35, 45, 60, 90].map(d =>
    `<option value="${d}"${d === 35 ? ' selected' : ''}>${d} дней</option>`
  ).join('');

  const currentExpiry = sub?.expiresAt
    ? `<div class="text-secondary text-sm" style="margin-top:var(--sp-2)">
         Текущий срок: <strong>${Logic.formatDateFull(sub.expiresAt)}</strong>
       </div>`
    : '';

  return `
    <p class="text-secondary text-sm">
      Ученик: <strong>${studentName}</strong><br/>
      Группа: <strong>${groupId}</strong>
    </p>
    ${currentExpiry}
    <div class="form-group" style="margin-top:var(--sp-4)">
      <label class="form-label">Продлить срок на</label>
      <select class="form-select" id="extendDays">
        ${options}
      </select>
    </div>
  `;
}

/* ────────────────────────────────────────────────
   Modal: Individual session
───────────────────────────────────────────────── */

/**
 * Render the "Create individual session" modal body.
 * @param {Student[]} students — all students
 * @param {string} indGroupId — the individual group name
 * @returns {string}
 */
function renderIndividualSessionModal(students, indGroupId) {
  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const options = sorted.map(s => {
    const hasSub = s.subscriptions.some(sub => sub.groupId === indGroupId && sub.isActive);
    return `<option value="${s.id}">${s.name}${hasSub ? '' : ' — нет абонемента'}</option>`;
  }).join('');

  return `
    <div class="form-group">
      <label class="form-label">Клиент</label>
      <select class="form-select" id="indSessionClient">
        <option value="">— выберите клиента —</option>
        ${options}
      </select>
      <div id="indClientSubInfo"></div>
    </div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-4)">
      <div class="form-group">
        <label class="form-label">Дата</label>
        <input class="form-input" type="date" id="indSessionDate"
               value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <div class="form-group">
        <label class="form-label">Время</label>
        <input class="form-input" type="time" id="indSessionTime" value="18:00" />
      </div>
    </div>
    <div class="form-group" id="indSubTypeGroup" style="display:none">
      <label class="form-label">Абонемент</label>
      <select class="form-select" id="indSubType">
        <option value="1">Разовое посещение</option>
        <option value="4">4 занятия</option>
        <option value="8">8 занятий</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Комментарий (необязательно)</label>
      <textarea class="form-textarea" id="indSessionNote"
                placeholder="Например: работали над акробатикой..."></textarea>
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
  renderExtendSubModal,
  renderAddToTrainingModal,
  renderGroupModal,
  renderIndividualSessionModal,
};
