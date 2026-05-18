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
    case 'home':       await renderHome();       break;
    case 'students':   await renderStudents();   break;
    case 'groups':     await renderGroups();     break;
    case 'trainings':  await renderTrainings();  break;
    case 'individual': await renderIndividual(); break;
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
   Page: Individual sessions
───────────────────────────────────────────────── */

/** Ensure the internal "Индивидуальные" group exists; create it if not. */
async function ensureIndividualGroup() {
  const groups = await DB.getGroups();
  let indGroup = groups.find(g => g.isIndividual);
  if (!indGroup) {
    indGroup = await DB.createGroup({ name: 'Индивидуальные', schedule: [], duration: 60, isIndividual: true });
  }
  return indGroup;
}

async function renderIndividual() {
  const el = document.getElementById('page-individual');

  const indGroup   = await ensureIndividualGroup();
  const indGroupId = indGroup.name;

  const [kpis, warnings, students, trainings] = await Promise.all([
    Logic.getIndividualKPIs([indGroupId]),
    Logic.getIndividualWarnings([indGroupId]),
    DB.getStudents(),
    DB.getTrainings(),
  ]);

  const clients        = students.filter(s => s.groups.includes(indGroupId));
  const recentSessions = trainings.filter(t => t.groupId === indGroupId).slice(0, 5);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Индивидуальные занятия</h1>
        <div class="page-subtitle">${kpis.clients} клиентов</div>
      </div>
      <button class="btn btn--primary" id="addIndSessionBtn">
        <i data-lucide="plus"></i> Записать занятие
      </button>
    </div>

    <div class="kpi-grid" style="margin-bottom:var(--sp-6)">
      <div class="kpi-card kpi-card--accent">
        <div class="kpi-card__icon"><i data-lucide="users"></i></div>
        <div class="kpi-card__label">Всего клиентов</div>
        <div class="kpi-card__value" data-countup="${kpis.clients}">0</div>
      </div>
      <div class="kpi-card kpi-card--ok">
        <div class="kpi-card__icon"><i data-lucide="calendar-check"></i></div>
        <div class="kpi-card__label">Занятий за месяц</div>
        <div class="kpi-card__value" data-countup="${kpis.monthSessions}">0</div>
      </div>
      <div class="kpi-card kpi-card--accent">
        <div class="kpi-card__icon"><i data-lucide="calendar"></i></div>
        <div class="kpi-card__label">За эту неделю</div>
        <div class="kpi-card__value" data-countup="${kpis.weekSessions}">0</div>
      </div>
      <div class="kpi-card kpi-card--${kpis.expiring > 0 ? 'danger' : 'ok'}">
        <div class="kpi-card__icon"><i data-lucide="alert-circle"></i></div>
        <div class="kpi-card__label">Требуют внимания</div>
        <div class="kpi-card__value" data-countup="${kpis.expiring}">0</div>
      </div>
    </div>

    ${warnings.length ? `
      <div class="section-title">⚠️ Требуют внимания</div>
      <div class="warning-list" style="margin-bottom:var(--sp-6)">
        ${warnings.map(w => UI.renderWarningItem(w)).join('')}
      </div>
    ` : ''}

    <div class="section-title">Клиенты</div>
    <div class="table-wrap" style="margin-bottom:var(--sp-6)">
      ${clients.length ? `
        <table class="table">
          <thead><tr>
            <th>Имя</th>
            <th>Абонемент</th>
            <th>Статус</th>
            <th>Последнее занятие</th>
            <th></th>
          </tr></thead>
          <tbody>
            ${clients.map(s => {
              const sub    = s.subscriptions.find(sub => sub.groupId === indGroupId && sub.isActive);
              const status = Logic.getSubStatus(s, indGroupId);
              const lv     = DB.getLastVisitDate(s);
              return `
                <tr data-student-id="${s.id}">
                  <td class="font-medium">${s.name}</td>
                  <td>${UI.renderProgressBar(sub)}</td>
                  <td>${UI.renderBadge(status)}</td>
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
      ` : UI.renderEmptyState({ icon: 'user-round', title: 'Нет клиентов', text: 'Нажмите «Записать занятие», чтобы добавить клиента' })}
    </div>

    ${recentSessions.length ? `
      <div class="section-title">Последние занятия</div>
      <div style="display:flex; flex-direction:column; gap:var(--sp-3)">
        ${recentSessions.map(t => UI.renderTrainingItem(t, students)).join('')}
      </div>
    ` : ''}
  `;

  lucide.createIcons({ nodes: [el] });
  UI.animateCountUp();
  setupTrainingToggles(el);

  el.querySelectorAll('[data-action="view-student"]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openStudentDrawer(btn.dataset.id); });
  });
  el.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => openStudentDrawer(row.dataset.studentId));
  });

  el.querySelector('#addIndSessionBtn')?.addEventListener('click', () => {
    openCreateIndividualSessionModal(indGroupId);
  });
}

