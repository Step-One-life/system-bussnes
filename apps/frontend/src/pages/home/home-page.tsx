import { useState } from 'react'

import { Button } from 'antd'
import {
  AlertOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  PlusOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'

import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import { ErrorState, KpiCard, ListSkeleton, PageHeader, WarningItem } from 'common/ui'
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

import { KpiDetailModal } from './kpi-detail-modal'
import { MarkTodayModal } from './mark-today-modal'
import { TodayAgenda } from './today-agenda'
import { UnpaidSubsModal } from './unpaid-subs-modal'
import { useHomePage } from './use-home-page'
import { useUnpaidSubs } from './use-unpaid-subs'

import type { UnpaidSub } from './use-unpaid-subs'
import type { CalendarBlock, Training } from 'entities/trainings'

import './home-page.scss'

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

  const handleSelectTotal = () => page.setKpiType('total')
  const handleSelectMonth = () => page.setKpiType('month')
  const handleSelectEnding = () => page.setKpiType('ending')
  const handleSelectExpired = () => page.setKpiType('expired')

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
  const handleCloseDrawer = () => setDrawerId(null)
  const handleEditNoop = () => {}
  const handleCloseRenew = () => setRenew(null)

  // «Четверг, 11 июня · 3 тренировки» — dayjs локализован через i18n.
  const dateLine = dayjs().format('dddd, D MMMM')
  const subtitle = `${dateLine.charAt(0).toUpperCase()}${dateLine.slice(1)} · ${t(
    'home.trainingsCount',
    { count: page.agendaBlocks.length },
  )}`

  const renderWarning = (w: (typeof page.warnings)[number]) => (
    <WarningItem
      key={`${w.student.id}-${w.groupId}`}
      name={w.student.name}
      detail={`${page.indNames.includes(w.groupId) ? t('home.indTraining') : w.groupId} · ${w.status.label}`}
      danger={w.status.type === 'expired'}
      onClick={handleOpenStudentDrawer(w.student.id)}
      action={
        <Button
          type="primary"
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
        title={t('nav.home')}
        subtitle={subtitle}
        actions={
          <>
            {/* При нуле кнопка не исчезает (выглядит как пропажа функции), а
                становится спокойным «✓ Всё оплачено». */}
            {unpaidCount > 0 ? (
              <Button
                className="btn-unpaid"
                icon={<DollarOutlined />}
                onClick={handleOpenUnpaid}
              >
                <span className="btn-label--full">
                  {t('home.unpaidCount', { count: unpaidCount })}
                </span>
                <span className="btn-label--short">{unpaidCount}</span>
              </Button>
            ) : (
              <Button className="btn-unpaid" disabled>
                <span className="btn-label--full">{t('home.allPaid')}</span>
                <span className="btn-label--short">✓</span>
              </Button>
            )}
            <Button
              className="btn-mark"
              icon={<CheckSquareOutlined />}
              onClick={handleOpenMarkToday}
            >
              <span className="btn-label--full">{t('home.markToday')}</span>
              <span className="btn-label--short">{t('home.markTodayShort')}</span>
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenType}>
              <span className="btn-label--full">{t('home.recordTraining')}</span>
              <span className="btn-label--short">{t('home.recordTrainingShort')}</span>
            </Button>
          </>
        }
      />

      {/* Мобайл: «+» остаётся иконкой в шапке, главные действия — пилюлями
          отдельной строкой (на десктопе блок скрыт, кнопки живут в шапке). */}
      <div className="home-actions">
        <Button
          className="btn-mark"
          icon={<CheckSquareOutlined />}
          onClick={handleOpenMarkToday}
        >
          {t('home.markToday')}
        </Button>
        {unpaidCount > 0 ? (
          <Button className="btn-unpaid" icon={<DollarOutlined />} onClick={handleOpenUnpaid}>
            {t('home.unpaidModal.title')}
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
        <div className="kpi-grid" style={{ marginBottom: 'var(--sp-6)' }}>
          <KpiCard
            label={t('home.kpiExpired')}
            value={page.kpis.expired}
            icon={<AlertOutlined />}
            variant="danger"
            dimZero
            onClick={handleSelectExpired}
          />
          <KpiCard
            label={t('home.kpiEnding')}
            value={page.kpis.ending}
            icon={<WarningOutlined />}
            variant="warn"
            dimZero
            onClick={handleSelectEnding}
          />
          <KpiCard
            label={t('home.kpiMonth')}
            value={page.kpis.monthTrainings}
            icon={<CalendarOutlined />}
            variant="ok"
            dimZero
            onClick={handleSelectMonth}
          />
          <KpiCard
            label={t('home.kpiTotal')}
            value={page.kpis.total}
            icon={<TeamOutlined />}
            variant="accent"
            dimZero
            onClick={handleSelectTotal}
          />
        </div>
      )}

      <div className="home-cols">
        <section className="home-cols__col">
          <div className="section-title">{t('home.trainingsToday')}</div>
          {page.isLoading ? (
            <ListSkeleton rows={2} />
          ) : page.isError ? (
            <ErrorState onRetry={page.refetch} />
          ) : (
            <TodayAgenda
              rows={page.agendaBlocks}
              trainings={page.trainings}
              groups={page.groups}
              students={page.students}
              onRowClick={setCalBlock}
              onCreate={handleOpenType}
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
                    <Button size="small" onClick={handlePayUnpaid(u)}>
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
