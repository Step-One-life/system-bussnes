/**
 * logic.js — Business logic layer
 * Knows about data shapes and rules, but has no DOM/UI knowledge.
 * Uses DB (data.js) for all data access.
 */

'use strict';

/* ────────────────────────────────────────────────
   Subscription status
───────────────────────────────────────────────── */

/**
 * Compute the subscription status label for a student in a given group.
 * @param {Student} student
 * @param {string} groupId
 * @returns {{ label: string, type: 'active'|'ending'|'danger'|'expired'|'none' }}
 */
function getSubStatus(student, groupId) {
  const sub = student.subscriptions.find(s => s.groupId === groupId && s.isActive);

  if (!sub) {
    // Check if they ever had one (expired)
    const expired = student.subscriptions.find(s => s.groupId === groupId && !s.isActive);
    if (expired) return { label: 'Нужно продлить', type: 'expired' };
    return { label: 'Нет абонемента', type: 'none' };
  }

  if (sub.remaining === 0) return { label: 'Нужно продлить', type: 'expired' };
  if (sub.remaining <= 2)  return { label: 'Заканчивается',  type: 'ending' };
  return { label: 'Активен', type: 'active' };
}

/**
 * Get the best status across all groups for a student (worst wins for display).
 * Priority: expired > ending > active > none
 * @param {Student} student
 * @returns {{ label: string, type: string }}
 */
function getOverallSubStatus(student) {
  if (!student.groups.length) return { label: 'Нет групп', type: 'none' };

  const statuses = student.groups.map(g => getSubStatus(student, g));
  const priority = { expired: 3, ending: 2, active: 1, none: 0 };
  statuses.sort((a, b) => (priority[b.type] ?? 0) - (priority[a.type] ?? 0));
  return statuses[0];
}

/**
 * Get progress bar fill percentage and colour class for a subscription.
 * @param {Subscription} sub
 * @returns {{ pct: number, cls: 'ok'|'warn'|'danger' }}
 */
function getSubProgress(sub) {
  if (!sub || sub.total === 0) return { pct: 0, cls: 'danger' };
  const pct = Math.round((sub.remaining / sub.total) * 100);
  let cls = 'ok';
  if (sub.remaining <= 1) cls = 'danger';
  else if (sub.remaining <= 2) cls = 'warn';
  return { pct, cls };
}

/* ────────────────────────────────────────────────
   Attendance / marking
───────────────────────────────────────────────── */

/**
 * Mark multiple students as attended a training.
 * Deducts sessions, records visits, returns per-student results.
 *
 * @param {Training} training  — the saved training object
 * @param {string[]} studentIds — students to mark
 * @returns {Promise<MarkResult[]>}
 *
 * @typedef {{ studentId: string, name: string, status: 'ok'|'ending'|'expired'|'none' }} MarkResult
 */
async function markAttendance(training, studentIds) {
  const results = [];

  for (const sid of studentIds) {
    const student = await DB.getStudentById(sid);
    if (!student) continue;

    // Deduct session
    const { sub, status } = await DB.deductSession(sid, training.groupId);

    // Record visit
    await DB.recordVisit(sid, {
      date:       training.date,
      groupId:    training.groupId,
      trainingId: training.id,
    });

    results.push({ studentId: sid, name: student.name, sub, status });
  }

  return results;
}

/**
 * Check if a student is already marked in a training.
 * @param {Training} training
 * @param {string} studentId
 * @returns {boolean}
 */
function isAlreadyMarked(training, studentId) {
  return training.attendees.includes(studentId);
}

/* ────────────────────────────────────────────────
   KPI / summary data
───────────────────────────────────────────────── */

/**
 * Compute dashboard KPIs.
 * @returns {Promise<{ total: number, monthTrainings: number, ending: number, expired: number }>}
 */
async function getKPIs() {
  const [students, trainings] = await Promise.all([
    DB.getStudents(),
    DB.getTrainings(),
  ]);

  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const monthTrainings = trainings.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;

  let ending  = 0;
  let expired = 0;

  for (const s of students) {
    const status = getOverallSubStatus(s);
    if (status.type === 'expired') expired++;
    else if (status.type === 'ending') ending++;
  }

  return {
    total:          students.length,
    monthTrainings,
    ending,
    expired,
  };
}

/**
 * Get students that need attention (ending or expired subscriptions).
 * @returns {Promise<{ student: Student, groupId: string, sub: Subscription|null, status: object }[]>}
 */
async function getWarningStudents() {
  const students = await DB.getStudents();
  const warnings = [];

  for (const s of students) {
    for (const groupId of s.groups) {
      const status = getSubStatus(s, groupId);
      if (status.type === 'ending' || status.type === 'expired') {
        const sub = s.subscriptions.find(sub =>
          sub.groupId === groupId && (sub.isActive || !sub.isActive)
        ) ?? null;
        warnings.push({ student: s, groupId, sub, status });
      }
    }
  }

  return warnings;
}

/**
 * Get students belonging to a specific group.
 * @param {string} groupId
 * @returns {Promise<Student[]>}
 */
async function getStudentsByGroup(groupId) {
  const students = await DB.getStudents();
  return students.filter(s => s.groups.includes(groupId));
}

/**
 * Get group summary stats.
 * @param {string} groupId
 * @returns {Promise<{ total: number, active: number, ending: number, expired: number }>}
 */
async function getGroupStats(groupId) {
  const students = await getStudentsByGroup(groupId);
  let active = 0, ending = 0, expired = 0;

  for (const s of students) {
    const st = getSubStatus(s, groupId);
    if (st.type === 'active')  active++;
    else if (st.type === 'ending')  ending++;
    else if (st.type === 'expired') expired++;
  }

  return { total: students.length, active, ending, expired };
}

/* ────────────────────────────────────────────────
   Formatting helpers (logic-level, no HTML)
───────────────────────────────────────────────── */

/** Format ISO date to Russian short string (e.g. "15 мая") */
function formatDateShort(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Format ISO date to full string (e.g. "15 мая 2026") */
function formatDateFull(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Short month abbreviation (e.g. "май") */
function formatMonth(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
}

/** Day number from ISO date */
function formatDay(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).getDate().toString();
}

/** Subscription type label */
function subTypeLabel(type) {
  const labels = { '1': 'Разовое', '4': '4 занятия', '8': '8 занятий' };
  return labels[type] ?? type;
}

/* ────────────────────────────────────────────────
   Exports
───────────────────────────────────────────────── */
window.Logic = {
  getSubStatus,
  getOverallSubStatus,
  getSubProgress,
  markAttendance,
  isAlreadyMarked,
  getKPIs,
  getWarningStudents,
  getStudentsByGroup,
  getGroupStats,
  formatDateShort,
  formatDateFull,
  formatMonth,
  formatDay,
  subTypeLabel,
};