/* ────────────────────────────────────────────────
   Modal: Create individual session
───────────────────────────────────────────────── */

async function openCreateIndividualSessionModal(indGroupId) {
  const allStudents = await DB.getStudents();

  UI.openModal({
    title: 'Записать индивидуальное занятие',
    body: UI.renderIndividualSessionModal(allStudents, indGroupId),
    footer: `
      <button class="btn btn--secondary" id="cancelIndSession">Отмена</button>
      <button class="btn btn--primary"   id="saveIndSession">Записать и списать</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      const clientSelect = modal.querySelector('#indSessionClient');
      const subInfoEl    = modal.querySelector('#indClientSubInfo');
      const subTypeGroup = modal.querySelector('#indSubTypeGroup');

      const refreshClientInfo = () => {
        const studentId = clientSelect.value;
        if (!studentId) {
          subInfoEl.innerHTML = '';
          subTypeGroup.style.display = 'none';
          return;
        }
        const student   = allStudents.find(s => s.id === studentId);
        const activeSub = student?.subscriptions.find(s => s.groupId === indGroupId && s.isActive);

        if (activeSub) {
          subInfoEl.innerHTML = `
            <div class="card" style="padding:var(--sp-3); margin-top:var(--sp-2)">
              ${UI.renderProgressBar(activeSub)}
            </div>
          `;
          subTypeGroup.style.display = 'none';
        } else {
          subInfoEl.innerHTML = `<p class="text-muted text-sm" style="margin-top:var(--sp-2)">Нет активного абонемента — выберите тип занятия</p>`;
          subTypeGroup.style.display = '';
        }
      };

      clientSelect.addEventListener('change', refreshClientInfo);
      modal.querySelector('#cancelIndSession')?.addEventListener('click', UI.closeModal);

      modal.querySelector('#saveIndSession')?.addEventListener('click', async () => {
        const studentId = clientSelect.value;
        const date      = modal.querySelector('#indSessionDate').value;
        const time      = modal.querySelector('#indSessionTime').value;
        const note      = modal.querySelector('#indSessionNote')?.value.trim() || '';

        if (!studentId || !date) {
          UI.showToast({ type: 'error', title: 'Выберите клиента и дату' });
          return;
        }

        // Ensure student is linked to individual group
        const student = await DB.getStudentById(studentId);
        if (!student.groups.includes(indGroupId)) {
          await DB.updateStudent(studentId, { groups: [...student.groups, indGroupId] });
        }

        // If no active sub, create one from selected type
        const activeSub = student.subscriptions.find(s => s.groupId === indGroupId && s.isActive);
        if (!activeSub) {
          const subType = modal.querySelector('#indSubType')?.value || '1';
          await DB.addSubscription(studentId, { groupId: indGroupId, type: subType, createdAt: date });
        }

        // Create training and mark attendance
        const training = await DB.createTraining({ date, time, groupId: indGroupId, attendees: [studentId], note });
        const results  = await Logic.markAttendance(training, [studentId]);

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Занятие записано', msg: student.name });

        for (const r of results) {
          if (r.status === 'expired') {
            UI.showToast({ type: 'error', title: r.name, msg: 'Абонемент закончился — нужно продлить' });
          } else if (r.status === 'ending') {
            UI.showToast({ type: 'warn', title: r.name, msg: `Осталось ${r.sub?.remaining} занятий` });
          }
        }

        await renderIndividual();
      });
    },
  });
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

    ${students.length
      ? `<div class="students-grid">
           ${students.map(s => UI.renderStudentCard(s)).join('')}
         </div>`
      : UI.renderEmptyState({
          icon: 'users',
          title: 'Ученики не найдены',
          text: filter.group || filter.search || filter.status
            ? 'Попробуйте изменить фильтры'
            : 'Добавьте первого ученика',
        })
    }
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

  // Card clicks → student drawer
  el.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('click', () => openStudentDrawer(card.dataset.studentId));
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

  const groups   = (await DB.getGroups()).filter(g => !g.isIndividual);
  const statsArr = await Promise.all(
    groups.map(g => Logic.getGroupStats(g.name).then(s => ({ g, s })))
  );

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Группы</h1>
      <button class="btn btn--primary" id="createGroupBtn">
        <i data-lucide="plus"></i> Создать группу
      </button>
    </div>
    <div class="groups-grid">
      ${statsArr.map(({ g, s }) => UI.renderGroupCard(g, s)).join('')}
    </div>
  `;

  lucide.createIcons({ nodes: [el] });

  el.querySelector('#createGroupBtn')?.addEventListener('click', openCreateGroupModal);

  el.querySelectorAll('[data-action="edit-group"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditGroupModal(btn.dataset.groupId);
    });
  });

  el.querySelectorAll('.group-card').forEach(card => {
    card.addEventListener('click', () => {
      AppState.groupView = card.dataset.group;
      renderGroups();
    });
  });
}

