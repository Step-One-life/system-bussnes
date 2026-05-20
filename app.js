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
  groupView:     null,
  financeTab:    'records',
  financePeriod: 'all',
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
    case 'finance':    await renderFinance();    break;
  }

  // Re-create lucide icons
  lucide.createIcons();
}

/* ────────────────────────────────────────────────
   Page: Home
───────────────────────────────────────────────── */

async function renderHome() {
  const el = document.getElementById('page-home');
  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Главная</h1>
      <button class="btn btn--primary" id="homeAddTrainingBtn">
        <i data-lucide="plus"></i> Записать тренировку
      </button>
    </div>` +
    '<div id="kpi-area"></div>' +
    '<div id="today-trainings-area"></div>' +
    '<div id="warnings-area"></div>';

  el.querySelector('#homeAddTrainingBtn')?.addEventListener('click', () => openTrainingTypeModal());
  lucide.createIcons({ nodes: [el.querySelector('.page-header')] });

  // KPIs
  const kpis = await Logic.getKPIs();
  document.getElementById('kpi-area').innerHTML = UI.renderKPIGrid(kpis);
  lucide.createIcons({ nodes: [document.getElementById('kpi-area')] });
  UI.animateCountUp();

  // Today's trainings
  const today     = new Date().toISOString().slice(0, 10);
  const trainings = await DB.getTrainings();
  const students  = await DB.getStudents();
  const todayList = trainings.filter(t => t.date === today);
  const tArea     = document.getElementById('today-trainings-area');

  tArea.innerHTML = `
    <div class="section-title">Тренировки сегодня</div>
    ${todayList.length
      ? `<div style="display:flex; flex-direction:column; gap:var(--sp-3); margin-bottom:var(--sp-6)">
           ${todayList.map(t => UI.renderTrainingItem(t, students)).join('')}
         </div>`
      : `<div class="card" style="text-align:center; color:var(--text-muted); padding:var(--sp-5); margin-bottom:var(--sp-6)">
           Тренировок на сегодня нет
         </div>`
    }
  `;
  lucide.createIcons({ nodes: [tArea] });
  setupTrainingToggles(tArea);

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
    <div style="margin-bottom:var(--sp-6)">
      ${clients.length ? `
        <div class="ind-clients-list">
          ${clients.map(s => {
            const sub     = s.subscriptions.find(sub => sub.groupId === indGroupId && sub.isActive);
            const status  = Logic.getSubStatus(s, indGroupId);
            const lv      = DB.getLastVisitDate(s);
            const initials = s.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return `
              <div class="ind-client-card" data-student-id="${s.id}">
                <div class="ind-client-card__avatar">${initials}</div>
                <div class="ind-client-card__main">
                  <div class="ind-client-card__name">${s.name}</div>
                  ${UI.renderProgressBar(sub)}
                  <div class="ind-client-card__visit">${lv ? 'Занятие: ' + Logic.formatDateShort(lv) : 'Занятий ещё не было'}</div>
                </div>
                <div class="ind-client-card__side">
                  ${UI.renderBadge(status)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
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

  el.querySelectorAll('.ind-client-card').forEach(card => {
    card.addEventListener('click', () => openStudentDrawer(card.dataset.studentId));
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

      // Duration toggle (60 = 1h, 90 = 1.5h)
      let sessionDuration = 60;
      const durToggle   = modal.querySelector('#indDurationToggle');
      const clientSelect = modal.querySelector('#indSessionClient');
      const subInfoEl    = modal.querySelector('#indClientSubInfo');
      const subTypeGroup = modal.querySelector('#indSubTypeGroup');
      const subTypeSelect = modal.querySelector('#indSubType');

      const subOptions = {
        60: [
          ['1',  'Разовое посещение'],
          ['4',  '4 занятия'],
          ['8',  '8 занятий'],
        ],
        90: [
          ['1_90', 'Разовое 1.5ч'],
          ['4_90', '4 занятия 1.5ч'],
          ['8_90', '8 занятий 1.5ч'],
        ],
      };

      const updateSubTypeOptions = () => {
        subTypeSelect.innerHTML = subOptions[sessionDuration]
          .map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      };

      durToggle?.querySelectorAll('.dur-toggle__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          durToggle.querySelectorAll('.dur-toggle__btn').forEach(b => b.classList.remove('dur-toggle__btn--active'));
          btn.classList.add('dur-toggle__btn--active');
          sessionDuration = Number(btn.dataset.dur);
          updateSubTypeOptions();
          refreshClientInfo();
        });
      });
      updateSubTypeOptions();

      const refreshClientInfo = () => {
        const studentId = clientSelect.value;
        if (!studentId) {
          subInfoEl.innerHTML = '';
          subTypeGroup.style.display = 'none';
          return;
        }
        const student   = allStudents.find(s => s.id === studentId);
        const activeSub = student?.subscriptions.find(
          s => s.groupId === indGroupId && s.isActive && (s.sessionDuration ?? 60) === sessionDuration
        );

        if (activeSub) {
          subInfoEl.innerHTML = `
            <div class="card" style="padding:var(--sp-3); margin-top:var(--sp-2)">
              ${UI.renderProgressBar(activeSub)}
            </div>
          `;
          subTypeGroup.style.display = 'none';
        } else {
          subInfoEl.innerHTML = `<p class="text-muted text-sm" style="margin-top:var(--sp-2)">Нет активного абонемента на ${sessionDuration === 90 ? '1.5ч' : '1ч'} — выберите тип занятия</p>`;
          subTypeGroup.style.display = '';
        }
      };

      const conflictHint = modal.querySelector('#trainingConflictHint');
      const _liveCheckInd = async () => {
        const date = modal.querySelector('#indSessionDate').value;
        const time = modal.querySelector('#indSessionTime').value;
        if (!date || !time) { conflictHint.classList.remove('is-visible'); return; }
        const conflicts = await Logic.checkTrainingConflict(date, time, indGroupId);
        if (conflicts.length) {
          const detail = conflicts.map(c => `«${c.groupId}» ${c.start}–${c.end}`).join(', ');
          conflictHint.textContent = `Конфликт: ${detail}`;
          conflictHint.classList.add('is-visible');
        } else {
          conflictHint.classList.remove('is-visible');
        }
      };

      modal.querySelector('#indSessionDate')?.addEventListener('change', _liveCheckInd);
      modal.querySelector('#indSessionTime')?.addEventListener('change', _liveCheckInd);

      const primeHintInd = modal.querySelector('#primeHint');
      const _updatePrimeHintInd = () => {
        const date = modal.querySelector('#indSessionDate').value;
        const time = modal.querySelector('#indSessionTime').value;
        if (!primeHintInd) return;
        primeHintInd.innerHTML = time ? (Logic.isPrimeTime(date, time)
          ? '<span class="badge badge--prime">⭐ Prime</span>'
          : '<span class="badge badge--neutral">Обычное</span>') : '';
      };
      modal.querySelector('#indSessionDate')?.addEventListener('change', _updatePrimeHintInd);
      modal.querySelector('#indSessionTime')?.addEventListener('change', _updatePrimeHintInd);
      _updatePrimeHintInd();

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

        const conflicts = await Logic.checkTrainingConflict(date, time, indGroupId);
        if (conflicts.length) {
          const detail = conflicts.map(c => `«${c.groupId}» ${c.start}–${c.end}`).join(', ');
          UI.showToast({ type: 'error', title: 'Конфликт расписания', msg: detail });
          return;
        }

        // Ensure student is linked to individual group
        const student = await DB.getStudentById(studentId);
        if (!student.groups.includes(indGroupId)) {
          await DB.updateStudent(studentId, { groups: [...student.groups, indGroupId] });
        }

        // If no active sub for this duration, create one from selected type
        const activeSub = student.subscriptions.find(
          s => s.groupId === indGroupId && s.isActive && (s.sessionDuration ?? 60) === sessionDuration
        );
        if (!activeSub) {
          const subType = subTypeSelect?.value || (sessionDuration === 90 ? '1_90' : '1');
          const newSub  = await DB.addSubscription(studentId, {
            groupId: indGroupId,
            type:    subType,
            createdAt: date,
            sessionDuration,
          });
          await _autoCreatePayment(studentId, newSub, {
            time,
            isPrime: Logic.isPrimeTime(date, time),
          });
        }

        // Create training and mark attendance
        const training = await DB.createTraining({
          date, time,
          groupId: indGroupId,
          attendees: [studentId],
          note,
          isPrime: Logic.isPrimeTime(date, time),
          sessionDuration,
        });
        const results = await Logic.markAttendance(training, [studentId]);

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Занятие записано', msg: student.name });

        for (const r of results) {
          if (r.status === 'expired') {
            UI.showToast({ type: 'error', title: r.name, msg: 'Абонемент закончился — нужно продлить' });
          } else if (r.status === 'ending') {
            UI.showToast({ type: 'warn', title: r.name, msg: `Осталось ${r.sub?.remaining} занятий` });
          }
        }

        await navigate(AppState.currentPage);
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
  const indGroupOptions = DB.INDIVIDUAL_GROUP_NAMES.map(g =>
    `<option value="${g}" ${filter.group === g ? 'selected' : ''}>👤 Индивидуальные</option>`
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
        ${indGroupOptions ? `<option disabled>──────────</option>${indGroupOptions}` : ''}
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
      <div style="min-width:0; flex:1">
        <button class="btn btn--ghost btn--sm" id="backToGroups" style="margin-bottom:var(--sp-2)">
          <i data-lucide="arrow-left"></i> Все группы
        </button>
        <h1 class="page-title" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${groupId}</h1>
        <div class="page-subtitle">${stats.total} учеников${schedule ? ' · ' + schedule : ''}</div>
      </div>
      <button class="btn btn--secondary btn--sm" id="editGroupBtn" style="flex-shrink:0">
        <i data-lucide="pencil"></i> Редактировать
      </button>
    </div>

    <div class="kpi-grid" style="margin-bottom:var(--sp-6)">
      <div class="kpi-card kpi-card--accent">
        <div class="kpi-card__icon"><i data-lucide="users"></i></div>
        <div class="kpi-card__label">Всего</div>
        <div class="kpi-card__value">${stats.total}</div>
      </div>
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
        <div class="kpi-card__label">Продлить</div>
        <div class="kpi-card__value">${stats.expired}</div>
      </div>
    </div>

    <div>
      ${students.length ? `
        <div class="ind-clients-list">
          ${students.map(s => {
            const st      = Logic.getSubStatus(s, groupId);
            const sub     = s.subscriptions.find(sub => sub.groupId === groupId && sub.isActive);
            const lv      = DB.getLastVisitDate(s);
            const initials = s.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return `
              <div class="ind-client-card" data-student-id="${s.id}">
                <div class="ind-client-card__avatar">${initials}</div>
                <div class="ind-client-card__main">
                  <div class="ind-client-card__name">${s.name}</div>
                  ${UI.renderProgressBar(sub)}
                  <div class="ind-client-card__visit">${lv ? 'Посещение: ' + Logic.formatDateShort(lv) : 'Посещений ещё не было'}</div>
                </div>
                <div class="ind-client-card__side">
                  ${UI.renderBadge(st)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : UI.renderEmptyState({ icon: 'users', title: 'В группе нет учеников' })}
    </div>
  `;

  lucide.createIcons({ nodes: [el] });

  el.querySelector('#backToGroups')?.addEventListener('click', () => {
    AppState.groupView = null;
    renderGroups();
  });

  el.querySelector('#editGroupBtn')?.addEventListener('click', () => openEditGroupModal(groupId));

  el.querySelectorAll('.ind-client-card').forEach(card => {
    card.addEventListener('click', () => openStudentDrawer(card.dataset.studentId));
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

  el.querySelector('#addTrainingBtn')?.addEventListener('click', () => openTrainingTypeModal());
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

        const startDate  = modal.querySelector('#subStartDate')?.value;
        const subSelects = modal.querySelectorAll('[data-group-sub]');
        for (const sel of subSelects) {
          if (sel.value) {
            const sub = await DB.addSubscription(student.id, {
              groupId:   sel.dataset.groupSub,
              type:      sel.value,
              createdAt: startDate || new Date().toISOString().slice(0, 10),
            });
            await _autoCreatePayment(student.id, sub);
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

/* ────────────────────────────────────────────────
   Modal: Training type picker (step 1)
───────────────────────────────────────────────── */

async function openTrainingTypeModal() {
  UI.openModal({
    title: 'Новая тренировка',
    body: `
      <div class="form-row-2">
        <button class="training-type-card" id="pickGroup">
          <i data-lucide="users"></i>
          <span>Групповая</span>
        </button>
        <button class="training-type-card" id="pickInd">
          <i data-lucide="user"></i>
          <span>Индивидуальная</span>
        </button>
      </div>
    `,
    footer: `<button class="btn btn--secondary" id="cancelTypePick">Отмена</button>`,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });
      modal.querySelector('#cancelTypePick').addEventListener('click', UI.closeModal);

      modal.querySelector('#pickGroup').addEventListener('click', async () => {
        UI.closeModal();
        const students = await DB.getStudents();
        openAddTrainingModal(students);
      });

      modal.querySelector('#pickInd').addEventListener('click', async () => {
        UI.closeModal();
        const indGroup = await ensureIndividualGroup();
        openCreateIndividualSessionModal(indGroup.name);
      });
    },
  });
}

/* ────────────────────────────────────────────────
   Modal: Add group training (step 2a)
───────────────────────────────────────────────── */

function openAddTrainingModal(students) {
  UI.openModal({
    title: 'Групповая тренировка',
    body: UI.renderAddTrainingModal(students),
    footer: `
      <button class="btn btn--secondary" id="cancelAddTraining">Отмена</button>
      <button class="btn btn--primary"   id="saveAddTraining">Сохранить и списать</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      modal.querySelector('#cancelAddTraining')?.addEventListener('click', UI.closeModal);

      const conflictHint = modal.querySelector('#trainingConflictHint');
      const _liveCheck = async () => {
        const date    = modal.querySelector('#trainingDate').value;
        const time    = modal.querySelector('#trainingTime').value;
        const groupId = modal.querySelector('#trainingGroup').value;
        if (!date || !time || !groupId) { conflictHint.classList.remove('is-visible'); return; }
        const conflicts = await Logic.checkTrainingConflict(date, time, groupId);
        if (conflicts.length) {
          const detail = conflicts.map(c => `«${c.groupId}» ${c.start}–${c.end}`).join(', ');
          conflictHint.textContent = `Конфликт: ${detail}`;
          conflictHint.classList.add('is-visible');
        } else {
          conflictHint.classList.remove('is-visible');
        }
      };

      modal.querySelector('#trainingGroup')?.addEventListener('change', e => {
        const groupId = e.target.value;
        const filtered = students.filter(s => s.groups.includes(groupId));
        modal.querySelector('#attendeeList').innerHTML =
          UI.renderAttendeeCheckboxes(filtered);
        _liveCheck();
      });
      modal.querySelector('#trainingDate')?.addEventListener('change', _liveCheck);
      modal.querySelector('#trainingTime')?.addEventListener('change', _liveCheck);

      const primeHint = modal.querySelector('#primeHint');
      const _updatePrimeHint = () => {
        const date = modal.querySelector('#trainingDate').value;
        const time = modal.querySelector('#trainingTime').value;
        if (!primeHint) return;
        primeHint.innerHTML = time ? (Logic.isPrimeTime(date, time)
          ? '<span class="badge badge--prime">⭐ Prime</span>'
          : '<span class="badge badge--neutral">Обычное</span>') : '';
      };
      modal.querySelector('#trainingDate')?.addEventListener('change', _updatePrimeHint);
      modal.querySelector('#trainingTime')?.addEventListener('change', _updatePrimeHint);
      _updatePrimeHint();

      modal.querySelector('#saveAddTraining')?.addEventListener('click', async () => {
        const groupId = modal.querySelector('#trainingGroup').value;
        const date    = modal.querySelector('#trainingDate').value;
        const time    = modal.querySelector('#trainingTime').value;
        const note    = modal.querySelector('#trainingNote').value.trim();

        if (!groupId || !date) {
          UI.showToast({ type: 'error', title: 'Заполните группу и дату' });
          return;
        }

        const conflicts = await Logic.checkTrainingConflict(date, time, groupId);
        if (conflicts.length) {
          const detail = conflicts.map(c => `«${c.groupId}» ${c.start}–${c.end}`).join(', ');
          UI.showToast({ type: 'error', title: 'Конфликт расписания', msg: detail });
          return;
        }

        const attendees = [...modal.querySelectorAll('input[name="attendees"]:checked')]
          .map(c => c.value);

        const training = await DB.createTraining({ date, time, groupId, attendees, note, isPrime: Logic.isPrimeTime(date, time) });
        const results  = await Logic.markAttendance(training, attendees);

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Тренировка записана', msg: `${groupId} · ${attendees.length} чел.` });

        for (const r of results) {
          if (r.status === 'expired') {
            UI.showToast({ type: 'error', title: `${r.name}`, msg: 'Абонемент закончился — нужно продлить' });
          } else if (r.status === 'ending') {
            UI.showToast({ type: 'warn', title: `${r.name}`, msg: `Осталось ${r.sub?.remaining} занятий` });
          } else if (r.status === 'none') {
            UI.showToast({ type: 'warn', title: `${r.name}`, msg: 'Нет активного абонемента' });
          }
        }

        await navigate(AppState.currentPage);
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

        const sub = await DB.addSubscription(studentId, { groupId, type, createdAt: date });
        await _autoCreatePayment(studentId, sub);

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Абонемент продлён', msg: `${student.name} · ${groupId}` });

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

      // Mark subscription as paid
      drawer.querySelectorAll('[data-action="mark-paid"]').forEach(btn => {
        btn.addEventListener('click', () => openMarkPaidModal(studentId, btn.dataset.subId, btn.dataset.group));
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
      fabEl.querySelector('.drawer-fab__btn').addEventListener('click', () => {
        UI.closeDrawer();
        openTrainingTypeModal();
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
   Modal: Mark subscription as paid
───────────────────────────────────────────────── */

async function openMarkPaidModal(studentId, subId, groupId) {
  const [student, pricing] = await Promise.all([
    DB.getStudentById(studentId),
    DB.getPricing(),
  ]);
  if (!student) return;

  const sub = student.subscriptions.find(s => s.id === subId);
  if (!sub) return;

  const isInd       = DB.INDIVIDUAL_GROUP_NAMES.includes(groupId);
  const paymentType = _subPaymentType(sub.type, isInd);
  const defaultAmt  = paymentType ? (pricing[`client_${paymentType}_price`] ?? 0) : 0;
  const typeLabel   = paymentType ? (DB.FIN_LABELS[paymentType] ?? paymentType) : '—';
  const today       = new Date().toISOString().slice(0, 10);

  UI.openModal({
    title: 'Отметить оплату',
    body: `
      <div style="margin-bottom:var(--sp-4)">
        <div class="text-sm text-secondary" style="margin-bottom:var(--sp-1)">Клиент</div>
        <div class="font-semibold">${student.name}</div>
      </div>
      <div style="margin-bottom:var(--sp-4)">
        <div class="text-sm text-secondary" style="margin-bottom:var(--sp-1)">Тип</div>
        <div class="font-semibold">${typeLabel}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Сумма оплаты (₽)</label>
        <input class="form-input" type="number" min="0" id="markPaidAmt" value="${defaultAmt}" />
      </div>
      <div class="form-group">
        <label class="form-label">Дата оплаты</label>
        <input class="form-input" type="date" id="markPaidDate" value="${sub.createdAt ?? today}" />
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="cancelMarkPaid">Отмена</button>
      <button class="btn btn--primary"   id="saveMarkPaid">
        <i data-lucide="banknote"></i> Отметить оплачено
      </button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });
      modal.querySelector('#cancelMarkPaid').addEventListener('click', UI.closeModal);
      modal.querySelector('#saveMarkPaid').addEventListener('click', async () => {
        const amt  = parseFloat(modal.querySelector('#markPaidAmt').value) || 0;
        const date = modal.querySelector('#markPaidDate').value;
        const payment = await DB.createPayment({
          student_id:          studentId,
          client_payment_type: paymentType ?? 'single_individual',
          client_amount:       amt,
          paid_at:             date,
        });
        await DB.linkPaymentToSub(studentId, subId, payment.id);
        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Оплата отмечена', msg: student.name });
        await openStudentDrawer(studentId);
      });
    },
  });
}

/* ────────────────────────────────────────────────
   Page: Finance
───────────────────────────────────────────────── */

let _finCharts = {};

/* ── Finance helpers ── */

function _subPaymentType(subType, isIndividual) {
  if (subType === '1')    return isIndividual ? 'single_individual'    : 'single_group';
  if (subType === '4')    return isIndividual ? 'individual_sub_4'     : 'group_sub_4';
  if (subType === '8')    return isIndividual ? 'individual_sub_8'     : 'group_sub_8';
  if (subType === '1_90') return 'single_individual_90';
  if (subType === '4_90') return 'individual_sub_4_90';
  if (subType === '8_90') return 'individual_sub_8_90';
  return null;
}

/**
 * Auto-create a client payment + hall cost for a new subscription.
 * @param {string} studentId
 * @param {Subscription} sub
 * @param {{ time?: string, isPrime?: boolean }} opts  — training time/slot for prime detection
 */
async function _autoCreatePayment(studentId, sub, opts = {}) {
  const isInd       = DB.INDIVIDUAL_GROUP_NAMES.includes(sub.groupId);
  const paymentType = _subPaymentType(sub.type, isInd);
  if (!paymentType) return;

  const pricing      = await DB.getPricing();
  const clientAmount = pricing[`client_${paymentType}_price`] ?? 0;
  const paidAt       = sub.createdAt || new Date().toISOString().slice(0, 10);

  // For 1.5h types, hall uses the same base pricing as 1h individual
  const hallTypeAlias = {
    single_individual_90: 'single_individual',
    individual_sub_4_90:  'individual_sub_4',
    individual_sub_8_90:  'individual_sub_8',
  };
  const hallType   = hallTypeAlias[paymentType] ?? paymentType;
  const isPrime    = opts.isPrime ?? (opts.time ? Logic.isPrimeTime(paidAt, opts.time) : false);
  const timeSlot   = isPrime ? 'prime' : 'regular';
  const hallAmount = pricing[`hall_${hallType}_${timeSlot}_price`] ?? 0;

  // Create hall cost
  const hallCost = await DB.createHallCost({
    student_id:        studentId,
    hall_payment_type: hallType,
    time_slot:         timeSlot,
    training_time:     opts.time || '',
    hall_amount:       hallAmount,
    paid_at:           paidAt,
  });

  // Create client payment linked to hall cost
  const payment = await DB.createPayment({
    student_id:          studentId,
    client_payment_type: paymentType,
    client_amount:       clientAmount,
    hall_cost_id:        hallCost.id,
    paid_at:             paidAt,
  });

  await DB.linkPaymentToSub(studentId, sub.id, payment.id);
}

async function renderFinance() {
  const el  = document.getElementById('page-finance');
  const tab = AppState.financeTab;

  el.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Финансы</h1>
    </div>
    <div class="fin-tabs">
      <button class="fin-tab ${tab === 'records'  ? 'fin-tab--active' : ''}" data-tab="records">Записи</button>
      <button class="fin-tab ${tab === 'stats'    ? 'fin-tab--active' : ''}" data-tab="stats">Статистика</button>
      <button class="fin-tab ${tab === 'pricing'  ? 'fin-tab--active' : ''}" data-tab="pricing">Настройка цен</button>
    </div>
    <div id="fin-content"></div>
  `;

  el.querySelectorAll('.fin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.financeTab = btn.dataset.tab;
      renderFinance();
    });
  });

  const content = el.querySelector('#fin-content');
  if (tab === 'pricing')      await renderFinancePricing(content);
  else if (tab === 'records') await renderFinanceRecords(content);
  else if (tab === 'stats')   await renderFinanceStats(content);

  lucide.createIcons({ nodes: [el] });
}

/* ── Tab 1: Настройки цен ── */

async function renderFinancePricing(el) {
  const p = await DB.getPricing();

  const makeRow = (label, key, divisor = 1) => {
    const val = p[key] ?? 0;
    const perSession = divisor > 1
      ? `<span class="price-per" data-divisor="${divisor}">≈ ${Math.round(val / divisor)} ₽/зан.</span>`
      : '';
    return `
      <div class="price-row">
        <span class="price-row__label">${label}</span>
        <div class="price-row__input-wrap">
          <input class="price-input" type="number" min="0" name="${key}" value="${val}" />
          <span class="price-row__currency">₽</span>
          ${perSession}
        </div>
      </div>`;
  };

  const makeHallRow = (label, keyBase, divisor = 1) => {
    const rKey = `${keyBase}_regular_price`;
    const pKey = `${keyBase}_prime_price`;
    const rVal = p[rKey] ?? 0;
    const pVal = p[pKey] ?? 0;
    const rPer = divisor > 1 ? `<span class="price-per" data-divisor="${divisor}">≈ ${Math.round(rVal / divisor)} ₽/зан.</span>` : '';
    const pPer = divisor > 1 ? `<span class="price-per" data-divisor="${divisor}">≈ ${Math.round(pVal / divisor)} ₽/зан.</span>` : '';
    return `
      <div class="price-row price-row--hall">
        <span class="price-row__label">${label}</span>
        <div class="price-row__hall-inputs">
          <div class="price-row__input-wrap">
            <span class="hall-slot-mini">Обычное</span>
            <input class="price-input" type="number" min="0" name="${rKey}" value="${rVal}" />
            <span class="price-row__currency">₽</span>
            ${rPer}
          </div>
          <div class="price-row__input-wrap">
            <span class="hall-slot-mini hall-slot-mini--prime">⭐ Prime</span>
            <input class="price-input price-input--prime" type="number" min="0" name="${pKey}" value="${pVal}" />
            <span class="price-row__currency">₽</span>
            ${pPer}
          </div>
        </div>
      </div>`;
  };

  el.innerHTML = `
    <div class="fin-section">
      <div class="fin-section__header">
        <h3 class="fin-section__title">Что платят клиенты мне</h3>
        <span class="fin-section__badge fin-section__badge--income">Доход</span>
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Разовые занятия</div>
        ${makeRow('Разовая Индив. — 1 час', 'client_single_individual_price')}
        ${makeRow('Разовая групповая',       'client_single_group_price')}
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Индив. абонементы — 1 час</div>
        ${makeRow('Абонемент 4 занятия', 'client_individual_sub_4_price', 4)}
        ${makeRow('Абонемент 8 занятий', 'client_individual_sub_8_price', 8)}
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Индив. абонементы — 1.5 часа</div>
        ${makeRow('Разовое 1.5ч', 'client_single_individual_90_price')}
        ${makeRow('Абонемент 4 × 1.5ч', 'client_individual_sub_4_90_price', 4)}
        ${makeRow('Абонемент 8 × 1.5ч', 'client_individual_sub_8_90_price', 8)}
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Групповые абонементы</div>
        ${makeRow('Групп. абонемент 4 занятия', 'client_group_sub_4_price', 4)}
        ${makeRow('Групп. абонемент 8 занятий', 'client_group_sub_8_price', 8)}
      </div>
    </div>

    <div class="fin-section">
      <div class="fin-section__header">
        <h3 class="fin-section__title">Что я плачу залу</h3>
        <span class="fin-section__badge fin-section__badge--expense">Расход</span>
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Разовый вход</div>
        ${makeHallRow('Разовый вход — Индив.',    'hall_single_individual')}
        ${makeHallRow('Разовый вход — групповой', 'hall_single_group')}
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Абонементы тренера (Индив.)</div>
        ${makeHallRow('Индив. абонемент 4 занятия', 'hall_individual_sub_4', 4)}
        ${makeHallRow('Индив. абонемент 8 занятий', 'hall_individual_sub_8', 8)}
      </div>
      <div class="price-group">
        <div class="price-group__subtitle">Абонементы тренера (групповые)</div>
        ${makeHallRow('Групп. абонемент 4 занятия', 'hall_group_sub_4', 4)}
        ${makeHallRow('Групп. абонемент 8 занятий', 'hall_group_sub_8', 8)}
      </div>
    </div>

    <div style="display:flex; justify-content:flex-end; margin-top:var(--sp-2)">
      <button class="btn btn--primary" id="savePricingBtn">
        <i data-lucide="save"></i> Сохранить цены
      </button>
    </div>
  `;

  el.querySelectorAll('.price-input').forEach(input => {
    input.addEventListener('input', () => {
      const perEl = input.closest('.price-row__input-wrap')?.querySelector('.price-per');
      if (perEl) {
        const d = parseInt(perEl.dataset.divisor, 10);
        perEl.textContent = `≈ ${Math.round((parseFloat(input.value) || 0) / d)} ₽/зан.`;
      }
    });
  });

  el.querySelector('#savePricingBtn').addEventListener('click', async () => {
    const newPricing = {};
    el.querySelectorAll('.price-input').forEach(i => { newPricing[i.name] = parseFloat(i.value) || 0; });
    await DB.savePricing(newPricing);
    UI.showToast({ type: 'success', title: 'Цены сохранены', msg: 'Применятся к следующим записям' });
  });
}

/* ── Tab 2: Записи ── */

async function renderFinanceRecords(el) {
  const [payments, hallCosts, students] = await Promise.all([
    DB.getPayments(), DB.getHallCosts(), DB.getStudents(),
  ]);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const hallMap    = Object.fromEntries(hallCosts.map(c => [c.id, c]));

  const cards = payments.map(p => {
    const student  = p.student_id   ? studentMap[p.student_id]  : null;
    const hallCost = p.hall_cost_id ? hallMap[p.hall_cost_id]   : null;
    const net      = p.client_amount - (hallCost?.hall_amount ?? 0);
    const netColor = net >= 0 ? 'var(--success)' : 'var(--danger)';

    return `
      <div class="fin-record" data-id="${p.id}">
        <div class="fin-record__header">
          <div class="fin-record__meta">
            <span class="fin-record__name">${student?.name ?? '—'}</span>
            <span class="fin-record__date">${Logic.formatDateShort(p.paid_at)}</span>
          </div>
          <div class="fin-record__summary">
            <span class="fin-record__income">+${p.client_amount.toLocaleString('ru')} ₽</span>
            ${hallCost ? `<span class="fin-record__expense">−${hallCost.hall_amount.toLocaleString('ru')} ₽</span>` : ''}
            <span class="fin-record__net" style="color:${netColor}">${net >= 0 ? '+' : ''}${net.toLocaleString('ru')} ₽</span>
          </div>
          <i data-lucide="chevron-down" class="fin-record__chevron"></i>
        </div>
        <div class="fin-record__body">
          <div class="fin-record__row">
            <span class="fin-record__row-label">Клиент платит</span>
            <span><span class="badge badge--neutral">${DB.FIN_LABELS[p.client_payment_type] ?? p.client_payment_type}</span> <span style="color:var(--success)">+${p.client_amount.toLocaleString('ru')} ₽</span></span>
          </div>
          ${hallCost ? `
          <div class="fin-record__row">
            <span class="fin-record__row-label">Расход залу</span>
            <span>
              <span class="badge badge--neutral">${DB.FIN_LABELS[hallCost.hall_payment_type] ?? hallCost.hall_payment_type}</span>
              ${hallCost.time_slot === 'prime' ? '<span class="badge badge--prime">Prime</span>' : ''}
              <span style="color:var(--danger)">−${hallCost.hall_amount.toLocaleString('ru')} ₽</span>
            </span>
          </div>` : ''}
          <div class="fin-record__row">
            <span class="fin-record__row-label">Чистый доход</span>
            <strong style="color:${netColor}">${net >= 0 ? '+' : ''}${net.toLocaleString('ru')} ₽</strong>
          </div>
          <div class="fin-record__row">
            <span class="fin-record__row-label">Занятий</span>
            <span>${p.sessions_remaining}/${p.sessions_total} · ${_finStatusBadge(p.status)}</span>
          </div>
          <div class="fin-record__actions">
            <button class="btn btn--secondary btn--sm" data-action="edit-payment" data-id="${p.id}">
              <i data-lucide="pencil"></i> Изменить
            </button>
            <button class="btn btn--ghost btn--sm fin-record__delete-btn" data-action="delete-payment" data-id="${p.id}">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="display:flex; justify-content:flex-end; margin-bottom:var(--sp-4)">
      <button class="btn btn--primary" id="addPaymentBtn">
        <i data-lucide="plus"></i> Добавить запись
      </button>
    </div>
    ${payments.length
      ? `<div class="fin-records-list">${cards}</div>`
      : UI.renderEmptyState({ icon: 'receipt', title: 'Записей пока нет', text: 'Добавьте первую финансовую запись' })
    }
  `;

  lucide.createIcons({ nodes: [el] });

  el.querySelectorAll('.fin-record__header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.fin-record').classList.toggle('is-open');
    });
  });

  el.querySelector('#addPaymentBtn')?.addEventListener('click', () => openAddPaymentModal(students));

  el.querySelectorAll('[data-action="edit-payment"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditPaymentModal(btn.dataset.id, students, hallCosts);
    });
  });

  el.querySelectorAll('[data-action="delete-payment"]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Удалить эту запись?')) return;
      await DB.deletePayment(btn.dataset.id);
      UI.showToast({ type: 'success', title: 'Запись удалена' });
      await renderFinance();
    });
  });
}

function _finStatusBadge(status) {
  const map = { active: ['badge--active', 'Активен'], used: ['badge--neutral', 'Исполь.'], expired: ['badge--danger', 'Истёк'] };
  const [cls, label] = map[status] ?? ['badge--neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ── Tab 3: Статистика ── */

async function renderFinanceStats(el) {
  Object.values(_finCharts).forEach(c => c?.destroy());
  _finCharts = {};

  const period = AppState.financePeriod;
  const [payments, hallCosts, students] = await Promise.all([
    DB.getPayments(), DB.getHallCosts(), DB.getStudents(),
  ]);

  const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
  const hallMap    = Object.fromEntries(hallCosts.map(c => [c.id, c]));

  const start    = _finPeriodStart(period);
  const filtered = start ? payments.filter(p => p.paid_at >= start) : payments;

  const totalIncome = filtered.reduce((s, p) => s + p.client_amount, 0);
  const totalHall   = filtered.reduce((s, p) => s + (hallMap[p.hall_cost_id]?.hall_amount ?? 0), 0);
  const netIncome   = totalIncome - totalHall;
  const margin      = totalIncome > 0 ? Math.round((netIncome / totalIncome) * 100) : 0;
  const avgCheck    = filtered.length > 0 ? Math.round(totalIncome / filtered.length) : 0;
  const activeCount = filtered.filter(p => p.status === 'active').length;
  const netColor    = netIncome >= 0 ? 'var(--success)' : 'var(--danger)';
  const marginColor = margin >= 50 ? 'var(--success)' : margin >= 20 ? 'var(--warning)' : 'var(--danger)';

  const periodLabels = { month: 'Месяц', quarter: 'Квартал', year: 'Год', all: 'Всё время' };
  const periodBtns   = Object.entries(periodLabels).map(([v, l]) =>
    `<button class="fin-period-btn ${period === v ? 'fin-period-btn--active' : ''}" data-period="${v}">${l}</button>`
  ).join('');

  el.innerHTML = `
    <div class="fin-period-selector">${periodBtns}</div>

    <div class="fin-hero">
      <div class="fin-hero__item">
        <span class="fin-hero__label">Доход</span>
        <span class="fin-hero__value" style="color:var(--success)">${totalIncome.toLocaleString('ru')} ₽</span>
      </div>
      <div class="fin-hero__op">−</div>
      <div class="fin-hero__item">
        <span class="fin-hero__label">Расход зала</span>
        <span class="fin-hero__value" style="color:var(--danger)">${totalHall.toLocaleString('ru')} ₽</span>
      </div>
      <div class="fin-hero__op">=</div>
      <div class="fin-hero__item fin-hero__item--main">
        <span class="fin-hero__label">Чистый доход</span>
        <span class="fin-hero__value fin-hero__value--main" style="color:${netColor}">${netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString('ru')} ₽</span>
      </div>
    </div>

    <div class="fin-pills">
      <div class="fin-pill">
        <span class="fin-pill__icon">📊</span>
        <span class="fin-pill__label">Маржа</span>
        <span class="fin-pill__value" style="color:${marginColor}">${margin}%</span>
      </div>
      <div class="fin-pill">
        <span class="fin-pill__icon">🧾</span>
        <span class="fin-pill__label">Записей</span>
        <span class="fin-pill__value">${filtered.length}</span>
      </div>
      <div class="fin-pill">
        <span class="fin-pill__icon">✅</span>
        <span class="fin-pill__label">Активных</span>
        <span class="fin-pill__value">${activeCount}</span>
      </div>
      <div class="fin-pill">
        <span class="fin-pill__icon">💳</span>
        <span class="fin-pill__label">Средний чек</span>
        <span class="fin-pill__value">${avgCheck.toLocaleString('ru')} ₽</span>
      </div>
    </div>

    <div class="fin-charts-grid">
      <div class="fin-chart-card fin-chart-card--wide">
        <div class="fin-chart-card__title">Динамика по месяцам</div>
        <div class="fin-chart-card__canvas-wrap"><canvas id="chartMonthly"></canvas></div>
      </div>
      <div class="fin-chart-card">
        <div class="fin-chart-card__title">Оплаты клиентов</div>
        <div class="fin-chart-card__canvas-wrap fin-chart-card__canvas-wrap--sm"><canvas id="chartClientTypes"></canvas></div>
      </div>
      <div class="fin-chart-card">
        <div class="fin-chart-card__title">Оплаты зала</div>
        <div class="fin-chart-card__canvas-wrap fin-chart-card__canvas-wrap--sm"><canvas id="chartHallTypes"></canvas></div>
      </div>
      <div class="fin-chart-card fin-chart-card--wide">
        <div class="fin-chart-card__title">Топ клиентов по доходу</div>
        <div class="fin-chart-card__canvas-wrap"><canvas id="chartTopClients"></canvas></div>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-period]').forEach(btn => {
    btn.addEventListener('click', () => {
      AppState.financePeriod = btn.dataset.period;
      renderFinance();
    });
  });

  lucide.createIcons({ nodes: [el] });
  _buildFinCharts(filtered, payments, hallMap, studentMap);
}

function _finPeriodStart(period) {
  const now = new Date();
  if (period === 'month')   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
  if (period === 'year')    return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
  return null;
}

function _buildFinCharts(filtered, allPayments, hallMap, studentMap) {
  const dark      = document.documentElement.dataset.theme === 'dark';
  const gridColor = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = dark ? '#6b7280' : '#6b7280';
  const COLORS    = ['#01696f','#22c55e','#f59e0b','#b47aff','#3b82f6','#06b6d4','#f97316','#84cc16'];

  const baseOpts = (extra = {}) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: textColor, font: { size: 11, family: 'Satoshi, sans-serif' }, boxWidth: 10, padding: 14 } },
      tooltip: { backgroundColor: dark ? '#1a1e24' : '#fff', titleColor: dark ? '#f0f2f5' : '#111', bodyColor: textColor, borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderWidth: 1, padding: 10, cornerRadius: 8 },
    },
    ...extra,
  });

  // Chart 1: Monthly breakdown
  const monthly = {};
  allPayments.forEach(p => {
    const m = p.paid_at.slice(0, 7);
    if (!monthly[m]) monthly[m] = { income: 0, hall: 0 };
    monthly[m].income += p.client_amount;
    monthly[m].hall   += hallMap[p.hall_cost_id]?.hall_amount ?? 0;
  });
  const months = Object.keys(monthly).sort();
  const ctx1   = document.getElementById('chartMonthly');
  if (ctx1 && months.length) {
    _finCharts.monthly = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: months.map(m => {
          const [y, mo] = m.split('-');
          return new Date(+y, +mo - 1, 1).toLocaleString('ru', { month: 'short', year: '2-digit' });
        }),
        datasets: [
          { label: 'Доход',       data: months.map(m => monthly[m].income),                   backgroundColor: 'rgba(34,197,94,0.75)',  borderRadius: 6, borderSkipped: false },
          { label: 'Расход зала', data: months.map(m => monthly[m].hall),                    backgroundColor: 'rgba(239,68,68,0.6)',   borderRadius: 6, borderSkipped: false },
          { label: 'Чистый',      data: months.map(m => monthly[m].income - monthly[m].hall), backgroundColor: 'rgba(1,105,111,0.85)', borderRadius: 6, borderSkipped: false },
        ],
      },
      options: baseOpts({
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
        },
      }),
    });
  }

  // Chart 2: Client payment types
  const clientTypes = {};
  filtered.forEach(p => {
    const l = DB.FIN_LABELS[p.client_payment_type] ?? p.client_payment_type;
    clientTypes[l] = (clientTypes[l] ?? 0) + p.client_amount;
  });
  const ctx2 = document.getElementById('chartClientTypes');
  if (ctx2 && Object.keys(clientTypes).length) {
    _finCharts.clientTypes = new Chart(ctx2, {
      type: 'doughnut',
      data: { labels: Object.keys(clientTypes), datasets: [{ data: Object.values(clientTypes), backgroundColor: COLORS, borderWidth: 0, hoverOffset: 6 }] },
      options: baseOpts({ cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, boxWidth: 10, padding: 10 } } } }),
    });
  }

  // Chart 3: Hall payment types
  const hallTypes = {};
  filtered.forEach(p => {
    const hc = hallMap[p.hall_cost_id];
    if (!hc) return;
    const l = DB.FIN_LABELS[hc.hall_payment_type] ?? hc.hall_payment_type;
    hallTypes[l] = (hallTypes[l] ?? 0) + hc.hall_amount;
  });
  const ctx3 = document.getElementById('chartHallTypes');
  if (ctx3 && Object.keys(hallTypes).length) {
    _finCharts.hallTypes = new Chart(ctx3, {
      type: 'doughnut',
      data: { labels: Object.keys(hallTypes), datasets: [{ data: Object.values(hallTypes), backgroundColor: [...COLORS].slice(2), borderWidth: 0, hoverOffset: 6 }] },
      options: baseOpts({ cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, boxWidth: 10, padding: 10 } } } }),
    });
  }

  // Chart 4: Top clients
  const byClient = {};
  filtered.forEach(p => {
    if (!p.student_id) return;
    const name = studentMap[p.student_id]?.name ?? 'Неизвестен';
    byClient[name] = (byClient[name] ?? 0) + p.client_amount;
  });
  const top10 = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const ctx4  = document.getElementById('chartTopClients');
  if (ctx4 && top10.length) {
    const barColors = top10.map((_, i) => COLORS[i % COLORS.length]);
    _finCharts.topClients = new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: top10.map(([n]) => n),
        datasets: [{ label: 'Доход', data: top10.map(([, v]) => v), backgroundColor: barColors, borderRadius: 6, borderSkipped: false }],
      },
      options: baseOpts({
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor }, border: { display: false } },
          y: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
        },
      }),
    });
  }
}

