import { useMemo, useState } from 'react'

import { Button } from 'antd'
import { CheckSquareOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { useNow } from 'common/hooks/use-now'
import { ErrorState, ListSkeleton, PageHeader, WarningItem } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { MarkPaidModal } from 'entities/finance'
import { StudentDrawer } from 'entities/students'
import { RenewSubModal } from 'entities/students/subscriptions/renew-sub-modal'
import {
  AddToTrainingModal,
  CalendarTrainingModal,
  ensureIndividualGroup,
  GroupTrainingModal,
  IndividualSessionModal,
  PairSessionModal,
  TrainingTypeModal,
} from 'entities/trainings'

import { buildAgendaItems, minutesOfDay } from './agenda-model'
import { KpiDetailModal } from './kpi-detail-modal'
import { KpiStrip } from './kpi-strip'
import { MarkTodayModal } from './mark-today-modal'
import { QuickMarkSheet } from './quick-mark-sheet'
import { TodayAgenda } from './today-agenda'
import { UnpaidSubsModal } from './unpaid-subs-modal'
import { useHomePage } from './use-home-page'
import { useUnpaidSubs } from './use-unpaid-subs'

import type { QuickMarkTarget } from './quick-mark-sheet'
import type { UnpaidSub } from './use-unpaid-subs'
import type { CalendarBlock, Training } from 'entities/trainings'

import './home-page.scss'
import dayjs from 'dayjs'

export function HomePage() {
  const { t } = useTranslation()
  const page = useHomePage()
  const { unpaid, count: unpaidCount } = useUnpaidSubs()

  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [paying, setPaying] = useState<UnpaidSub | null>(null)
  const [unpaidOpen, setUnpaidOpen] = useState(false)
  const [renew, setRenew] = useState<{ studentId: string; groupId: string } | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [indOpen, setIndOpen] = useState(false)
  const [onlineOpen, setOnlineOpen] = useState(false)
  const [pairOpen, setPairOpen] = useState(false)
  const [indGroupId, setIndGroupId] = useState<string | null>(null)
  const [addTarget, setAddTarget] = useState<Training | null>(null)
  const [calBlock, setCalBlock] = useState<CalendarBlock | null>(null)
  const [quickMark, setQuickMark] = useState<QuickMarkTarget | null>(null)

  const pickIndividual = async () => {
    const g = await ensureIndividualGroup()
    setIndGroupId(g.name)
    setTypeOpen(false)
    setIndOpen(true)
  }

  const pickOnline = async () => {
    const g = await ensureIndividualGroup()
    setIndGroupId(g.name)
    setTypeOpen(false)
    setOnlineOpen(true)
  }

  const pickPair = async () => {
    const g = await ensureIndividualGroup()
    setIndGroupId(g.name)
    setTypeOpen(false)
    setPairOpen(true)
  }

  const renewStudent = page.students.find((s) => s.id === renew?.studentId)

  const handleOpenMarkToday = () => page.setMarkTodayOpen(true)
  const handleOpenType = () => setTypeOpen(true)
  const handleOpenUnpaid = () => setUnpaidOpen(true)
  const handleCloseUnpaid = () => setUnpaidOpen(false)

  const handleOpenStudentDrawer = (id: string) => () => setDrawerId(id)
  const handleRenewWarning =
    (studentId: string, groupId: string) => (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      setRenew({ studentId, groupId })
    }
  const handlePayUnpaid = (u: UnpaidSub) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setPaying(u)
  }
  const handleClosePaying = () => setPaying(null)

  const handleCloseKpi = () => page.setKpiType(null)
  const handleRenew = (studentId: string, groupId: string) => setRenew({ studentId, groupId })
  const handleCloseMarkToday = () => page.setMarkTodayOpen(false)

  const handleCloseType = () => setTypeOpen(false)
  const handlePickGroup = () => {
    setTypeOpen(false)
    setGroupOpen(true)
  }
  const handleCloseGroup = () => setGroupOpen(false)
  const handleCloseInd = () => setIndOpen(false)
  const handleCloseOnline = () => setOnlineOpen(false)
  const handleClosePair = () => setPairOpen(false)
  const handleCloseAdd = () => setAddTarget(null)
  const handleCloseCalBlock = () => setCalBlock(null)
  const handleQuickMark = (block: CalendarBlock) =>
    setQuickMark({
      groupId: block.groupId,
      trainingId: block.trainingId,
      isInd: block.isInd,
      time: block.time,
      label: block.label,
      date: todayISO(),
    })
  const handleCloseQuickMark = () => setQuickMark(null)
  const handleCloseDrawer = () => setDrawerId(null)
  const handleEditNoop = () => {}
  const handleCloseRenew = () => setRenew(null)

  const now = useNow()

  // «Чт, 11 июня» над приветствием — dayjs локализован через i18n.
  const dateLine = dayjs(now).format('dd, D MMMM')
  const overline = `${dateLine.charAt(0).toUpperCase()}${dateLine.slice(1)}`
  const hour = now.getHours()
  const greeting =
    hour >= 5 && hour < 12
      ? t('home.greetingMorning')
      : hour < 18
        ? t('home.greetingDay')
        : hour < 23
          ? t('home.greetingEvening')
          : t('home.greetingNight')

  const agendaItems = useMemo(
    () => buildAgendaItems(page.agendaBlocks, page.trainings, page.groups),
    [page.agendaBlocks, page.trainings, page.groups],
  )
  const doneCount = agendaItems.filter((it) => it.endMin <= minutesOfDay(now)).length

  const renderWarning = (w: (typeof page.warnings)[number]) => (
    <WarningItem
      key={`${w.student.id}-${w.groupId}`}
      name={w.student.name}
      detail={`${page.indNames.includes(w.groupId) ? t('home.indTraining') : w.groupId} · ${w.status.label}`}
      danger={w.status.type === 'expired'}
      onClick={handleOpenStudentDrawer(w.student.id)}
      action={
        <Button
          className="tk-btn-primary"
          size="small"
          onClick={handleRenewWarning(w.student.id, w.groupId)}
        >
          {t('home.extend')}
        </Button>
      }
    />
  )

  return (
    <div className="home-header">
      <PageHeader
        title={greeting}
        overline={overline}
        actions={
          <>
            {/* При нуле кнопка не исчезает (выглядит как пропажа функции), а
                становится спокойным «✓ Всё оплачено». */}
            {/* Десктоп: оба вспомогательных действия нейтральные, у оплат —
                янтарный счётчик; единственная контрастная кнопка — «+ Занятие». */}
            {unpaidCount > 0 ? (
              <Button
                className="tk-btn-secondary"
                icon={<DollarOutlined />}
                onClick={handleOpenUnpaid}
              >
                <span className="btn-label--full">{t('home.unpaidModal.title')}</span>
                <span className="home-unpaid-count tk-num">{unpaidCount}</span>
              </Button>
            ) : (
              <Button className="tk-btn-secondary" disabled>
                <span className="btn-label--full">{t('home.allPaid')}</span>
                <span className="btn-label--short">✓</span>
              </Button>
            )}
            <Button
              className="tk-btn-secondary"
              icon={<CheckSquareOutlined />}
              onClick={handleOpenMarkToday}
            >
              <span className="btn-label--full">{t('home.markToday')}</span>
              <span className="btn-label--short">{t('home.markTodayShort')}</span>
            </Button>
            <Button
              className="tk-btn-primary"
              icon={<PlusOutlined />}
              onClick={handleOpenType}
            >
              <span className="btn-label--full">{t('home.recordTraining')}</span>
              <span className="btn-label--short">{t('home.recordTrainingShort')}</span>
            </Button>
          </>
        }
      />

      {/* Мобайл: «+» остаётся иконкой в шапке, главные действия — пилюлями
          отдельной строкой (на десктопе блок скрыт, кнопки живут в шапке). */}
      <div className="home-actions">
        {/* Тот же нейтральный стиль, что у десктопной кнопки в шапке, —
            «Отметить день» выглядит одинаково на телефоне и десктопе. */}
        <Button
          className="tk-btn-secondary home-actions__mark"
          icon={<CheckSquareOutlined />}
          onClick={handleOpenMarkToday}
        >
          {t('home.markToday')}
        </Button>
        {unpaidCount > 0 ? (
          <Button className="btn-unpaid" icon={<DollarOutlined />} onClick={handleOpenUnpaid}>
            {t('home.paymentsShort')}
            <span className="home-actions__count">{unpaidCount}</span>
          </Button>
        ) : (
          <Button className="btn-unpaid" disabled>
            {t('home.allPaid')}
          </Button>
        )}
      </div>

      {page.kpis && (
        // Проблемные показатели первыми: тренер сперва видит, где беда.
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <KpiStrip kpis={page.kpis} onSelect={page.setKpiType} />
        </div>
      )}

      <div className="home-cols">
        <section className="home-cols__col">
          <div className="section-title">
            {t('home.today')}
            {agendaItems.length > 0 && (
              <span className="section-title__count">
                {doneCount}/{agendaItems.length}
              </span>
            )}
          </div>
          {page.isLoading ? (
            <ListSkeleton rows={2} />
          ) : page.isError ? (
            <ErrorState onRetry={page.refetch} />
          ) : (
            <TodayAgenda
              items={agendaItems}
              students={page.students}
              now={now}
              onRowClick={setCalBlock}
              onCreate={handleOpenType}
              onQuickMark={handleQuickMark}
            />
          )}
        </section>

        <section className="home-cols__col">
          <div className="section-title">
            {page.warnings.length || unpaid.length ? t('home.attention') : t('home.subStatus')}
          </div>
          {page.warnings.length || unpaid.length ? (
            <div className="warning-list">
              {/* Серьёзность по убыванию: истёкшие → неоплаченные → заканчивающиеся. */}
              {page.warnings
                .filter((w) => w.status.type === 'expired')
                .map(renderWarning)}
              {unpaid.map((u) => (
                <WarningItem
                  key={`unpaid-${u.sub.id}`}
                  name={u.student.name}
                  detail={`${u.isIndividual ? t('home.indTraining') : u.groupId} · ${t('home.attentionUnpaid')}`}
                  onClick={handleOpenStudentDrawer(u.student.id)}
                  action={
                    <Button
                      className="tk-btn-secondary"
                      size="small"
                      onClick={handlePayUnpaid(u)}
                    >
                      {t('students.subCard.markPaid')}
                    </Button>
                  }
                />
              ))}
              {page.warnings
                .filter((w) => w.status.type !== 'expired')
                .map(renderWarning)}
            </div>
          ) : (
            <div className="home-empty-card home-empty-card--ok">{t('home.allSubsOk')}</div>
          )}
        </section>
      </div>

      <KpiDetailModal
        kpiType={page.kpiType}
        students={page.students}
        trainings={page.trainings}
        warnings={page.warnings}
        indNames={page.indNames}
        regularNames={page.regularNames}
        onClose={handleCloseKpi}
        onOpenStudent={setDrawerId}
        onRenew={handleRenew}
      />

      <MarkTodayModal
        open={page.markTodayOpen}
        onClose={handleCloseMarkToday}
      />

      <QuickMarkSheet target={quickMark} onClose={handleCloseQuickMark} />

      <UnpaidSubsModal open={unpaidOpen} onClose={handleCloseUnpaid} />

      <TrainingTypeModal
        open={typeOpen}
        onClose={handleCloseType}
        onPickGroup={handlePickGroup}
        onPickIndividual={pickIndividual}
        onPickOnline={pickOnline}
        onPickPair={pickPair}
      />
      <GroupTrainingModal open={groupOpen} onClose={handleCloseGroup} />
      {indGroupId && (
        <IndividualSessionModal
          open={indOpen}
          indGroupId={indGroupId}
          onClose={handleCloseInd}
        />
      )}
      {indGroupId && (
        <IndividualSessionModal
          open={onlineOpen}
          indGroupId={indGroupId}
          onClose={handleCloseOnline}
          isOnline
        />
      )}
      {indGroupId && (
        <PairSessionModal
          open={pairOpen}
          indGroupId={indGroupId}
          onClose={handleClosePair}
        />
      )}

      <CalendarTrainingModal
        open={!!calBlock}
        block={calBlock}
        onClose={handleCloseCalBlock}
        onAddStudent={setAddTarget}
      />

      <AddToTrainingModal
        open={!!addTarget}
        training={addTarget}
        onClose={handleCloseAdd}
      />

      <StudentDrawer
        studentId={drawerId}
        onClose={handleCloseDrawer}
        onEdit={handleEditNoop}
      />

      {renew && renewStudent && (
        <RenewSubModal
          open
          studentId={renew.studentId}
          studentName={renewStudent.name}
          groupId={renew.groupId}
          onClose={handleCloseRenew}
        />
      )}

      {paying && (
        <MarkPaidModal
          open
          student={paying.student}
          sub={paying.sub}
          isIndividual={paying.isIndividual}
          onClose={handleClosePaying}
        />
      )}
    </div>
  )
}
