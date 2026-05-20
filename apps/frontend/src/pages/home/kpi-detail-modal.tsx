import { Modal } from 'antd'

import { useTranslation } from 'react-i18next'

import { Badge, StatusBadge, WarningItem } from 'common/ui'
import { formatDay, formatDayOfWeek, formatMonth } from 'common/utils/date'
import { getInitials, getOverallSubStatus } from 'entities/students'

import type { WarningEntry } from 'common/lib/kpi'
import type { Student } from 'entities/students'
import type { Training } from 'entities/trainings'

import './kpi-detail-modal.scss'

export type KpiType = 'total' | 'month' | 'ending' | 'expired'

interface KpiDetailModalProps {
  kpiType: KpiType | null
  students: Student[]
  trainings: Training[]
  warnings: WarningEntry[]
  indNames: string[]
  regularNames: string[]
  onClose: () => void
  onOpenStudent: (id: string) => void
  onRenew: (studentId: string, groupId: string) => void
}

export function KpiDetailModal({
  kpiType,
  students,
  trainings,
  warnings,
  indNames,
  regularNames,
  onClose,
  onOpenStudent,
  onRenew,
}: KpiDetailModalProps) {
  const { t } = useTranslation()
  if (!kpiType) return null

  const now = new Date()

  const handleOpenStudent = (id: string) => () => {
    onClose()
    onOpenStudent(id)
  }
  const handleRenewWarning =
    (studentId: string, groupId: string) =>
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClose()
      onRenew(studentId, groupId)
    }

  let title = ''
  let body: React.ReactNode = null

  if (kpiType === 'total') {
    title = t('home.kpi.allStudents', { count: students.length })
    body = students.length ? (
      <div className="kpi-list">
        {students.map((s) => {
          const st = getOverallSubStatus(s)
          const groups = s.groups.filter((g) => !indNames.includes(g))
          return (
            <div
              key={s.id}
              className="kpi-list-row kpi-list-row--clickable"
              onClick={handleOpenStudent(s.id)}
            >
              <div className="kpi-list-avatar">{getInitials(s.name)}</div>
              <div className="kpi-list-info">
                <span className="kpi-list-name">{s.name}</span>
                <span className="kpi-list-meta">
                  {groups.length ? groups.join(', ') : t('home.kpi.noGroups')}
                </span>
              </div>
              <StatusBadge status={st} />
            </div>
          )
        })}
      </div>
    ) : (
      <p className="kpi-empty">{t('home.kpi.noStudents')}</p>
    )
  }

  if (kpiType === 'month') {
    const monthName = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    const monthList = trainings
      .filter((tr) => {
        const d = new Date(tr.date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .sort((a, b) => a.date.localeCompare(b.date))
    title = t('home.kpi.trainingsMonth', { month: monthName })
    body = monthList.length ? (
      <div className="kpi-list">
        {monthList.map((tr) => {
          const isInd = indNames.includes(tr.groupId) || !regularNames.includes(tr.groupId)
          const clientName = isInd
            ? (students.find((s) => s.id === tr.attendees[0])?.name ?? null)
            : null
          const label = clientName ? t('home.kpi.indWith', { name: clientName }) : tr.groupId
          const meta = [
            tr.time,
            !isInd && tr.attendees.length
              ? t('home.kpi.attendeesCount', { count: tr.attendees.length })
              : '',
          ]
            .filter(Boolean)
            .join(' · ')
          return (
            <div key={tr.id} className="kpi-list-row">
              <div className="kpi-list-date">
                <span className="kpi-list-date__dow">{formatDayOfWeek(tr.date)}</span>
                <span className="kpi-list-date__day">{formatDay(tr.date)}</span>
                <span className="kpi-list-date__mon">{formatMonth(tr.date)}</span>
              </div>
              <div className="kpi-list-info">
                <span className="kpi-list-name">{label}</span>
                {meta && <span className="kpi-list-meta">{meta}</span>}
              </div>
            </div>
          )
        })}
      </div>
    ) : (
      <p className="kpi-empty">{t('home.kpi.noMonthTrainings')}</p>
    )
  }

  if (kpiType === 'ending' || kpiType === 'expired') {
    const filtered = warnings.filter((w) => w.status.type === kpiType)
    title = kpiType === 'ending' ? t('home.kpi.ending') : t('home.kpi.expired')
    body = filtered.length ? (
      <div className="warning-list">
        {filtered.map((w) => (
          <WarningItem
            key={`${w.student.id}-${w.groupId}`}
            name={w.student.name}
            detail={`${indNames.includes(w.groupId) ? t('home.kpi.indTraining') : w.groupId} · ${w.status.label}`}
            danger={w.status.type === 'expired'}
            onClick={handleOpenStudent(w.student.id)}
            action={
              <Badge variant="accent">
                <span
                  onClick={handleRenewWarning(w.student.id, w.groupId)}
                  style={{ cursor: 'pointer' }}
                >
                  {t('home.kpi.extend')}
                </span>
              </Badge>
            }
          />
        ))}
      </div>
    ) : (
      <p className="kpi-empty">{t('home.kpi.noCategory')}</p>
    )
  }

  return (
    <Modal open title={title} onCancel={onClose} footer={null} width={520}>
      {body}
    </Modal>
  )
}
