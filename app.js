/**
 * app.js — Application entry point
 * Handles routing, page init, global event delegation.
 * Coordinates between UI, Logic, and DB layers.
 */

'use strict';

/* ────────────────────────────────────────────────
   State
───────────────────────────────────────────────── */
const AppState = {
  currentPage: 'home',
  studentsFilter: { group: '', status: '', search: '' },
  groupView: null,  // currently viewed group in Groups section
};

/* ────────────────────────────────────────────────
   Router
───────────────────────────────────────────────── */

/**
 * Navigate to a page by name.
 * @param {string} page — 'home' | 'students' | 'groups' | 'trainings'
 */
async function navigate(page) {
  // Update state
  AppState.currentPage = page;

  // Update nav items (sidebar + bottom)
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Hide all pages, show target
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    // Re-trigger animation
    target.style.animation = 'none';
    target.offsetHeight; // reflow
    target.style.animation = '';
  }

  // Render the page
  switch (page) {
    case 'home':      await renderHome();      break;
    case 'students':  await renderStudents();  break;
    case 'groups':    await renderGroups();    break;
    case 'trainings': await renderTrainings(); break;
  }

  // Re-create lucide icons
  lucide.createIcons();
}

/* ────────────────────────────────────────────────
   Page: Home
───────────────────────────────────────────────── */

async function renderHome() {
  const el = document.getElementById('page-home');
  el.innerHTML = '<div class="page-header"><h1 class="page-title">Главная</h1></div>' +
    '<div id="kpi-area"></div>' +
    '<div id="warnings-area"></div>' +
    '<div id="recent-trainings-area"></div>';

  // KPIs
  const kpis = await Logic.getKPIs();
  document.getElementById('kpi-area').innerHTML = UI.renderKPIGrid(kpis);
  lucide.createIcons({ nodes: [document.getElementById('kpi-area')] });
  UI.animateCountUp();

  // Warnings
  const warnings = await Logic.getWarningStudents();
  const wArea = document.getElementById('warnings-area');

  if (warnings.length) {
    wArea.innerHTML = `
      <div class="section-title">⚠️ Требуют внимания</div>
      <div class="warning-list">
        ${warnings.map(w => UI.renderWarningItem(w)).join('')}
      </div>
    `;
    lucide.createIcons({ nodes: [wArea] });
  } else {
    wArea.innerHTML = `
      <div class="section-title">Статус абонементов</div>
      <div class="card" style="text-align:center; color:var(--success); padding:var(--sp-6)">
        ✓ Все абонементы в порядке
      </div>
    `;
  }

  // Recent trainings
  const trainings = await DB.getTrainings();
  const students  = await DB.getStudents();
  const recent    = trainings.slice(0, 3);
  const tArea     = document.getElementById('recent-trainings-area');

  tArea.innerHTML = `
    <div class="section-title mt-6">Последние тренировки</div>
    ${recent.length
      ? `<div style="display:flex; flex-direction:column; gap:var(--sp-3)">
           ${recent.map(t => UI.renderTrainingItem(t, students)).join('')}
         </div>`
      : UI.renderEmptyState({ icon: 'calendar', title: 'Тренировок пока нет' })
    }
  `;
  lucide.createIcons({ nodes: [tArea] });
  setupTrainingToggles(tArea);
}

/* ────────────────────────────────────────────────
   Page: Students
───────────────────────────────────────────────── */