async function renderGroupDetail(groupId) {
  const el      = document.getElementById('page-groups');
  const group   = await DB.getGroupById(groupId);
  const students = await Logic.getStudentsByGroup(groupId);
  const stats    = await Logic.getGroupStats(groupId);
  const schedule = Logic.formatSchedule(group);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <button class="btn btn--ghost btn--sm" id="backToGroups" style="margin-bottom:var(--sp-2)">
          <i data-lucide="arrow-left"></i> Все группы
        </button>
        <h1 class="page-title">${groupId}</h1>
        <div class="page-subtitle">${stats.total} учеников${schedule ? ' · ' + schedule : ''}</div>
      </div>
      <button class="btn btn--secondary" id="editGroupBtn">
        <i data-lucide="pencil"></i> Редактировать
      </button>
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

  el.querySelector('#editGroupBtn')?.addEventListener('click', () => openEditGroupModal(groupId));

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
   Training accordion + actions
───────────────────────────────────────────────── */

function setupTrainingToggles(container) {
  container.querySelectorAll('.training-item__header').forEach(header => {
    header.addEventListener('click', e => {
      // Don't toggle if user clicked the add button inside the header
      if (e.target.closest('[data-action="add-to-training"]')) return;
      header.closest('.training-item').classList.toggle('expanded');
    });
  });

  container.querySelectorAll('[data-action="add-to-training"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const students = await DB.getStudents();
      openAddToTrainingModal(btn.dataset.trainingId, students);
    });
  });

  container.querySelectorAll('[data-action="remove-from-training"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { trainingId, studentId } = btn.dataset;

      const training = await DB.getTrainingById(trainingId);
      if (!training) return;

      const student = await DB.getStudentById(studentId);
      const name = student?.name ?? 'Ученик';

      await DB.updateTraining(trainingId, {
        attendees: training.attendees.filter(id => id !== studentId),
      });
      await DB.restoreSession(studentId, training.groupId);
      await DB.removeVisit(studentId, trainingId);

      UI.showToast({ type: 'info', title: 'Убран с тренировки', msg: name });

      if (AppState.currentPage === 'trainings')  await renderTrainings();
      else if (AppState.currentPage === 'home')   await renderHome();
      else if (AppState.currentPage === 'individual') await renderIndividual();
    });
  });

  container.querySelectorAll('[data-action="delete-training"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const { trainingId } = btn.dataset;

      const training = await DB.getTrainingById(trainingId);
      if (!training) return;

      if (!confirm('Удалить тренировку? Занятия будут возвращены ученикам.')) return;

      for (const studentId of training.attendees) {
        await DB.restoreSession(studentId, training.groupId);
        await DB.removeVisit(studentId, trainingId);
      }

      await DB.deleteTraining(trainingId);
      UI.showToast({ type: 'success', title: 'Тренировка удалена' });

      if (AppState.currentPage === 'trainings')       await renderTrainings();
      else if (AppState.currentPage === 'home')        await renderHome();
      else if (AppState.currentPage === 'individual')  await renderIndividual();
    });
  });
}

