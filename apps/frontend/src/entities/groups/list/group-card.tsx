import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { formatDateShort, todayISO } from 'common/utils/date'
import { formatSchedule } from 'entities/trainings/model/training-logic'

import { useGroupStats } from '../api/use-group-stats'
import { isGroupExpired } from '../model/group-expiry'

import type { Group } from '../model/types'
import type { MouseEvent } from 'react'

import './group-card.scss'

interface GroupCardProps {
  group: Group
  onOpen: (group: Group) => void
  onEdit: (group: Group) => void
}

export function GroupCard({ group, onOpen, onEdit }: GroupCardProps) {
  const { t } = useTranslation()
  const { data: stats } = useGroupStats(group.name)

  const expired = isGroupExpired(group.expiresAt, todayISO())

  const handleOpen = () => onOpen(group)
  const handleEdit = (e: MouseEvent) => {
    e.stopPropagation()
    onEdit(group)
  }

  return (
    <div className="group-card" onClick={handleOpen}>
      <div className="group-card__head">
        <div className="group-card__name">
          {group.name}
          {expired && (
            <span
              style={{
                marginLeft: 'var(--sp-2)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--tk-danger, #d4380d)',
                textTransform: 'uppercase',
              }}
            >
              {t('groups.card.expiredBadge')}
            </span>
          )}
        </div>
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          aria-label={t('common.edit')}
          onClick={handleEdit}
        />
      </div>
      <div className="group-card__schedule">{formatSchedule(group)}</div>
      {group.expiresAt && (
        <div
          className="group-card__expiry"
          style={{
            fontSize: '0.75rem',
            color: expired ? 'var(--tk-danger, #d4380d)' : 'var(--tk-text-tertiary)',
          }}
        >
          {t(expired ? 'groups.card.expiredOn' : 'groups.card.activeUntil', {
            date: formatDateShort(group.expiresAt),
          })}
        </div>
      )}
      <div className="group-card__stats">
        <div className="group-stat">
          <span className="group-stat__label">{t('groups.card.totalStudents')}</span>
          <span className="group-stat__value">{stats?.total ?? 0}</span>
        </div>
        <div className="group-stat">
          <span className="group-stat__label">{t('groups.card.activeSub')}</span>
          <span className="group-stat__value">{stats?.active ?? 0}</span>
        </div>
        <div className="group-stat">
          <span className="group-stat__label">{t('groups.card.ending')}</span>
          <span className="group-stat__value group-stat__value--warn">{stats?.ending ?? 0}</span>
        </div>
        <div className="group-stat">
          <span className="group-stat__label">{t('groups.card.needRenew')}</span>
          <span className="group-stat__value group-stat__value--danger">
            {stats?.expired ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}
