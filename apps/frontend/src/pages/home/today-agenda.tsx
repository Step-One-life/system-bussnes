import { useMemo } from 'react'

import { Button } from 'antd'
import {
  CalendarOutlined,
  CheckOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState } from 'common/ui'

import { minutesOfDay } from './agenda-model'

import type { AgendaItem } from './agenda-model'
import type { Student, VisitBilling } from 'entities/students'
import type { CalendarBlock } from 'entities/trainings'

import './today-agenda.scss'
import dayjs from 'dayjs'

interface TodayAgendaProps {
  items: AgendaItem[]
  students: Student[]
  now: Date
  onRowClick: (block: CalendarBlock) => void
  onCreate: () => void
}

export function TodayAgenda({ items, students, now, onRowClick, onCreate }: TodayAgendaProps) {
  const { t } = useTranslation()

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

  if (!items.length) {
    return (
      <EmptyState
        icon={<CalendarOutlined />}
        title={t('home.noTrainingsToday')}
        action={
          <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('home.recordTraining')}
          </Button>
        }
      />
    )
  }

  const nowMin = minutesOfDay(now)
  // Сортировка списка — по началу, а «прошедшесть» — по концу занятия, поэтому
  // прошедшие не обязаны быть префиксом (длинное идущее может начаться раньше
  // уже закончившегося короткого). Разделитель «Сейчас» рисуем между частями.
  const pastItems = items.filter((it) => it.endMin <= nowMin)
  const restItems = items.filter((it) => it.endMin > nowMin)
  const nextKey = restItems.find((r) => r.startMin > nowMin)?.block.key

  const isUnpaid = (it: AgendaItem) => {
    if (it.block.attendeesCount === 0 || !it.block.trainingId) return false
    const billings = billingByTraining.get(it.block.trainingId) ?? []
    return billings.some((b) => b === 'none')
  }

  /** «через 1 ч 28 мин» / «через 45 мин» / «через 2 ч» — реальный остаток. */
  const inLabel = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const time = [
      h > 0 ? t('home.hoursShort', { count: h }) : '',
      m > 0 || h === 0 ? t('home.minutesShort', { count: Math.max(m, 1) }) : '',
    ]
      .filter(Boolean)
      .join(' ')
    return t('home.agendaIn', { time })
  }

  const typeLine = (it: AgendaItem) =>
    it.typeKey === 'group' && it.block.attendeesCount > 0
      ? `${t('trainings.type.group')} · ${t('home.agendaAttendees', { count: it.block.attendeesCount })}`
      : t(`trainings.type.${it.typeKey}`)

  const renderRow = (it: AgendaItem) => {
    const past = it.endMin <= nowMin
    const ongoing = !past && it.startMin <= nowMin
    const unpaid = past && isUnpaid(it)
    const unmarked = past && it.block.attendeesCount === 0
    const done = past && !unpaid && !unmarked

    let subClass = ''
    let subText = typeLine(it)
    if (unpaid) {
      subClass = 'agenda__sub--unpaid'
      subText = t('home.agendaUnpaid')
    } else if (unmarked) {
      // «Не отмечено» — сигнал к действию, тот же warning-стиль, что у оплаты.
      subClass = 'agenda__sub--unpaid'
      subText = t('home.agendaUnmarked')
    } else if (ongoing) {
      subClass = 'agenda__sub--accent'
      subText = t('home.agendaInProgress')
    } else if (!past) {
      subText = inLabel(it.startMin - nowMin)
    }

    const highlight = ongoing || it.block.key === nextKey
    const cls = [
      'agenda__row',
      // Приглушаем только закрытые занятия: «не оплачено» и «не отмечено» —
      // открытые сигналы, им полная непрозрачность.
      done ? 'agenda__row--past' : '',
      highlight ? 'agenda__row--next' : '',
    ]
      .filter(Boolean)
      .join(' ')
    const handleClick = () => onRowClick(it.block)

    return (
      <button type="button" key={it.block.key} className={cls} onClick={handleClick}>
        <span className="agenda__time">{it.block.time}</span>
        <span className="agenda__main">
          <span className="agenda__name">{it.block.label}</span>
          <span className={`agenda__sub ${subClass}`.trim()}>
            {(unpaid || unmarked) && <i className="agenda__sub-dot" />}
            {subText}
          </span>
        </span>
        {done ? (
          <CheckOutlined className="agenda__check" />
        ) : (
          <RightOutlined className="agenda__chevron" />
        )}
      </button>
    )
  }

  const divider = (
    <div className="agenda__divider">
      <span className="agenda__divider-dot" />
      <span className="agenda__divider-label">
        {t('home.agendaNow')}, {dayjs(now).format('HH:mm')}
      </span>
    </div>
  )

  return (
    <div className="agenda">
      {pastItems.map(renderRow)}
      {divider}
      {restItems.map(renderRow)}
    </div>
  )
}
