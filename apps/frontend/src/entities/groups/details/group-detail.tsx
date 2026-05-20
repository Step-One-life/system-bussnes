import { useQuery } from '@tanstack/react-query'

import { Button } from 'antd'
import {
  AlertOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { getGroupStats, getStudentsByGroup } from 'common/lib/kpi'
import { EmptyState, KpiCard, PageHeader, StatusBadge, SubProgressBar } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
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
}

export function GroupDetail({ group, onBack, onEdit, onOpenStudent }: GroupDetailProps) {
  const { t } = useTranslation()
  const { data: stats } = useQuery({
    queryKey: ['groups', group.name, 'stats'],
    queryFn: () => getGroupStats(group.name),
  })
  const { data: students = [] } = useQuery({
    queryKey: ['groups', group.name, 'students'],
    queryFn: () => getStudentsByGroup(group.name),
  })

  const schedule = formatSchedule(group)

  const handleEdit = () => onEdit(group)
  const handleOpenStudent = (studentId: string) => () => onOpenStudent(studentId)

  return (
    <div>
      <PageHeader
        title={group.name}
        subtitle={t('groups.detail.subtitle', {
          count: stats?.total ?? 0,
          schedule: schedule ? ' · ' + schedule : '',
        })}
        back={
          <Button
            type="text"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ marginBottom: 'var(--sp-2)' }}
          >
            {t('groups.detail.allGroups')}
          </Button>
        }
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
        <EmptyState title={t('groups.detail.noStudents')} icon={<TeamOutlined />} />
      )}
    </div>
  )
}
