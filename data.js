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
};

/** Fixed groups — never mutate */
const GROUPS = ['Трикинг', 'Взрослые', 'Тхэквондо', 'Индивидуальные'];

/** Subscription types */
const SUB_TYPES = { '1': 1, '4': 4, '8': 8 };

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
  const sub = {
    id:        uuid(),
    groupId:   subData.groupId,
    type:      subData.type,
    total,
    remaining: total,
    createdAt: subData.createdAt || new Date().toISOString().slice(0, 10),
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
}

/* ────────────────────────────────────────────────
   Exports (global, since we're not using modules)
───────────────────────────────────────────────── */
window.DB = {
  // constants
  GROUPS,
  SUB_TYPES,

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

  // visits
  recordVisit,
  getLastVisitDate,

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