async function renderStudents(filter = AppState.studentsFilter) {
  const el = document.getElementById('page-students');

  let students = await DB.getStudents();

  // Apply filters
  if (filter.group) students = students.filter(s => s.groups.includes(filter.group));
  if (filter.search) {
    const q = filter.search.toLowerCase();
    students = students.filter(s => s.name.toLowerCase().includes(q));
  }
  if (filter.status) {
    students = students.filter(s => {
      const st = Logic.getOverallSubStatus(s);
      return st.type === filter.status;
    });
  }

  const groupOptions = DB.GROUPS.map(g =>
    `<option value="${g}" ${filter.group === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Ученики</h1>
        <div class="page-subtitle">${students.length} чел.</div>
      </div>
      <button class="btn btn--primary" id="addStudentBtn">
        <i data-lucide="user-plus"></i> Добавить ученика
      </button>
    </div>

    <div class="toolbar">
      <input class="search-input" id="studentSearch" placeholder="Поиск по имени…"
             value="${filter.search}" />
      <select class="filter-select" id="groupFilter">
        <option value="">Все группы</option>
        ${groupOptions}
      </select>
      <select class="filter-select" id="statusFilter">
        <option value="">Все статусы</option>
        <option value="active"  ${filter.status === 'active'  ? 'selected' : ''}>Активен</option>
        <option value="ending"  ${filter.status === 'ending'  ? 'selected' : ''}>Заканчивается</option>
        <option value="expired" ${filter.status === 'expired' ? 'selected' : ''}>Нужно продлить</option>
      </select>
    </div>

    <div class="table-wrap">
      ${students.length ? `
        <table class="table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Группы</th>
              <th>Абонемент</th>
              <th>Статус</th>
              <th>Последнее посещение</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => UI.renderStudentRow(s)).join('')}
          </tbody>
        </table>
      ` : UI.renderEmptyState({
          icon: 'users',
          title: 'Ученики не найдены',
          text: filter.group || filter.search || filter.status
            ? 'Попробуйте изменить фильтры'
            : 'Добавьте первого ученика',
        })
      }
    </div>
  `;

  lucide.createIcons({ nodes: [el] });

  // Filters
  el.querySelector('#studentSearch')?.addEventListener('input', e => {
    AppState.studentsFilter.search = e.target.value;
    renderStudents(AppState.studentsFilter);
  });
  el.querySelector('#groupFilter')?.addEventListener('change', e => {
    AppState.studentsFilter.group = e.target.value;
    renderStudents(AppState.studentsFilter);
  });
  el.querySelector('#statusFilter')?.addEventListener('change', e => {
    AppState.studentsFilter.status = e.target.value;
    renderStudents(AppState.studentsFilter);
  });

  // Add student
  el.querySelector('#addStudentBtn')?.addEventListener('click', openAddStudentModal);

  // Row clicks → student drawer
  el.querySelectorAll('[data-action="view-student"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openStudentDrawer(btn.dataset.id);
    });
  });
  el.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => openStudentDrawer(row.dataset.studentId));
  });
}

/* ────────────────────────────────────────────────
   Page: Groups
───────────────────────────────────────────────── */

async function renderGroups() {
  const el = document.getElementById('page-groups');

  if (AppState.groupView) {
    await renderGroupDetail(AppState.groupView);
    return;
  }

  // Load stats for all groups
  const statsArr = await Promise.all(
    DB.GROUPS.map(g => Logic.getGroupStats(g).then(s => ({ g, s })))
  );

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Группы</h1>
    </div>
    <div class="groups-grid">
      ${statsArr.map(({ g, s }) => UI.renderGroupCard(g, s)).join('')}
    </div>
  `;

  lucide.createIcons({ nodes: [el] });

  el.querySelectorAll('.group-card').forEach(card => {
    card.addEventListener('click', () => {
      AppState.groupView = card.dataset.group;
      renderGroups();
    });
  });
}

async function renderGroupDetail(groupId) {
  const el = document.getElementById('page-groups');
  const students = await Logic.getStudentsByGroup(groupId);
  const stats    = await Logic.getGroupStats(groupId);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <button class="btn btn--ghost btn--sm" id="backToGroups" style="margin-bottom:var(--sp-2)">
          <i data-lucide="arrow-left"></i> Все группы
        </button>
        <h1 class="page-title">${groupId}</h1>
        <div class="page-subtitle">${stats.total} учеников</div>
      </div>
    </div>

    <div class="kpi-grid" style="margin-bottom:var(--sp-6)">
      <div class="kpi-card kpi-card--ok">
        <div class="kpi-card__icon"><i data-lucide="check-circle"></i></div>
        <div class="kpi-card__label">Активных</div>
        <div class="kpi-card__value">${stats.active}</div>
      </div>
      <div class="kpi-card kpi-card--warn">
        <div class="kpi-card__icon"><i data-lucide="alert-triangle"></i></div>
        <div class="kpi-card__label">Заканчивается</div>
        <div class="kpi-card__value">${stats.ending}</div>
      </div>
      <div class="kpi-card kpi-card--danger">
        <div class="kpi-card__icon"><i data-lucide="alert-circle"></i></div>
        <div class="kpi-card__label">Нужно продлить</div>
        <div class="kpi-card__value">${stats.expired}</div>
      </div>
    </div>

    <div class="table-wrap">
      ${students.length ? `
        <table class="table">
          <thead>
            <tr>
              <th>Имя</th>
              <th>Статус</th>
              <th>Абонемент</th>
              <th>Последнее посещение</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const st  = Logic.getSubStatus(s, groupId);
              const sub = s.subscriptions.find(sub => sub.groupId === groupId && sub.isActive);
              const lv  = DB.getLastVisitDate(s);
              return `
                <tr data-student-id="${s.id}" style="cursor:pointer">
                  <td class="font-medium">${s.name}</td>
                  <td>${UI.renderBadge(st)}</td>
                  <td>${UI.renderProgressBar(sub)}</td>
                  <td class="text-sm text-secondary">${lv ? Logic.formatDateShort(lv) : '—'}</td>
                  <td>
                    <button class="btn btn--ghost btn--sm" data-action="view-student" data-id="${s.id}">
                      <i data-lucide="chevron-right"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : UI.renderEmptyState({ icon: 'users', title: 'В группе нет учеников' })}
    </div>
  `;

  lucide.createIcons({ nodes: [el] });

  el.querySelector('#backToGroups')?.addEventListener('click', () => {
    AppState.groupView = null;
    renderGroups();
  });

  el.querySelectorAll('[data-action="view-student"], tbody tr').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const id = el.dataset.id || el.dataset.studentId;
      if (id) openStudentDrawer(id);
    });
  });
}

