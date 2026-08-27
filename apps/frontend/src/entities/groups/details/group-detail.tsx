import { useMemo } from 'react'

import { Button } from 'antd'
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { groupStats, studentsOfGroup } from 'common/lib/kpi'
import {
  EmptyState,
  ErrorState,
  KpiCard,
  ListSkeleton,
  PageHeader,
  StatusBadge,
  SubProgressBar,
} from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { useStudents } from 'entities/students/api/use-students'
import { getLastVisitDate } from 'entities/students/model/students.repo'
import { getSubStatus } from 'entities/students/model/subscription-status'
import { formatSchedule } from 'entities/trainings/model/training-logic'

import type { Group } from '../model/types'

import './group-detail.scss'

interface GroupDetailProps {
  group: Group
  onBack: () => void
  onEdit: (group: Group) => void
  onOpenStudent: (studentId: string) => void
  onAddStudent: () => void
}

export function GroupDetail({ group, onBack, onEdit, onOpenStudent, onAddStudent }: GroupDetailProps) {
  const { t } = useTranslation()
  // Один общий кэш учеников на всё приложение: карточка обновляется от любой
  // инвалидации studentKeys — добавили ученика или продлили абонемент прямо
  // отсюда, и цифры сразу верные.
  const { data: allStudents = [], isLoading, isError, refetch } = useStudents()
  const students = useMemo(
    () => studentsOfGroup(allStudents, group.name),
    [allStudents, group.name],
  )
  const stats = useMemo(() => groupStats(allStudents, group.name), [allStudents, group.name])

  const schedule = formatSchedule(group)

  const handleEdit = () => onEdit(group)
  const handleOpenStudent = (studentId: string) => () => onOpenStudent(studentId)

  const backBtn = (
    <Button
      type="text"
      size="small"
      icon={<ArrowLeftOutlined />}
      onClick={onBack}
      style={{ marginBottom: 'var(--sp-2)' }}
    >
      {t('groups.detail.allGroups')}
    </Button>
  )

  // Сбой загрузки учеников группы не должен молча рисовать «0 / пусто».
  if (isError) {
    return (
      <div>
        <PageHeader title={group.name} back={backBtn} />
        <ErrorState onRetry={refetch} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title={group.name} back={backBtn} />
        <ListSkeleton rows={3} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        subtitle={t('groups.detail.subtitle', {
          count: stats?.total ?? 0,
          schedule: schedule ? ' · ' + schedule : '',
        })}
        back={backBtn}
        actions={
          <Button icon={<EditOutlined />} onClick={handleEdit}>
            {t('common.edit')}
          </Button>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-6)' }}>
        <KpiCard
          label={t('groups.detail.total')}
          value={stats?.total ?? 0}
          icon={<TeamOutlined />}
          variant="accent"
        />
        <KpiCard
          label={t('groups.detail.active')}
          value={stats?.active ?? 0}
          icon={<CheckCircleOutlined />}
          variant="ok"
        />
        <KpiCard
          label={t('groups.detail.ending')}
          value={stats?.ending ?? 0}
          icon={<WarningOutlined />}
          variant="warn"
        />
        <KpiCard
          label={t('groups.detail.expired')}
          value={stats?.expired ?? 0}
          icon={<AlertOutlined />}
          variant="danger"
        />
      </div>

      {students.length ? (
        <div className="group-clients">
          {students.map((s) => {
            const sub = s.subscriptions.find((x) => x.groupId === group.name && x.isActive) ?? null
            const lv = getLastVisitDate(s)
            const initials = s.name
              .split(' ')
              .filter(Boolean)
              .map((w) => w[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
            return (
              <div
                key={s.id}
                className="group-client-card"
                onClick={handleOpenStudent(s.id)}
              >
                <div className="group-client-card__avatar">{initials}</div>
                <div className="group-client-card__main">
                  <div className="group-client-card__name">{s.name}</div>
                  <SubProgressBar sub={sub} />
                  <div className="group-client-card__visit">
                    {lv
                      ? t('groups.detail.visit', { date: formatDateShort(lv) })
                      : t('groups.detail.noVisits')}
                  </div>
                </div>
                <StatusBadge status={getSubStatus(s, group.name)} />
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={t('groups.detail.noStudents')}
          icon={<TeamOutlined />}
          action={
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={onAddStudent}>
              {t('students.add')}
            </Button>
          }
        />
      )}
    </div>
  )
}