/* ── Modal: Edit payment record ── */

async function openEditPaymentModal(paymentId, students, allHallCosts) {
  const [payments, pricing] = await Promise.all([DB.getPayments(), DB.getPricing()]);
  const payment  = payments.find(p => p.id === paymentId);
  if (!payment) return;

  const hallCost = payment.hall_cost_id ? allHallCosts.find(c => c.id === payment.hall_cost_id) : null;

  const typeOptions = [
    ['single_individual',    'Разовая Индив.'],
    ['single_group',         'Разовая групповая'],
    ['individual_sub_4',     'Индив. ×4'],
    ['individual_sub_8',     'Индив. ×8'],
    ['single_individual_90', 'Индив. 1.5ч'],
    ['individual_sub_4_90',  'Индив. 1.5ч ×4'],
    ['individual_sub_8_90',  'Индив. 1.5ч ×8'],
    ['group_sub_4',          'Групп. ×4'],
    ['group_sub_8',          'Групп. ×8'],
  ].map(([v, l]) => `<option value="${v}" ${payment.client_payment_type === v ? 'selected' : ''}>${l}</option>`).join('');

  const hallTypeOptions = [
    ['single_individual', 'Разовая Индив.'],
    ['single_group',      'Разовая групповая'],
    ['individual_sub_4',  'Индив. ×4'],
    ['individual_sub_8',  'Индив. ×8'],
    ['group_sub_4',       'Групп. ×4'],
    ['group_sub_8',       'Групп. ×8'],
  ].map(([v, l]) => `<option value="${v}" ${hallCost?.hall_payment_type === v ? 'selected' : ''}>${l}</option>`).join('');

  const initSlot = hallCost?.time_slot ?? 'regular';

  UI.openModal({
    title: 'Редактировать запись',
    body: `
      <div class="form-group">
        <label class="form-label">Клиент</label>
        <select class="form-select" id="epStudent">
          <option value="">— без клиента —</option>
          ${students.map(s => `<option value="${s.id}" ${payment.student_id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
        </select>
      </div>

      <div class="fin-modal-grid">
        <div class="fin-modal-section fin-modal-section--income">
          <div class="fin-modal-section__label">Клиент платит мне</div>
          <div class="form-group">
            <label class="form-label">Тип оплаты</label>
            <select class="form-select" id="epClientType">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Сумма (₽)</label>
            <input class="form-input" type="number" min="0" id="epClientAmt" value="${payment.client_amount}" />
          </div>
        </div>

        <div class="fin-modal-section fin-modal-section--expense">
          <div class="fin-modal-section__label">Я плачу залу</div>
          <div class="form-group">
            <label class="form-label">Тип оплаты зала</label>
            <select class="form-select" id="epHallType">
              <option value="">— не указывать —</option>
              ${hallTypeOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Время</label>
            <div class="timeslot-toggle" id="epTimeSlot">
              <button class="timeslot-btn ${initSlot === 'regular' ? 'timeslot-btn--active' : ''}" data-slot="regular" type="button">Обычное</button>
              <button class="timeslot-btn ${initSlot === 'prime'   ? 'timeslot-btn--active' : ''}" data-slot="prime"   type="button">⭐ Prime</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Сумма (₽)</label>
            <input class="form-input" type="number" min="0" id="epHallAmt" value="${hallCost?.hall_amount ?? 0}" />
          </div>
        </div>
      </div>

      <div class="fin-preview">
        Чистый доход: <strong id="epNet" style="color:var(--success)">0 ₽</strong>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Дата</label>
          <input class="form-input" type="date" id="epDate" value="${payment.paid_at}" />
        </div>
        <div class="form-group">
          <label class="form-label">Время тренировки</label>
          <input class="form-input" type="time" id="epTrainingTime" value="${hallCost?.training_time ?? ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Примечание</label>
          <input class="form-input" type="text" id="epNotes" value="${payment.notes ?? ''}" placeholder="Необязательно" />
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="cancelEp">Отмена</button>
      <button class="btn btn--primary"   id="saveEp">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      const clientTypeEl = modal.querySelector('#epClientType');
      const clientAmtEl  = modal.querySelector('#epClientAmt');
      const hallTypeEl   = modal.querySelector('#epHallType');
      const hallAmtEl    = modal.querySelector('#epHallAmt');
      const netEl        = modal.querySelector('#epNet');
      const slotToggle   = modal.querySelector('#epTimeSlot');
      let   currentSlot  = initSlot;

      const hallPrice  = (type, slot) => pricing[`hall_${type}_${slot}_price`] ?? 0;

      const updateNet = () => {
        const net = (parseFloat(clientAmtEl.value) || 0) - (parseFloat(hallAmtEl.value) || 0);
        netEl.textContent = `${net >= 0 ? '+' : ''}${net.toLocaleString('ru')} ₽`;
        netEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';
      };

      slotToggle.querySelectorAll('.timeslot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentSlot = btn.dataset.slot;
          slotToggle.querySelectorAll('.timeslot-btn').forEach(b => b.classList.toggle('timeslot-btn--active', b === btn));
          if (hallTypeEl.value) { hallAmtEl.value = hallPrice(hallTypeEl.value, currentSlot); updateNet(); }
        });
      });

      hallTypeEl.addEventListener('change', () => {
        hallAmtEl.value = hallTypeEl.value ? hallPrice(hallTypeEl.value, currentSlot) : 0;
        updateNet();
      });
      [clientAmtEl, hallAmtEl].forEach(i => i.addEventListener('input', updateNet));
      updateNet();

      const epDateEl = modal.querySelector('#epDate');
      const epTimeEl = modal.querySelector('#epTrainingTime');
      const autoDetectSlotEp = () => {
        if (!epTimeEl.value) return;
        currentSlot = Logic.isPrimeTime(epDateEl.value, epTimeEl.value) ? 'prime' : 'regular';
        slotToggle.querySelectorAll('.timeslot-btn').forEach(b =>
          b.classList.toggle('timeslot-btn--active', b.dataset.slot === currentSlot)
        );
        if (hallTypeEl.value) { hallAmtEl.value = hallPrice(hallTypeEl.value, currentSlot); updateNet(); }
      };
      epDateEl.addEventListener('change', autoDetectSlotEp);
      epTimeEl.addEventListener('change', autoDetectSlotEp);
      if (epTimeEl.value) autoDetectSlotEp();

      modal.querySelector('#cancelEp').addEventListener('click', UI.closeModal);

      modal.querySelector('#saveEp').addEventListener('click', async () => {
        const clientAmt = parseFloat(clientAmtEl.value) || 0;
        const hallAmt   = parseFloat(hallAmtEl.value)   || 0;
        const date      = modal.querySelector('#epDate').value;
        const notes     = modal.querySelector('#epNotes').value.trim();
        const studentId = modal.querySelector('#epStudent').value || null;
        const hallType  = hallTypeEl.value;

        if (!date) { UI.showToast({ type: 'error', title: 'Укажите дату' }); return; }

        // Update or create hall cost
        let hallCostId = payment.hall_cost_id;
        if (hallType) {
          if (hallCostId) {
            await DB.updateHallCost(hallCostId, { hall_payment_type: hallType, time_slot: currentSlot, training_time: epTimeEl.value, hall_amount: hallAmt, paid_at: date, notes, student_id: studentId });
          } else {
            const hc = await DB.createHallCost({ student_id: studentId, hall_payment_type: hallType, time_slot: currentSlot, training_time: epTimeEl.value, hall_amount: hallAmt, paid_at: date, notes });
            hallCostId = hc.id;
          }
        } else if (hallCostId) {
          await DB.deleteHallCost(hallCostId);
          hallCostId = null;
        }

        await DB.updatePayment(paymentId, {
          student_id:          studentId,
          client_payment_type: clientTypeEl.value,
          client_amount:       clientAmt,
          paid_at:             date,
          notes,
          hall_cost_id:        hallCostId,
        });

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Запись обновлена' });
        AppState.financeTab = 'records';
        await renderFinance();
      });
    },
  });
}

