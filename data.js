/**
 * data.js — Data layer
 * All functions are async so they can be swapped for API calls in Stage 2.
 * No DOM access. No UI logic. Pure data operations via localStorage.
 */

'use strict';

/* ────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────── */
const STORAGE_KEYS = {
  STUDENTS:  'tk_students',
  TRAININGS: 'tk_trainings',
  GROUPS:    'tk_groups',
};

/** Subscription types */
const SUB_TYPES = { '1': 1, '4': 4, '8': 8 };

/* ────────────────────────────────────────────────
   Groups (dynamic, stored in localStorage)
───────────────────────────────────────────────── */

async function getGroups() {
  const groups = _read(STORAGE_KEYS.GROUPS, []);
  let migrated = false;
  for (const g of groups) {
    // Migrate old schedule format { days[], time } → { schedule: [{ day, time }] }
    if (!g.schedule && Array.isArray(g.days)) {
      g.schedule = g.days.map(day => ({ day, time: g.time || '' }));
      delete g.days;
      delete g.time;
      migrated = true;
    }
    // Migrate: add isIndividual flag
    if (g.isIndividual === undefined) {
      g.isIndividual = g.name === 'Индивидуальные';
      migrated = true;
    }
  }
  if (migrated) _write(STORAGE_KEYS.GROUPS, groups);
  return groups;
}

async function getIndividualGroups() {
  const groups = await getGroups();
  return groups.filter(g => g.isIndividual);
}

async function createGroup(data) {
  const groups = await getGroups();
  if (groups.find(g => g.name === data.name)) {
    throw new Error(`Группа «${data.name}» уже существует`);
  }
  const group = {
    id:           data.name,
    name:         data.name,
    schedule:     data.schedule     || [],
    duration:     data.duration     || 60,
    isIndividual: data.isIndividual || false,
    createdAt:    new Date().toISOString(),
  };
  groups.push(group);
  _write(STORAGE_KEYS.GROUPS, groups);
  return group;
}

async function updateGroup(id, changes) {
  const groups = await getGroups();
  const idx = groups.findIndex(g => g.id === id);
  if (idx === -1) return null;
  groups[idx] = { ...groups[idx], ...changes };
  _write(STORAGE_KEYS.GROUPS, groups);
  return groups[idx];
}

async function getGroupById(id) {
  const groups = await getGroups();
  return groups.find(g => g.id === id) ?? null;
}

async function deleteGroup(id) {
  const groups = await getGroups();
  const filtered = groups.filter(g => g.id !== id);
  if (filtered.length === groups.length) return false;
  _write(STORAGE_KEYS.GROUPS, filtered);
  return true;
}

/* ────────────────────────────────────────────────
   UUID helper
───────────────────────────────────────────────── */
function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ────────────────────────────────────────────────
   Low-level localStorage helpers
───────────────────────────────────────────────── */

/**
 * Read and parse a key from localStorage.
 * @param {string} key
 * @param {*} fallback — returned if key is missing or parse fails
 */
