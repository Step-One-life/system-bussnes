import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from 'antd'
import { CheckOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { AdaptiveSheet } from 'common/ui'
import { usePricingRules } from 'entities/finance/api/use-finance'
import { useGroups } from 'entities/groups'
import { getSubStatus } from 'entities/students'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'

import { previewBilling } from './billing-preview'
import { indKey } from './day-marking-model'
import { MarkStudentRow } from './mark-student-row'
import { needsSub, useDayMarking } from './use-day-marking'

import './quick-mark-sheet.scss'

/** Что отмечаем: групповое — по имени группы, инд./парное — по trainingId. */
export interface QuickMarkTarget {
  groupId: string
  trainingId: string | null
  isInd: boolean
  time: string
  label: string
  date: string
}

interface IssueTarget {
  studentId: string
  name: string
  groupId: string
  trainingId?: string
}

interface QuickMarkSheetProps {
  target: QuickMarkTarget | null
  onClose: () => void
}

export function QuickMarkSheet({ target, onClose }: QuickMarkSheetProps) {
  const { t } = useTranslation()
  const open = !!target
  const date = target?.date ?? ''
  const {
    dayGroups,
    dayIndividuals,
    students,
    trainings,
    checks,
    indChecks,
    toggle,
    toggleInd,
    initChecks,
    save,
    saving,
  } = useDayMarking(open, onClose, date)
  const { data: groups = [] } = useGroups()
  const [issueFor, setIssueFor] = useState<IssueTarget | null>(null)

  // Срез дня под одно занятие: группа по имени, инд./парное по trainingId.
  const slotGroup =
    target && !target.isInd
      ? dayGroups.find((g) => g.groupId === target.groupId) ?? null
      : null
  const slotInd = useMemo(
    () => (target?.isInd ? dayIndividuals.filter((i) => i.trainingId === target.trainingId) : []),
    [dayIndividuals, target],
  )

  const inited = useRef(false)
  useEffect(() => {
    if (!open) {
      inited.current = false
      return
    }
    if (!inited.current && students.length > 0 && (slotGroup || slotInd.length > 0)) {
      initChecks()
      inited.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, students, slotGroup, slotInd])

  const group = groups.find((g) => g.name === target?.groupId) ?? null
  const { data: rules = [] } = usePricingRules(group?.locationId ?? '')

  const groupMembers = useMemo(
    () => (slotGroup ? students.filter((s) => s.groups.includes(slotGroup.groupId)) : []),
    [students, slotGroup],
  )

  // Инд./парная тренировка среза — для isPair, isPrime и длительности.
  const indTraining = target?.isInd
    ? trainings.find((tr) => tr.id === target.trainingId) ?? null
    : null

  const billingLine = (studentId: string, isPair: boolean, isPrime: boolean, duration: number) => {
    const st = students.find((s) => s.id === studentId)
    if (!st || !target) return null
    const preview = previewBilling({
      student: st,
      groupId: target.groupId,
      isPair,
      isPrime,
      sessionDuration: duration,
      rules,
    })
    if (preview.kind === 'subscription')
      return t('home.billingSub', { count: preview.remaining })
    if (preview.kind === 'payment')
      return preview.amount === null
        ? t('home.billingNoTariff')
        : t('home.billingPayment', { amount: preview.amount })
    return null
  }

  const checkedCount = slotGroup
    ? (checks[slotGroup.groupId]?.size ?? 0)
    : slotInd.filter((i) => indChecks[indKey(i.trainingId, i.studentId)] ?? i.originalPresent).length
  const totalCount = slotGroup ? groupMembers.length : slotInd.length

  const handleSave = () => {
    if (!target) return
    // Сохраняем ТОЛЬКО срез этого занятия — остальной день не трогаем.
    if (slotGroup) {
      save({ groups: { [slotGroup.groupId]: checks[slotGroup.groupId] ?? new Set() }, ind: {} })
    } else {
      const ind: Record<string, boolean> = {}
      for (const i of slotInd) {
        const key = indKey(i.trainingId, i.studentId)
        ind[key] = indChecks[key] ?? i.originalPresent
      }
      save({ groups: {}, ind })
    }
  }

  const handleIssued = () => {
    if (!issueFor) return
    if (issueFor.trainingId) toggleInd(issueFor.trainingId, issueFor.studentId)
    else toggle(issueFor.groupId, issueFor.studentId)
  }

  return (
    <>
      <AdaptiveSheet
        open={open}
        title={target ? `${target.label} · ${target.time}` : ''}
        onClose={onClose}
        footer={
          <Button
            className="tk-btn-primary"
            type="primary"
            block
            loading={saving}
            onClick={handleSave}
          >
            <CheckOutlined />{' '}
            {t('home.quickMarkDone', { checked: checkedCount, total: totalCount })}
          </Button>
        }
      >
        <div className="quick-mark">
          {slotGroup &&
            groupMembers.map((s) => {
              const st = getSubStatus(s, slotGroup.groupId, slotGroup.duration)
              const checked = checks[slotGroup.groupId]?.has(s.id) ?? false
              const gated = needsSub(st.type) && !checked
              return (
                <MarkStudentRow
                  key={s.id}
                  name={s.name}
                  status={st}
                  checked={checked}
                  gated={gated}
                  legacyWarn={needsSub(st.type) && checked}
                  subLine={billingLine(s.id, false, false, slotGroup.duration)}
                  onToggle={() => toggle(slotGroup.groupId, s.id)}
                  onIssue={() =>
                    setIssueFor({ studentId: s.id, name: s.name, groupId: slotGroup.groupId })
                  }
                />
              )
            })}
          {slotInd.map((i) => {
            const st = students.find((s) => s.id === i.studentId)
            if (!st || !target) return null
            const status = getSubStatus(st, i.groupId)
            const checked = indChecks[indKey(i.trainingId, i.studentId)] ?? i.originalPresent
            const gated = needsSub(status.type) && !checked
            return (
              <MarkStudentRow
                key={indKey(i.trainingId, i.studentId)}
                name={st.name}
                status={status}
                checked={checked}
                gated={gated}
                legacyWarn={needsSub(status.type) && checked}
                subLine={billingLine(
                  i.studentId,
                  indTraining?.isPair ?? false,
                  indTraining?.isPrime ?? false,
                  indTraining?.sessionDuration ?? 60,
                )}
                onToggle={() => toggleInd(i.trainingId, i.studentId)}
                onIssue={() =>
                  setIssueFor({
                    studentId: i.studentId,
                    name: st.name,
                    groupId: i.groupId,
                    trainingId: i.trainingId,
                  })
                }
              />
            )
          })}
        </div>
      </AdaptiveSheet>
      {issueFor && (
        <RenewSubModal
          open
          issueMode
          studentId={issueFor.studentId}
          studentName={issueFor.name}
          groupId={issueFor.groupId}
          onCreated={handleIssued}
          onClose={() => setIssueFor(null)}
        />
      )}
    </>
  )
}
