import { Fragment, useEffect, useMemo, useState } from 'react'

import { Button } from 'antd'
import {
  CalendarOutlined,
  CheckCircleFilled,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'

import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { EmptyState } from 'common/ui'

import type { CalendarBlock, Training } from 'entities/trainings'
import type { Group } from 'entities/groups'
import type { Student, VisitBilling } from 'entities/students'

import './today-agenda.scss'

interface TodayAgendaProps {
  rows: CalendarBlock[]
  trainings: Training[]
  groups: Group[]
  students: Student[]
  onRowClick: (block: CalendarBlock) => void
  onCreate: () => void
}

type StatusKind = 'done' | 'unpaid' | 'unmarked' | 'ongoing' | 'soon' | null

const REFRESH_MS = 30_000

/** «Валера Валерьевич» → «ВВ», пара «Валера + Саша» → «ВС». */
function initialsOf(label: string): string {
  return label
    .split(/[\s+]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

export function TodayAgenda({
  rows,
  trainings,
  groups,
  students,
  onRowClick,
  onCreate,
}: TodayAgendaProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const trainingById = useMemo(
    () => new Map(trainings.map((tr) => [tr.id, tr])),
    [trainings],
  )
  const groupByName = useMemo(() => new Map(groups.map((g) => [g.name, g])), [groups])

  const billingByTraining = useMemo(() => {
    const map = new Map<string, (VisitBilling | null)[]>()
    for (const s of students) {
      for (const v of s.visitHistory) {
        if (!v.trainingId) continue
        const arr = map.get(v.trainingId) ?? []
        arr.push(v.billing)
        map.set(v.trainingId, arr)
      }
    }
    return map
  }, [students])

  const items = useMemo(
    () =>
      rows.map((block) => {
        const [hh, mm] = block.time.split(':').map(Number)
        const startMin = hh * 60 + (mm || 0)
        const training = block.trainingId ? trainingById.get(block.trainingId) : undefined
        const duration =
          training?.sessionDuration || groupByName.get(block.groupId)?.duration || 60
        const typeKey = !block.isInd
          ? 'group'
          : training?.isPair
            ? 'pair'
            : training?.isOnline
              ? 'online'
              : 'individual'
        return { block, startMin, endMin: startMin + duration, duration, typeKey }
      }),
    [rows, trainingById, groupByName],
  )

  if (!items.length) {
    return (
      <EmptyState
        icon={<CalendarOutlined />}
        title={t('home.noTrainingsToday')}
        action={
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('home.recordTraining')}
          </Button>
        }
      />
    )
  }

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const pastCount = items.filter((it) => it.endMin <= nowMin).length
  const nextIdx = items.findIndex((it) => it.startMin > nowMin)

  const statusOf = (it: (typeof items)[number], idx: number): StatusKind => {
    if (it.endMin <= nowMin) {
      if (it.block.attendeesCount === 0) return 'unmarked'
      const billings = it.block.trainingId
        ? (billingByTraining.get(it.block.trainingId) ?? [])
        : []
      return billings.some((b) => b === 'none') ? 'unpaid' : 'done'
    }
    if (it.startMin <= nowMin) return 'ongoing'
    if (idx === nextIdx) return 'soon'
    return null
  }

  const statusNode = (kind: StatusKind) => {
    switch (kind) {
      case 'done':
        return <CheckCircleFilled className="agenda__status agenda__status--done" />
      case 'unpaid':
        return (
          <span className="agenda__status agenda__status--unpaid">
            {t('home.agendaUnpaid')}
          </span>
        )
      case 'unmarked':
        return (
          <span className="agenda__status agenda__status--muted">
            {t('home.agendaUnmarked')}
          </span>
        )
      case 'ongoing':
        return (
          <span className="agenda__status agenda__status--soon">
            {t('home.agendaInProgress')}
          </span>
        )
      case 'soon':
        return (
          <span className="agenda__status agenda__status--soon">
            {t('home.agendaSoon')}
          </span>
        )
      default:
        return null
    }
  }

  const divider = (
    <div className="agenda__divider">
      <span className="agenda__divider-label">
        {t('home.agendaNow')} · {dayjs(now).format('HH:mm')}
      </span>
    </div>
  )

  return (
    <div className="agenda">
      {items.map((it, idx) => {
        const kind = statusOf(it, idx)
        // Неоплаченное прошедшее не приглушаем: это сигнал, а не история.
        const past = it.endMin <= nowMin && kind !== 'unpaid'
        const highlight = kind === 'ongoing' || idx === nextIdx
        const cls = [
          'agenda__row',
          past ? 'agenda__row--past' : '',
          highlight ? 'agenda__row--next' : '',
        ]
          .filter(Boolean)
          .join(' ')
        const handleClick = () => onRowClick(it.block)
        return (
          <Fragment key={it.block.key}>
            {idx === pastCount && divider}
            <button type="button" className={cls} onClick={handleClick}>
              <span className="agenda__time">
                <span className="agenda__time-start">{it.block.time}</span>
                <span className="agenda__time-dur">
                  {t('home.minutesShort', { count: it.duration })}
                </span>
              </span>
              <span
                className={`agenda__avatar${it.block.isInd ? ' agenda__avatar--ind' : ''}`}
              >
                {it.block.isInd ? initialsOf(it.block.label) : <TeamOutlined />}
              </span>
              <span className="agenda__main">
                <span className="agenda__name">{it.block.label}</span>
                <span className="agenda__sub">
                  {t(`trainings.type.${it.typeKey}`)}
                  {it.typeKey === 'group' && it.block.attendeesCount > 0
                    ? ` · ${t('home.agendaAttendees', { count: it.block.attendeesCount })}`
                    : ''}
                </span>
              </span>
              {statusNode(kind)}
            </button>
          </Fragment>
        )
      })}
      {pastCount === items.length && divider}
    </div>
  )
}