/* ────────────────────────────────────────────────
   Modal: Add student to existing training
───────────────────────────────────────────────── */

async function openAddToTrainingModal(trainingId, allStudents) {
  const training = await DB.getTrainingById(trainingId);
  if (!training) return;

  const groupStudents = allStudents.filter(s =>
    s.groups.includes(training.groupId) && !training.attendees.includes(s.id)
  );

  UI.openModal({
    title: `Добавить на тренировку — ${training.groupId}`,
    body: UI.renderAddToTrainingModal(training.groupId, groupStudents),
    footer: `
      <button class="btn btn--secondary" id="cancelAddToTraining">Отмена</button>
      <button class="btn btn--primary"   id="saveAddToTraining">Добавить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      // Tab switching
      const tabExisting = modal.querySelector('#tabExisting');
      const tabNew      = modal.querySelector('#tabNew');
      const secExisting = modal.querySelector('#sectionExisting');
      const secNew      = modal.querySelector('#sectionNew');

      tabExisting.addEventListener('click', () => {
        secExisting.style.display = '';
        secNew.style.display = 'none';
        tabExisting.className = 'btn btn--primary btn--sm';
        tabNew.className      = 'btn btn--secondary btn--sm';
        tabExisting.style.flex = tabNew.style.flex = '1';
      });

      tabNew.addEventListener('click', () => {
        secExisting.style.display = 'none';
        secNew.style.display = '';
        tabNew.className      = 'btn btn--primary btn--sm';
        tabExisting.className = 'btn btn--secondary btn--sm';
        tabExisting.style.flex = tabNew.style.flex = '1';
      });

      modal.querySelector('#cancelAddToTraining')?.addEventListener('click', UI.closeModal);

      modal.querySelector('#saveAddToTraining')?.addEventListener('click', async () => {
        const isExistingTab = secExisting.style.display !== 'none';

        if (isExistingTab) {
          // ── Добавить из группы ──
          const selected = [...modal.querySelectorAll('input[name="addAttendees"]:checked')]
            .map(c => c.value);

          if (!selected.length) {
            UI.showToast({ type: 'warn', title: 'Выберите хотя бы одного ученика' });
            return;
          }

          const fresh = await DB.getTrainingById(trainingId);
          const updatedAttendees = [...new Set([...fresh.attendees, ...selected])];
          await DB.updateTraining(trainingId, { attendees: updatedAttendees });

          const results = await Logic.markAttendance(fresh, selected);

          UI.closeModal();
          UI.showToast({ type: 'success', title: 'Добавлено', msg: `${selected.length} чел. на тренировку` });

          for (const r of results) {
            if (r.status === 'expired') {
              UI.showToast({ type: 'error', title: r.name, msg: 'Абонемент закончился — нужно продлить' });
            } else if (r.status === 'ending') {
              UI.showToast({ type: 'warn', title: r.name, msg: `Осталось ${r.sub?.remaining} занятий` });
            } else if (r.status === 'none') {
              UI.showToast({ type: 'warn', title: r.name, msg: 'Нет активного абонемента' });
            }
          }

        } else {
          // ── Новый ученик ──
          const name = modal.querySelector('#newStudentName').value.trim();
          if (!name) {
            UI.showToast({ type: 'error', title: 'Введите имя ученика' });
            return;
          }

          const subType = modal.querySelector('#newStudentSub').value;

          const student = await DB.createStudent({ name, groups: [training.groupId] });

          if (subType) {
            await DB.addSubscription(student.id, {
              groupId: training.groupId,
              type: subType,
              createdAt: training.date,
            });
          }

          const fresh = await DB.getTrainingById(trainingId);
          await DB.updateTraining(trainingId, { attendees: [...fresh.attendees, student.id] });

          if (subType) {
            const results = await Logic.markAttendance(fresh, [student.id]);
            for (const r of results) {
              if (r.status === 'ending') {
                UI.showToast({ type: 'warn', title: r.name, msg: `Осталось ${r.sub?.remaining} занятий` });
              }
            }
          } else {
            await DB.recordVisit(student.id, {
              date:       training.date,
              groupId:    training.groupId,
              trainingId: training.id,
            });
          }

          UI.closeModal();
          UI.showToast({ type: 'success', title: 'Ученик добавлен', msg: `${name} записан на тренировку` });
        }

        // Обновить текущую страницу
        if (AppState.currentPage === 'trainings') await renderTrainings();
        else if (AppState.currentPage === 'home')  await renderHome();
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Modals: Create / Edit group
───────────────────────────────────────────────── */

function collectGroupFormData(modal) {
  const schedule = [];
  modal.querySelectorAll('.schedule-row').forEach(row => {
    const cb = row.querySelector('.schedule-day-cb');
    if (cb?.checked) {
      const hh = String(parseInt(row.querySelector('.time-h')?.value || '0', 10) || 0).padStart(2, '0');
      const mm = String(parseInt(row.querySelector('.time-m')?.value || '0', 10) || 0).padStart(2, '0');
      schedule.push({ day: cb.value, time: `${hh}:${mm}` });
    }
  });
  const duration = parseInt(modal.querySelector('#groupDuration')?.value ?? '60', 10);
  return { schedule, duration };
}

function setupScheduleToggles(modal) {
  // Auto-advance and validate time inputs
  modal.querySelectorAll('.time-input').forEach(wrap => {
    const hInput = wrap.querySelector('.time-h');
    const mInput = wrap.querySelector('.time-m');

    hInput.addEventListener('input', () => {
      hInput.value = hInput.value.replace(/\D/g, '').slice(0, 2);
      if (hInput.value.length === 2) { mInput.focus(); mInput.select(); }
    });
    hInput.addEventListener('blur', () => {
      if (!hInput.value) return;
      hInput.value = String(Math.min(23, parseInt(hInput.value, 10))).padStart(2, '0');
    });

    mInput.addEventListener('input', () => {
      mInput.value = mInput.value.replace(/\D/g, '').slice(0, 2);
    });
    mInput.addEventListener('blur', () => {
      if (!mInput.value) return;
      mInput.value = String(Math.min(59, parseInt(mInput.value, 10))).padStart(2, '0');
    });
    mInput.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !mInput.value) { hInput.focus(); hInput.select(); }
    });
  });

  // Day checkbox toggle
  modal.querySelectorAll('.schedule-day-cb').forEach(cb => {
    const row      = cb.closest('.schedule-row');
    const timeWrap = row.querySelector('.time-input');
    const hInput   = timeWrap.querySelector('.time-h');
    const mInput   = timeWrap.querySelector('.time-m');

    cb.addEventListener('change', () => {
      const on = cb.checked;
      row.classList.toggle('active', on);
      timeWrap.classList.toggle('disabled', !on);
      hInput.disabled = !on;
      mInput.disabled = !on;
      if (on) { hInput.focus(); hInput.select(); }
    });
  });
}

function openCreateGroupModal() {
  UI.openModal({
    title: 'Создать группу',
    body: UI.renderGroupModal(null),
    footer: `
      <button class="btn btn--secondary" id="cancelGroup">Отмена</button>
      <button class="btn btn--primary"   id="saveGroup">Создать</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });
      setupScheduleToggles(modal);
      modal.querySelector('#cancelGroup')?.addEventListener('click', UI.closeModal);
      modal.querySelector('#saveGroup')?.addEventListener('click', async () => {
        const name = modal.querySelector('#groupName')?.value.trim();
        if (!name) {
          UI.showToast({ type: 'error', title: 'Введите название группы' });
          return;
        }
        try {
          const { schedule, duration } = collectGroupFormData(modal);
          const isIndividual = modal.querySelector('#groupIsIndividual')?.checked ?? false;
          await DB.createGroup({ name, schedule, duration, isIndividual });
          UI.closeModal();
          UI.showToast({ type: 'success', title: 'Группа создана', msg: name });
          await renderGroups();
        } catch (e) {
          UI.showToast({ type: 'error', title: e.message });
        }
      });
    }
  });
}

