import { Button, Checkbox } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { StatusBadge } from 'common/ui'

import type { SubStatus } from 'entities/students'
import type { ReactNode } from 'react'

interface MarkStudentRowProps {
  name: string
  status: SubStatus
  checked: boolean
  /** Без активного абонемента: чекбокс заблокирован, тап ведёт в оформление. */
  gated: boolean
  /** Отмечен без абонемента (легаси-данные) — warning-чип. */
  legacyWarn: boolean
  subLine?: ReactNode
  onToggle: () => void
  onIssue: () => void
}

export function MarkStudentRow({
  name,
  status,
  checked,
  gated,
  legacyWarn,
  subLine,
  onToggle,
  onIssue,
}: MarkStudentRowProps) {
  const { t } = useTranslation()
  const handleGated = (e: React.MouseEvent) => {
    e.preventDefault()
    onIssue()
  }
  const handleIssueBtn = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onIssue()
  }
  return (
    <label
      className={`mark-row${checked ? ' mark-row--checked' : ''}${gated ? ' mark-row--gated' : ''}`}
      onClick={gated ? handleGated : undefined}
    >
      <Checkbox checked={checked} disabled={gated} onChange={onToggle} />
      <div className="mark-row__info">
        <span className="mark-row__name">{name}</span>
        {subLine && <span className="mark-row__sub">{subLine}</span>}
        {legacyWarn && (
          <span className="mark-row__warn">
            <ExclamationCircleOutlined /> {t('trainings.cal.markedNoSub')}
          </span>
        )}
      </div>
      <StatusBadge status={status} />
      {gated && (
        <Button size="small" onClick={handleIssueBtn}>
          {t('trainings.cal.issueSub')}
        </Button>
      )}
    </label>
  )
}