/* ────────────────────────────────────────────────
   Page: Trainings
───────────────────────────────────────────────── */

async function renderTrainings() {
  const el = document.getElementById('page-trainings');
  const [trainings, students] = await Promise.all([
    DB.getTrainings(),
    DB.getStudents(),
  ]);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Тренировки</h1>
        <div class="page-subtitle">${trainings.length} записей</div>
      </div>
      <button class="btn btn--primary" id="addTrainingBtn">
        <i data-lucide="plus"></i> Записать тренировку
      </button>
    </div>

    <div style="display:flex; flex-direction:column; gap:var(--sp-3)">
      ${trainings.length
        ? trainings.map(t => UI.renderTrainingItem(t, students)).join('')
        : UI.renderEmptyState({
            icon: 'calendar',
            title: 'Тренировок пока нет',
            text: 'Запишите первую тренировку',
          })
      }
    </div>
  `;

  lucide.createIcons({ nodes: [el] });
  setupTrainingToggles(el);

  el.querySelector('#addTrainingBtn')?.addEventListener('click', () => openAddTrainingModal(students));
}

/* ────────────────────────────────────────────────
   Training accordion
───────────────────────────────────────────────── */

function setupTrainingToggles(container) {
  container.querySelectorAll('.training-item__header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.training-item').classList.toggle('expanded');
    });
  });
}

/* ────────────────────────────────────────────────
   Modal: Add student
───────────────────────────────────────────────── */

function openAddStudentModal() {
  UI.openModal({
    title: 'Новый ученик',
    body: UI.renderAddStudentModal(),
    footer: `
      <button class="btn btn--secondary" id="cancelAddStudent">Отмена</button>
      <button class="btn btn--primary"   id="saveAddStudent">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      modal.querySelector('#cancelAddStudent')?.addEventListener('click', UI.closeModal);

      // Live update subscription fields when groups change
      modal.querySelectorAll('input[name="groups"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const selected = [...modal.querySelectorAll('input[name="groups"]:checked')]
            .map(c => c.value);
          modal.querySelector('#subFields').innerHTML = UI.renderSubFields(selected);
        });
      });

      modal.querySelector('#saveAddStudent')?.addEventListener('click', async () => {
        const name = modal.querySelector('#studentName').value.trim();
        if (!name) {
          UI.showToast({ type: 'error', title: 'Введите имя ученика' });
          return;
        }

        const groups = [...modal.querySelectorAll('input[name="groups"]:checked')].map(c => c.value);
        if (!groups.length) {
          UI.showToast({ type: 'warn', title: 'Выберите хотя бы одну группу' });
          return;
        }

        const student = await DB.createStudent({ name, groups });

        // Add subscriptions
        const startDate = modal.querySelector('#subStartDate')?.value;
        const subSelects = modal.querySelectorAll('[data-group-sub]');

        for (const sel of subSelects) {
          if (sel.value) {
            await DB.addSubscription(student.id, {
              groupId:   sel.dataset.groupSub,
              type:      sel.value,
              createdAt: startDate || new Date().toISOString().slice(0, 10),
            });
          }
        }

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Ученик добавлен', msg: student.name });
        await renderStudents();
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Modal: Add training
───────────────────────────────────────────────── */

function openAddTrainingModal(students) {
  UI.openModal({
    title: 'Записать тренировку',
    body: UI.renderAddTrainingModal(students),
    footer: `
      <button class="btn btn--secondary" id="cancelAddTraining">Отмена</button>
      <button class="btn btn--primary"   id="saveAddTraining">Сохранить и списать</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      modal.querySelector('#cancelAddTraining')?.addEventListener('click', UI.closeModal);

      // Update attendee list when group changes
      modal.querySelector('#trainingGroup')?.addEventListener('change', e => {
        const groupId = e.target.value;
        const filtered = students.filter(s => s.groups.includes(groupId));
        modal.querySelector('#attendeeList').innerHTML =
          UI.renderAttendeeCheckboxes(filtered);
      });

      modal.querySelector('#saveAddTraining')?.addEventListener('click', async () => {
        const groupId = modal.querySelector('#trainingGroup').value;
        const date    = modal.querySelector('#trainingDate').value;
        const time    = modal.querySelector('#trainingTime').value;
        const note    = modal.querySelector('#trainingNote').value.trim();

        if (!groupId || !date) {
          UI.showToast({ type: 'error', title: 'Заполните группу и дату' });
          return;
        }

        const attendees = [...modal.querySelectorAll('input[name="attendees"]:checked')]
          .map(c => c.value);

        // Create training
        const training = await DB.createTraining({ date, time, groupId, attendees, note });

        // Mark attendance & deduct sessions
        const results = await Logic.markAttendance(training, attendees);

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Тренировка записана', msg: `${groupId} · ${attendees.length} чел.` });

        // Show warnings for problematic subscriptions
        for (const r of results) {
          if (r.status === 'expired') {
            UI.showToast({ type: 'error', title: `${r.name}`, msg: 'Абонемент закончился — нужно продлить' });
          } else if (r.status === 'ending') {
            UI.showToast({ type: 'warn', title: `${r.name}`, msg: `Осталось ${r.sub?.remaining} занятий` });
          } else if (r.status === 'none') {
            UI.showToast({ type: 'warn', title: `${r.name}`, msg: 'Нет активного абонемента' });
          }
        }

        await renderTrainings();
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Modal: Renew subscription
───────────────────────────────────────────────── */

async function openRenewSubModal(studentId, groupId) {
  const student = await DB.getStudentById(studentId);
  if (!student) return;

  UI.openModal({
    title: 'Продлить абонемент',
    body: UI.renderRenewSubModal(student.name, groupId),
    footer: `
      <button class="btn btn--secondary" id="cancelRenew">Отмена</button>
      <button class="btn btn--primary"   id="saveRenew">Продлить</button>
    `,
    onOpen: modal => {
      modal.querySelector('#cancelRenew')?.addEventListener('click', UI.closeModal);
      modal.querySelector('#saveRenew')?.addEventListener('click', async () => {
        const type = modal.querySelector('#renewSubType').value;
        const date = modal.querySelector('#renewSubDate').value;

        await DB.addSubscription(studentId, { groupId, type, createdAt: date });

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Абонемент продлён', msg: `${student.name} · ${groupId}` });

        // Refresh current page
        await navigate(AppState.currentPage);
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Drawer: Student detail
───────────────────────────────────────────────── */

async function openStudentDrawer(studentId) {
  const student = await DB.getStudentById(studentId);
  if (!student) return;

  UI.openDrawer({
    title: student.name,
    body: UI.renderStudentDetail(student),
    onOpen: drawer => {
      lucide.createIcons({ nodes: [drawer] });

      // Renew buttons
      drawer.querySelectorAll('[data-action="renew-sub"]').forEach(btn => {
        btn.addEventListener('click', () => {
          UI.closeDrawer();
          openRenewSubModal(btn.dataset.studentId, btn.dataset.group);
        });
      });

      // Delete student
      drawer.querySelector('[data-action="delete-student"]')?.addEventListener('click', async () => {
        if (!confirm(`Удалить ученика "${student.name}"?`)) return;
        await DB.deleteStudent(studentId);
        UI.closeDrawer();
        UI.showToast({ type: 'success', title: 'Ученик удалён' });
        await navigate(AppState.currentPage);
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Global event delegation (warning list renew buttons)
───────────────────────────────────────────────── */

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action="renew-sub"]');
  if (btn && !btn.closest('.drawer') && !btn.closest('.modal')) {
    openRenewSubModal(btn.dataset.studentId, btn.dataset.group);
  }
});

/* ────────────────────────────────────────────────
   Theme toggle
───────────────────────────────────────────────── */

function initTheme() {
  const saved = localStorage.getItem('tk_theme') ?? 'dark';
  document.documentElement.dataset.theme = saved;
  updateThemeIcon(saved);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i data-lucide="sun"></i>'
    : '<i data-lucide="moon"></i>';
  lucide.createIcons({ nodes: [btn] });
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tk_theme', next);
  updateThemeIcon(next);
});

/* ────────────────────────────────────────────────
   Navigation listeners
───────────────────────────────────────────────── */

function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page === 'groups') AppState.groupView = null;
      navigate(page);
    });
  });
}

/* ────────────────────────────────────────────────
   Boot
───────────────────────────────────────────────── */

async function init() {
  // Seed demo data if first run
  await DB.seedDemoData();

  // Theme
  initTheme();

  // Navigation
  initNavigation();

  // Initial page
  await navigate('home');

  console.log('🥋 TriKick app ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