async function openEditGroupModal(groupId) {
  const group = await DB.getGroupById(groupId);
  if (!group) return;

  UI.openModal({
    title: 'Редактировать группу',
    body: UI.renderGroupModal(group),
    footer: `
      <button class="btn btn--danger btn--sm" id="deleteGroupBtn" style="margin-right:auto">
        <i data-lucide="trash-2"></i> Удалить
      </button>
      <button class="btn btn--secondary" id="cancelGroup">Отмена</button>
      <button class="btn btn--primary"   id="saveGroup">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });
      setupScheduleToggles(modal);
      modal.querySelector('#cancelGroup')?.addEventListener('click', UI.closeModal);
      modal.querySelector('#saveGroup')?.addEventListener('click', async () => {
        const { schedule, duration } = collectGroupFormData(modal);
        await DB.updateGroup(groupId, { schedule, duration });
        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Группа обновлена', msg: group.name });
        await navigate(AppState.currentPage);
      });
      modal.querySelector('#deleteGroupBtn')?.addEventListener('click', async () => {
        if (!confirm(`Удалить группу «${group.name}»?\nУченики останутся в системе.`)) return;
        await DB.deleteGroup(groupId);
        const allStudents = await DB.getStudents();
        for (const s of allStudents) {
          if (s.groups.includes(groupId)) {
            await DB.updateStudent(s.id, { groups: s.groups.filter(g => g !== groupId) });
          }
        }
        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Группа удалена', msg: group.name });
        AppState.groupView = null;
        await renderGroups();
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Modal: Add student
───────────────────────────────────────────────── */

async function openAddStudentModal() {
  const allGroups = await DB.getGroups();

  UI.openModal({
    title: 'Новый ученик',
    body: UI.renderStudentModal(allGroups, null),
    footer: `
      <button class="btn btn--secondary" id="cancelAddStudent">Отмена</button>
      <button class="btn btn--primary"   id="saveAddStudent">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      modal.querySelector('#cancelAddStudent')?.addEventListener('click', UI.closeModal);

      // Live-update subscription fields when group selection changes
      modal.querySelectorAll('input[name="groups"]').forEach(cb => {
        cb.addEventListener('change', () => {
          const selected = [...modal.querySelectorAll('input[name="groups"]:checked')]
            .map(c => c.value);
          modal.querySelector('#subFields').innerHTML = UI.renderSubFields(selected, allGroups);
        });
      });

      modal.querySelector('#saveAddStudent')?.addEventListener('click', async () => {
        const name = modal.querySelector('#studentName').value.trim();
        if (!name) {
          UI.showToast({ type: 'error', title: 'Введите имя ученика' });
          return;
        }

        const groups = [...modal.querySelectorAll('input[name="groups"]:checked')].map(c => c.value);

        const student = await DB.createStudent({ name, groups });

        // Add subscriptions for each selected group
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

async function openEditStudentModal(studentId) {
  const [student, allGroups] = await Promise.all([
    DB.getStudentById(studentId),
    DB.getGroups(),
  ]);
  if (!student) return;

  UI.openModal({
    title: 'Редактировать ученика',
    body: UI.renderStudentModal(allGroups, student),
    footer: `
      <button class="btn btn--secondary" id="cancelEditStudent">Отмена</button>
      <button class="btn btn--primary"   id="saveEditStudent">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      modal.querySelector('#cancelEditStudent')?.addEventListener('click', UI.closeModal);

      modal.querySelector('#saveEditStudent')?.addEventListener('click', async () => {
        const name = modal.querySelector('#studentName').value.trim();
        if (!name) {
          UI.showToast({ type: 'error', title: 'Введите имя ученика' });
          return;
        }

        const groups = [...modal.querySelectorAll('input[name="groups"]:checked')].map(c => c.value);

        await DB.updateStudent(studentId, { name, groups });

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Изменения сохранены', msg: name });
        await navigate(AppState.currentPage);
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
   Modal: Extend subscription by time
───────────────────────────────────────────────── */

async function openExtendSubModal(studentId, groupId) {
  const student = await DB.getStudentById(studentId);
  if (!student) return;

  const sub = student.subscriptions.find(s => s.groupId === groupId && s.isActive)
           ?? student.subscriptions.filter(s => s.groupId === groupId).at(-1)
           ?? null;

  UI.openModal({
    title: 'Продлить срок абонемента',
    body: UI.renderExtendSubModal(student.name, groupId, sub),
    footer: `
      <button class="btn btn--secondary" id="cancelExtend">Отмена</button>
      <button class="btn btn--primary"   id="saveExtend">Продлить</button>
    `,
    onOpen: modal => {
      modal.querySelector('#cancelExtend')?.addEventListener('click', UI.closeModal);
      modal.querySelector('#saveExtend')?.addEventListener('click', async () => {
        const days = parseInt(modal.querySelector('#extendDays').value, 10);
        await DB.extendSubscription(studentId, groupId, days);
        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Срок продлён', msg: `${student.name} · +${days} дн.` });
        await navigate(AppState.currentPage);
      });
    }
  });
}

/* ────────────────────────────────────────────────
   Drawer: Student detail
───────────────────────────────────────────────── */

async function openStudentDrawer(studentId) {
  const [student, allGroups] = await Promise.all([
    DB.getStudentById(studentId),
    DB.getGroups(),
  ]);
  if (!student) return;

  UI.openDrawer({
    title: student.name,
    headerActions: `
      <button class="btn btn--ghost btn--sm" id="editStudentBtn" title="Редактировать">
        <i data-lucide="pencil"></i>
      </button>
    `,
    body: UI.renderStudentDetail(student, allGroups),
    onOpen: drawer => {
      lucide.createIcons({ nodes: [drawer] });

      // Edit student
      drawer.querySelector('#editStudentBtn')?.addEventListener('click', () => {
        UI.closeDrawer();
        openEditStudentModal(studentId);
      });

      // Renew (new subscription)
      drawer.querySelectorAll('[data-action="renew-sub"]').forEach(btn => {
        btn.addEventListener('click', () => {
          UI.closeDrawer();
          openRenewSubModal(btn.dataset.studentId, btn.dataset.group);
        });
      });

      // Extend time
      drawer.querySelectorAll('[data-action="extend-sub-time"]').forEach(btn => {
        btn.addEventListener('click', () => {
          UI.closeDrawer();
          openExtendSubModal(btn.dataset.studentId, btn.dataset.group);
        });
      });

      // Deduct session manually
      drawer.querySelectorAll('[data-action="deduct-session"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const { sub, status } = await DB.deductSession(btn.dataset.studentId, btn.dataset.group);
          if (!sub) return;

          await DB.recordVisit(btn.dataset.studentId, {
            date:       new Date().toISOString().slice(0, 10),
            groupId:    btn.dataset.group,
            trainingId: null,
          });

          const msg = status === 'expired'
            ? 'Занятие списано — абонемент закончился'
            : `Осталось: ${sub.remaining} из ${sub.total}`;
          const type = status === 'expired' ? 'warn' : 'success';

          UI.showToast({ type, title: 'Занятие списано', msg });
          UI.closeDrawer();
          await openStudentDrawer(studentId);
        });
      });

      // Delete subscription
      drawer.querySelectorAll('[data-action="delete-sub"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Удалить этот абонемент?')) return;
          await DB.deleteSubscription(btn.dataset.studentId, btn.dataset.subId);
          UI.closeDrawer();
          UI.showToast({ type: 'success', title: 'Абонемент удалён' });
          await openStudentDrawer(studentId);
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

      // Delete visit from history
      drawer.querySelectorAll('[data-action="delete-visit"]').forEach(btn => {
        btn.addEventListener('click', async e => {
          e.stopPropagation();
          await DB.removeVisitAt(studentId, Number(btn.dataset.visitIndex));
          await openStudentDrawer(studentId);
        });
      });

      // FAB — add training
      const drawerBody = drawer.querySelector('.drawer__body');
      const fabEl = document.createElement('div');
      fabEl.className = 'drawer-fab';
      fabEl.innerHTML = `<button class="drawer-fab__btn" title="Добавить тренировку"><i data-lucide="plus"></i></button>`;
      drawerBody.appendChild(fabEl);
      lucide.createIcons({ nodes: [fabEl] });
      fabEl.querySelector('.drawer-fab__btn').addEventListener('click', async () => {
        const allStudents = await DB.getStudents();
        UI.closeDrawer();
        openAddTrainingModal(allStudents);
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
  const saved = localStorage.getItem('tc_theme') ?? 'dark';
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
  localStorage.setItem('tc_theme', next);
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

  // Run group migration (writes isIndividual flags) before any sync getters are used
  await DB.getGroups();

  // Theme
  initTheme();

  // Navigation
  initNavigation();

  // Initial page
  await navigate('home');

  console.log('🪙 TrickCoin app ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
