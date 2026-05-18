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
 * Days remaining until subscription expires (null if no expiresAt set).
 * @param {Subscription} sub
 * @returns {number|null}
 */
function getDaysRemaining(sub) {
  if (!sub || !sub.expiresAt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(sub.expiresAt);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * Compute the subscription status label for a student in a given group.
 * @param {Student} student
 * @param {string} groupId
 * @returns {{ label: string, type: 'active'|'ending'|'danger'|'expired'|'none' }}
 */
function getSubStatus(student, groupId) {
  const sub = student.subscriptions.find(s => s.groupId === groupId && s.isActive);

  if (!sub) {
    const any = student.subscriptions.find(s => s.groupId === groupId);
    if (any) return { label: 'Нужно продлить', type: 'expired' };
    return { label: 'Нет абонемента', type: 'none' };
  }

  const days = getDaysRemaining(sub);

  if (days !== null && days < 0) return { label: 'Истёк срок',    type: 'expired' };
  if (sub.remaining === 0)       return { label: 'Нужно продлить', type: 'expired' };
  // Single-visit subscriptions are always "active" until used — no "ending" threshold
  if (sub.type !== '1' && (sub.remaining <= 2 || (days !== null && days <= 7))) {
    return { label: 'Заканчивается', type: 'ending' };
  }
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
  if (sub.remaining === 0) cls = 'danger';
  else if (sub.remaining === 1 && sub.total > 1) cls = 'danger';
  else if (sub.remaining === 2 && sub.total > 2) cls = 'warn';
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
 * KPIs for individual sessions.
 * @param {string[]} indGroupNames
 */
async function getIndividualKPIs(indGroupNames) {
  if (!indGroupNames.length) return { clients: 0, monthSessions: 0, weekSessions: 0, expiring: 0 };

  const [students, trainings] = await Promise.all([DB.getStudents(), DB.getTrainings()]);

  const clients = students.filter(s => s.groups.some(g => indGroupNames.includes(g)));

  const now          = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek  = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  startOfWeek.setHours(0, 0, 0, 0);

  const indTrainings   = trainings.filter(t => indGroupNames.includes(t.groupId));
  const monthSessions  = indTrainings.filter(t => new Date(t.date) >= startOfMonth).length;
  const weekSessions   = indTrainings.filter(t => new Date(t.date) >= startOfWeek).length;

  let expiring = 0;
  for (const s of clients) {
    const hasIssue = s.groups
      .filter(g => indGroupNames.includes(g))
      .some(g => { const st = getSubStatus(s, g); return st.type === 'expired' || st.type === 'ending'; });
    if (hasIssue) expiring++;
  }

  return { clients: clients.length, monthSessions, weekSessions, expiring };
}

/**
 * Students with expiring/expired individual subscriptions.
 * @param {string[]} indGroupNames
 */
async function getIndividualWarnings(indGroupNames) {
  const students = await DB.getStudents();
  const warnings = [];
  for (const s of students) {
    for (const groupId of s.groups.filter(g => indGroupNames.includes(g))) {
      const status = getSubStatus(s, groupId);
      if (status.type === 'ending' || status.type === 'expired') {
        const sub = s.subscriptions.find(sub => sub.groupId === groupId) ?? null;
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

/** Format group schedule to a readable string.
 *  Groups days that share the same time: "Пн, Ср 19:00 | Сб 16:00 · 90 мин"
 */
function formatSchedule(group) {
  if (!group) return '';

  const schedule = group.schedule ?? [];
  if (!schedule.length && !group.duration) return 'Расписание не задано';

  let schedulePart = '';
  if (schedule.length) {
    // Group by time
    const byTime = new Map();
    for (const { day, time } of schedule) {
      const key = time || '';
      if (!byTime.has(key)) byTime.set(key, []);
      byTime.get(key).push(day);
    }
    schedulePart = [...byTime.entries()]
      .map(([time, days]) => days.join(', ') + (time ? ' ' + time : ''))
      .join(' | ');
  }

  const parts = [];
  if (schedulePart)    parts.push(schedulePart);
  if (group.duration)  parts.push(group.duration + ' мин');
  return parts.join(' · ') || 'Расписание не задано';
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
  getDaysRemaining,
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
  formatSchedule,
  getIndividualKPIs,
  getIndividualWarnings,
};
