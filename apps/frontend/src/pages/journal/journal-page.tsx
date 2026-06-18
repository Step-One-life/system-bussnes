import { useMemo, useState } from 'react'

import { Button } from 'antd'

import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton, PageHeader, useToast } from 'common/ui'
import {
  batchLabelKey,
  describeEvent,
  groupByDayAndBatch,
  useActivityLog,
  useUndoBatch,
  useUndoEvent,
} from 'entities/activity-log'

import type { ActivityEntry } from 'entities/activity-log'

import './journal-page.scss'

export function JournalPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useActivityLog()
  const undoEvent = useUndoEvent()
  const undoBatch = useUndoBatch()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const days = useMemo(() => {
    const all = (data?.pages ?? []).flatMap((p) => p.data)
    return groupByDayAndBatch(all)
  }, [data])

  // Сбой отката (напр. 409 — объект уже изменён) раньше уходил в unhandled
  // rejection без тоста: показываем ошибку, тост успеха — только при успехе.
  const onUndo = async (id: string) => {
    try {
      await undoEvent.mutateAsync(id)
      toast({ type: 'success', title: t('journal.undoneToast') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }
  const onUndoBatch = async (batchId: string) => {
    try {
      await undoBatch.mutateAsync(batchId)
      toast({ type: 'success', title: t('journal.undoneToast') })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const dayLabel = (date: string) => {
    const now = new Date()
    const ymd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (date === ymd(now)) return t('journal.today')
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date === ymd(yesterday)) return t('journal.yesterday')
    return date
  }

  const renderEvent = (e: ActivityEntry, inBatch: boolean) => {
    const v = describeEvent(e)
    return (
      <div
        key={e.id}
        className={`jr-row${v.undone ? ' jr-row--undone' : ''}${inBatch ? ' jr-row--child' : ''}`}
      >
        <span className="jr-row__icon">{v.icon}</span>
        <div className="jr-row__body">
          <div className="jr-row__title">
            {v.titleKey ? t(v.titleKey, v.titleParams) : v.titleText}
          </div>
          {v.detailKey && <div className="jr-row__detail">{t(v.detailKey, v.detailParams)}</div>}
          {v.detailText && <div className="jr-row__detail">{v.detailText}</div>}
        </div>
        {v.undone ? (
          <span className="jr-row__undone">{t('journal.undone')}</span>
        ) : v.undoable ? (
          <Button size="small" type="text" onClick={() => onUndo(e.id)}>
            {t('journal.undo')}
          </Button>
        ) : null}
      </div>
    )
  }

  if (isLoading)
    return (
      <div>
        <PageHeader title={t('journal.title')} />
        <ListSkeleton />
      </div>
    )
  if (isError)
    return (
      <div>
        <PageHeader title={t('journal.title')} />
        <ErrorState onRetry={refetch} />
      </div>
    )

  return (
    <div className="journal-page">
      <PageHeader title={t('journal.title')} />
      {days.length === 0 ? (
        <EmptyState title={t('journal.empty')} text={t('journal.emptyText')} />
      ) : (
        days.map((day) => (
          <section key={day.date} className="jr-day">
            <div className="jr-day__label">{dayLabel(day.date)}</div>
            {day.items.map((item) =>
              item.kind === 'single' ? (
                renderEvent(item.event, false)
              ) : (
                <div key={item.batchId} className="jr-batch">
                  <div className="jr-batch__head" onClick={() => toggle(item.batchId)}>
                    <span className="jr-batch__caret">
                      {expanded.has(item.batchId) ? '▾' : '▸'}
                    </span>
                    <span className="jr-batch__title">
                      {t(batchLabelKey(item.children), { count: item.children.length })}
                    </span>
                    <Button
                      size="small"
                      type="text"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onUndoBatch(item.batchId)
                      }}
                    >
                      {t('journal.undoAll')}
                    </Button>
                  </div>
                  {expanded.has(item.batchId) &&
                    item.children.map((c) => renderEvent(c, true))}
                </div>
              ),
            )}
          </section>
        ))
      )}
      {hasNextPage && (
        <div className="jr-more">
          <Button onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            {t('journal.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