function _read(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Serialize and write to localStorage.
 * @param {string} key
 * @param {*} value
 */
function _write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ────────────────────────────────────────────────
   Students
───────────────────────────────────────────────── */

/**
 * Get all students.
 * @returns {Promise<Student[]>}
 */
async function getStudents() {
  return _read(STORAGE_KEYS.STUDENTS, []);
}

/**
 * Get a single student by id.
 * @param {string} id
 * @returns {Promise<Student|null>}
 */
async function getStudentById(id) {
  const students = await getStudents();
  return students.find(s => s.id === id) ?? null;
}

/**
 * Create and save a new student.
 * @param {{ name: string, groups: string[], subscriptions?: Subscription[] }} data
 * @returns {Promise<Student>}
 */
async function createStudent(data) {
  const students = await getStudents();

  const student = {
    id:            uuid(),
    name:          data.name.trim(),
    groups:        data.groups || [],
    subscriptions: data.subscriptions || [],
    visitHistory:  [],
    createdAt:     new Date().toISOString(),
  };

  students.push(student);
  _write(STORAGE_KEYS.STUDENTS, students);
  return student;
}

/**
 * Update an existing student (shallow merge at top level).
 * @param {string} id
 * @param {Partial<Student>} changes
 * @returns {Promise<Student|null>}
 */
async function updateStudent(id, changes) {
  const students = await getStudents();
  const idx = students.findIndex(s => s.id === id);
  if (idx === -1) return null;

  students[idx] = { ...students[idx], ...changes };
  _write(STORAGE_KEYS.STUDENTS, students);
  return students[idx];
}

/**
 * Delete a student by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteStudent(id) {
  const students = await getStudents();
  const filtered = students.filter(s => s.id !== id);
  if (filtered.length === students.length) return false;
  _write(STORAGE_KEYS.STUDENTS, filtered);
  return true;
}

/* ────────────────────────────────────────────────
   Subscriptions (nested inside Student)
───────────────────────────────────────────────── */

/**
 * Add a new subscription to a student.
 * @param {string} studentId
 * @param {{ groupId: string, type: '1'|'4'|'8', createdAt?: string }} subData
 * @returns {Promise<Subscription|null>}
 */
async function addSubscription(studentId, subData) {
  const student = await getStudentById(studentId);
  if (!student) return null;

  const total = SUB_TYPES[subData.type] ?? 1;
  const createdDate = new Date(subData.createdAt || new Date().toISOString().slice(0, 10));
  const expiresDate = new Date(createdDate);
  expiresDate.setDate(expiresDate.getDate() + 35);

  const sub = {
    id:        uuid(),
    groupId:   subData.groupId,
    type:      subData.type,
    total,
    remaining: total,
    createdAt: subData.createdAt || new Date().toISOString().slice(0, 10),
    expiresAt: expiresDate.toISOString().slice(0, 10),
    isActive:  true,
  };

  const subscriptions = [...student.subscriptions, sub];
  await updateStudent(studentId, { subscriptions });
  return sub;
}

/**
 * Deduct one session from the active subscription for a group.
 * Returns the updated subscription or null if none found.
 * @param {string} studentId
 * @param {string} groupId
 * @returns {Promise<{ sub: Subscription, status: 'ok'|'ending'|'expired'|'none' }>}
 */
async function deductSession(studentId, groupId) {
  const student = await getStudentById(studentId);
  if (!student) return { sub: null, status: 'none' };

  const subs = student.subscriptions;
  const idx  = subs.findIndex(s => s.groupId === groupId && s.isActive);

  if (idx === -1) return { sub: null, status: 'none' };

  subs[idx].remaining -= 1;

  if (subs[idx].remaining <= 0) {
    subs[idx].remaining = 0;
    subs[idx].isActive  = false;
  }

  await updateStudent(studentId, { subscriptions: subs });

  const remaining = subs[idx].remaining;
  let status = 'ok';
  if (!subs[idx].isActive)  status = 'expired';
  else if (remaining <= 2)  status = 'ending';

  return { sub: subs[idx], status };
}

/**
 * Get the active subscription for a student in a given group.
 * @param {string} studentId
 * @param {string} groupId
 * @returns {Promise<Subscription|null>}
 */
async function getActiveSubscription(studentId, groupId) {
  const student = await getStudentById(studentId);
  if (!student) return null;
  return student.subscriptions.find(s => s.groupId === groupId && s.isActive) ?? null;
}

/* ────────────────────────────────────────────────
   Visit history
───────────────────────────────────────────────── */

/**
 * Record a visit for a student.
 * @param {string} studentId
 * @param {{ date: string, groupId: string, trainingId: string }} visit
 * @returns {Promise<void>}
 */
async function recordVisit(studentId, visit) {
  const student = await getStudentById(studentId);
  if (!student) return;

  const visitHistory = [
    ...student.visitHistory,
    { date: visit.date, groupId: visit.groupId, trainingId: visit.trainingId },
  ];
  await updateStudent(studentId, { visitHistory });
}

/**
 * Get the last visit date of a student (across all groups).
 * @param {Student} student
 * @returns {string|null} ISO date string or null
 */
function getLastVisitDate(student) {
  if (!student.visitHistory.length) return null;
  return student.visitHistory
    .map(v => v.date)
    .sort()
    .at(-1);
}

/* ────────────────────────────────────────────────
   Trainings
───────────────────────────────────────────────── */

/**
 * Get all trainings, newest first.
 * @returns {Promise<Training[]>}
 */
async function getTrainings() {
  const trainings = _read(STORAGE_KEYS.TRAININGS, []);
  return [...trainings].sort((a, b) => {
    const da = new Date(a.date + 'T' + (a.time || '00:00'));
    const db = new Date(b.date + 'T' + (b.time || '00:00'));
    return db - da;
  });
}

/**
 * Get a single training by id.
 * @param {string} id
 * @returns {Promise<Training|null>}
 */
async function getTrainingById(id) {
  const trainings = _read(STORAGE_KEYS.TRAININGS, []);
  return trainings.find(t => t.id === id) ?? null;
}

/**
 * Create and save a new training.
 * @param {{ date: string, time: string, groupId: string, attendees: string[], note?: string }} data
 * @returns {Promise<Training>}
 */
async function createTraining(data) {
  const trainings = _read(STORAGE_KEYS.TRAININGS, []);

  const training = {
    id:        uuid(),
    date:      data.date,
    time:      data.time || '',
    groupId:   data.groupId,
    attendees: data.attendees || [],
    note:      data.note || '',
    createdAt: new Date().toISOString(),
  };

  trainings.push(training);
  _write(STORAGE_KEYS.TRAININGS, trainings);
  return training;
}

/**
 * Update an existing training.
 * @param {string} id
 * @param {Partial<Training>} changes
 * @returns {Promise<Training|null>}
 */
async function updateTraining(id, changes) {
  const trainings = _read(STORAGE_KEYS.TRAININGS, []);
  const idx = trainings.findIndex(t => t.id === id);
  if (idx === -1) return null;

  trainings[idx] = { ...trainings[idx], ...changes };
  _write(STORAGE_KEYS.TRAININGS, trainings);
  return trainings[idx];
}

/**
 * Restore one session to the active (or most recently deactivated) subscription for a group.
 * Used when removing a student from a training by mistake.
 * @param {string} studentId
 * @param {string} groupId
 * @returns {Promise<Subscription|null>}
 */
async function restoreSession(studentId, groupId) {
  const student = await getStudentById(studentId);
  if (!student) return null;

  const subs = student.subscriptions;

  // Prefer active sub; fall back to most recent for this group
  let idx = subs.findIndex(s => s.groupId === groupId && s.isActive);
  if (idx === -1) {
    idx = subs.reduce((best, s, i) => {
      if (s.groupId !== groupId) return best;
      if (best === -1) return i;
      return new Date(subs[i].createdAt) > new Date(subs[best].createdAt) ? i : best;
    }, -1);
  }
  if (idx === -1) return null;

  subs[idx].remaining = Math.min(subs[idx].remaining + 1, subs[idx].total);
  if (subs[idx].remaining > 0) subs[idx].isActive = true;

  await updateStudent(studentId, { subscriptions: subs });
  return subs[idx];
}

/**
 * Remove a visit record by trainingId from a student's history.
 * @param {string} studentId
 * @param {string} trainingId
 * @returns {Promise<void>}
 */
async function removeVisit(studentId, trainingId) {
  const student = await getStudentById(studentId);
  if (!student) return;
  const visitHistory = student.visitHistory.filter(v => v.trainingId !== trainingId);
  await updateStudent(studentId, { visitHistory });
}

/**
 * Extend the expiry date of the active (or most recent) subscription for a group.
 * @param {string} studentId
 * @param {string} groupId
 * @param {number} days
 * @returns {Promise<Subscription|null>}
 */
async function extendSubscription(studentId, groupId, days) {
  const student = await getStudentById(studentId);
  if (!student) return null;

  const subs = student.subscriptions;

  // Prefer the active-by-sessions sub; fall back to most recent for this group
  let idx = subs.findIndex(s => s.groupId === groupId && s.isActive);
  if (idx === -1) {
    idx = subs.reduce((best, s, i) => {
      if (s.groupId !== groupId) return best;
      if (best === -1) return i;
      return new Date(subs[i].createdAt) > new Date(subs[best].createdAt) ? i : best;
    }, -1);
  }
  if (idx === -1) return null;

  const sub = subs[idx];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const base = sub.expiresAt ? new Date(sub.expiresAt) : today;
  const from = base > today ? base : today;
  const newExpiry = new Date(from);
  newExpiry.setDate(newExpiry.getDate() + days);
  subs[idx].expiresAt = newExpiry.toISOString().slice(0, 10);

  // Reactivate only if sessions remain (was expired by date, not by sessions)
  if (sub.remaining > 0) subs[idx].isActive = true;

  await updateStudent(studentId, { subscriptions: subs });
  return subs[idx];
}

/**
 * Delete a training by id.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function deleteTraining(id) {
  const trainings = _read(STORAGE_KEYS.TRAININGS, []);
  const filtered = trainings.filter(t => t.id !== id);
  if (filtered.length === trainings.length) return false;
  _write(STORAGE_KEYS.TRAININGS, filtered);
  return true;
}

/* ────────────────────────────────────────────────
   Seed / reset helpers (dev only)
───────────────────────────────────────────────── */

/**
 * Seed demo data if storage is empty.
 * @returns {Promise<void>}
 */
async function seedDemoData() {
  const existing = await getStudents();
  if (existing.length > 0) return; // already seeded

  // Seed default groups
  const existingGroups = await getGroups();
  if (!existingGroups.length) {
    const defaults = [
      { name: 'Трикинг',        duration: 90, schedule: [{ day: 'Пн', time: '19:00' }, { day: 'Ср', time: '19:00' }, { day: 'Пт', time: '19:00' }] },
      { name: 'Взрослые',       duration: 60, schedule: [{ day: 'Вт', time: '20:00' }, { day: 'Чт', time: '20:00' }] },
      { name: 'Тхэквондо',      duration: 60, schedule: [{ day: 'Пн', time: '17:00' }, { day: 'Ср', time: '17:00' }, { day: 'Пт', time: '17:00' }] },
      { name: 'Индивидуальные', duration: 60, schedule: [], isIndividual: true },
    ];
    for (const d of defaults) await createGroup(d);
  }

  const today = new Date();
  const fmt = d => d.toISOString().slice(0, 10);

  // Helper to build a date N days ago
  const daysAgo = n => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return fmt(d);
  };

  // Create students
  const s1 = await createStudent({ name: 'Алексей Иванов',    groups: ['Трикинг', 'Индивидуальные'] });
  const s2 = await createStudent({ name: 'Мария Смирнова',    groups: ['Тхэквондо'] });
  const s3 = await createStudent({ name: 'Дмитрий Козлов',    groups: ['Взрослые'] });
  const s4 = await createStudent({ name: 'Анна Петрова',      groups: ['Трикинг'] });
  const s5 = await createStudent({ name: 'Иван Сидоров',      groups: ['Тхэквондо', 'Взрослые'] });
  const s6 = await createStudent({ name: 'Ольга Новикова',    groups: ['Взрослые'] });
  const s7 = await createStudent({ name: 'Сергей Морозов',    groups: ['Трикинг'] });
  const s8 = await createStudent({ name: 'Екатерина Волкова', groups: ['Индивидуальные'] });

  // Add subscriptions
  await addSubscription(s1.id, { groupId: 'Трикинг',        type: '8', createdAt: daysAgo(20) });
  await addSubscription(s1.id, { groupId: 'Индивидуальные', type: '4', createdAt: daysAgo(10) });
  await addSubscription(s2.id, { groupId: 'Тхэквондо',      type: '8', createdAt: daysAgo(14) });
  await addSubscription(s3.id, { groupId: 'Взрослые',       type: '4', createdAt: daysAgo(12) });
  await addSubscription(s4.id, { groupId: 'Трикинг',        type: '4', createdAt: daysAgo(8) });
  await addSubscription(s5.id, { groupId: 'Тхэквондо',      type: '8', createdAt: daysAgo(18) });
  await addSubscription(s5.id, { groupId: 'Взрослые',       type: '4', createdAt: daysAgo(5) });
  await addSubscription(s6.id, { groupId: 'Взрослые',       type: '1', createdAt: daysAgo(3) });
  await addSubscription(s7.id, { groupId: 'Трикинг',        type: '8', createdAt: daysAgo(25) });
  await addSubscription(s8.id, { groupId: 'Индивидуальные', type: '4', createdAt: daysAgo(7) });

  // Simulate some deductions to make statuses interesting
  // s4 — Трикинг: 4 total, deduct 3 → 1 remaining (danger)
  for (let i = 0; i < 3; i++) await deductSession(s4.id, 'Трикинг');
  // s3 — Взрослые: 4 total, deduct 2 → 2 remaining (warning)
  for (let i = 0; i < 2; i++) await deductSession(s3.id, 'Взрослые');
  // s6 — Взрослые: 1 total, deduct 1 → 0 remaining (expired)
  await deductSession(s6.id, 'Взрослые');
  // s7 — Трикинг: 8 total, deduct 6 → 2 remaining (warning)
  for (let i = 0; i < 6; i++) await deductSession(s7.id, 'Трикинг');
  // s1 — Трикинг: 8 total, deduct 3 → 5 remaining (ok)
  for (let i = 0; i < 3; i++) await deductSession(s1.id, 'Трикинг');

  // Create sample trainings
  const t1 = await createTraining({ date: daysAgo(1), time: '19:00', groupId: 'Трикинг',   attendees: [s1.id, s4.id, s7.id] });
  const t2 = await createTraining({ date: daysAgo(2), time: '18:00', groupId: 'Тхэквондо', attendees: [s2.id, s5.id] });
  const t3 = await createTraining({ date: daysAgo(3), time: '20:00', groupId: 'Взрослые',  attendees: [s3.id, s5.id, s6.id] });
  const t4 = await createTraining({ date: daysAgo(5), time: '17:00', groupId: 'Трикинг',   attendees: [s1.id, s4.id] });
  await createTraining({ date: daysAgo(7),  time: '19:00', groupId: 'Индивидуальные', attendees: [s8.id] });
  await createTraining({ date: daysAgo(10), time: '18:00', groupId: 'Тхэквондо', attendees: [s2.id, s5.id] });

  // Record visits for attendees
  const visits = [
    [s1.id, 'Трикинг',   t1.id, t1.date],
    [s4.id, 'Трикинг',   t1.id, t1.date],
    [s7.id, 'Трикинг',   t1.id, t1.date],
    [s2.id, 'Тхэквондо', t2.id, t2.date],
    [s5.id, 'Тхэквондо', t2.id, t2.date],
    [s3.id, 'Взрослые',  t3.id, t3.date],
    [s5.id, 'Взрослые',  t3.id, t3.date],
    [s6.id, 'Взрослые',  t3.id, t3.date],
    [s1.id, 'Трикинг',   t4.id, t4.date],
    [s4.id, 'Трикинг',   t4.id, t4.date],
  ];

  for (const [sid, gid, tid, date] of visits) {
    await recordVisit(sid, { date, groupId: gid, trainingId: tid });
  }
}

/**
 * Clear all app data from localStorage.
 * @returns {Promise<void>}
 */
async function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.TRAININGS);
  localStorage.removeItem(STORAGE_KEYS.GROUPS);
}

/* ────────────────────────────────────────────────
   Exports (global, since we're not using modules)
───────────────────────────────────────────────── */
window.DB = {
  // GROUPS as a live getter — excludes individual groups (those are managed via Индивидуальные page)
  get GROUPS() { return _read(STORAGE_KEYS.GROUPS, []).filter(g => !g.isIndividual).map(g => g.name); },

  SUB_TYPES,

  // groups
  getGroups,
  getGroupById,
  getIndividualGroups,
  createGroup,
  updateGroup,
  deleteGroup,

  // students
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,

  // subscriptions
  addSubscription,
  deductSession,
  getActiveSubscription,
  extendSubscription,
  restoreSession,

  // visits
  recordVisit,
  getLastVisitDate,
  removeVisit,

  // trainings
  getTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  deleteTraining,

  // dev
  seedDemoData,
  clearAllData,
};