/* ── Modal: Add payment record ── */

async function openAddPaymentModal(students) {
  const pricing = await DB.getPricing();

  const typeOptions = [
    ['single_individual',    'Разовая Индив.'],
    ['single_group',         'Разовая групповая'],
    ['individual_sub_4',     'Индив. ×4'],
    ['individual_sub_8',     'Индив. ×8'],
    ['single_individual_90', 'Индив. 1.5ч'],
    ['individual_sub_4_90',  'Индив. 1.5ч ×4'],
    ['individual_sub_8_90',  'Индив. 1.5ч ×8'],
    ['group_sub_4',          'Групп. ×4'],
    ['group_sub_8',          'Групп. ×8'],
  ].map(([v, l]) => `<option value="${v}">${l}</option>`).join('');

  const today = new Date().toISOString().slice(0, 10);

  UI.openModal({
    title: 'Добавить финансовую запись',
    body: `
      <div class="form-group">
        <label class="form-label">Клиент</label>
        <select class="form-select" id="payStudent">
          <option value="">— без клиента —</option>
          ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>
      </div>

      <div class="fin-modal-grid">
        <div class="fin-modal-section fin-modal-section--income">
          <div class="fin-modal-section__label">Клиент платит мне</div>
          <div class="form-group">
            <label class="form-label">Тип оплаты</label>
            <select class="form-select" id="payClientType">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label class="form-label">Сумма (₽)</label>
            <input class="form-input" type="number" min="0" id="payClientAmt" value="0" />
          </div>
        </div>

        <div class="fin-modal-section fin-modal-section--expense">
          <div class="fin-modal-section__label">Я плачу залу</div>
          <div class="form-group">
            <label class="form-label">Тип оплаты зала</label>
            <select class="form-select" id="payHallType">
              <option value="">— не указывать —</option>
              ${typeOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Время</label>
            <div class="timeslot-toggle" id="payTimeSlot">
              <button class="timeslot-btn timeslot-btn--active" data-slot="regular" type="button">Обычное</button>
              <button class="timeslot-btn" data-slot="prime" type="button">⭐ Prime</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Сумма (₽)</label>
            <input class="form-input" type="number" min="0" id="payHallAmt" value="0" />
          </div>
        </div>
      </div>

      <div class="fin-preview">
        Чистый доход: <strong id="payNet" style="color:var(--success)">0 ₽</strong>
      </div>

      <div class="form-row-3">
        <div class="form-group">
          <label class="form-label">Дата</label>
          <input class="form-input" type="date" id="payDate" value="${today}" />
        </div>
        <div class="form-group">
          <label class="form-label">Время тренировки</label>
          <input class="form-input" type="time" id="payTrainingTime" />
        </div>
        <div class="form-group">
          <label class="form-label">Примечание</label>
          <input class="form-input" type="text" id="payNotes" placeholder="Необязательно" />
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn--secondary" id="cancelPayment">Отмена</button>
      <button class="btn btn--primary"   id="savePayment">Сохранить</button>
    `,
    onOpen: modal => {
      lucide.createIcons({ nodes: [modal] });

      const clientTypeEl  = modal.querySelector('#payClientType');
      const clientAmtEl   = modal.querySelector('#payClientAmt');
      const hallTypeEl    = modal.querySelector('#payHallType');
      const hallAmtEl     = modal.querySelector('#payHallAmt');
      const netEl         = modal.querySelector('#payNet');
      const slotToggle    = modal.querySelector('#payTimeSlot');
      let   currentSlot   = 'regular';

      slotToggle.querySelectorAll('.timeslot-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentSlot = btn.dataset.slot;
          slotToggle.querySelectorAll('.timeslot-btn').forEach(b => b.classList.toggle('timeslot-btn--active', b === btn));
          if (hallTypeEl.value) { hallAmtEl.value = hallPrice(hallTypeEl.value, currentSlot); updateNet(); }
        });
      });

      const clientPrice = type => pricing[`client_${type}_price`] ?? 0;
      const hallPrice   = (type, slot) => pricing[`hall_${type}_${slot}_price`] ?? 0;

      const updateNet = () => {
        const net = (parseFloat(clientAmtEl.value) || 0) - (parseFloat(hallAmtEl.value) || 0);
        netEl.textContent = `${net >= 0 ? '+' : ''}${net.toLocaleString('ru')} ₽`;
        netEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';
      };

      clientTypeEl.addEventListener('change', () => { clientAmtEl.value = clientPrice(clientTypeEl.value); updateNet(); });
      hallTypeEl.addEventListener('change',   () => { hallAmtEl.value = hallTypeEl.value ? hallPrice(hallTypeEl.value, currentSlot) : 0; updateNet(); });
      [clientAmtEl, hallAmtEl].forEach(i => i.addEventListener('input', updateNet));

      clientAmtEl.value = clientPrice(clientTypeEl.value);
      updateNet();

      const payDateEl = modal.querySelector('#payDate');
      const payTimeEl = modal.querySelector('#payTrainingTime');
      const autoDetectSlotPay = () => {
        if (!payTimeEl.value) return;
        currentSlot = Logic.isPrimeTime(payDateEl.value, payTimeEl.value) ? 'prime' : 'regular';
        slotToggle.querySelectorAll('.timeslot-btn').forEach(b =>
          b.classList.toggle('timeslot-btn--active', b.dataset.slot === currentSlot)
        );
        if (hallTypeEl.value) { hallAmtEl.value = hallPrice(hallTypeEl.value, currentSlot); updateNet(); }
      };
      payDateEl.addEventListener('change', autoDetectSlotPay);
      payTimeEl.addEventListener('change', autoDetectSlotPay);

      modal.querySelector('#cancelPayment').addEventListener('click', UI.closeModal);

      modal.querySelector('#savePayment').addEventListener('click', async () => {
        const clientAmt = parseFloat(clientAmtEl.value) || 0;
        const hallAmt   = parseFloat(hallAmtEl.value)   || 0;
        const date      = modal.querySelector('#payDate').value;

        if (!date) { UI.showToast({ type: 'error', title: 'Укажите дату' }); return; }

        const net = clientAmt - hallAmt;
        if (net < 0 && clientAmt > 0) {
          if (!confirm(`Расход на зал (${hallAmt} ₽) превышает оплату клиента (${clientAmt} ₽).\nЧистый доход: ${net} ₽. Продолжить?`)) return;
        }

        const studentId = modal.querySelector('#payStudent').value || null;
        const notes     = modal.querySelector('#payNotes').value.trim();
        const hallType  = hallTypeEl.value;

        let hallCostId = null;
        if (hallType) {
          const hc = await DB.createHallCost({ student_id: studentId, hall_payment_type: hallType, time_slot: currentSlot, training_time: payTimeEl.value, hall_amount: hallAmt, paid_at: date, notes });
          hallCostId = hc.id;
        }

        await DB.createPayment({ student_id: studentId, client_payment_type: clientTypeEl.value, client_amount: clientAmt, paid_at: date, notes, hall_cost_id: hallCostId });

        UI.closeModal();
        UI.showToast({ type: 'success', title: 'Запись добавлена' });
        AppState.financeTab = 'records';
        await renderFinance();
      });
    },
  });
}

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

  // Run group migration (writes isIndividual flags) before any sync getters are used
  await DB.getGroups();

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
