import { useMemo, useRef, useState } from 'react'

import { Button } from 'antd'
import { CheckSquareOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { useNow } from 'common/hooks/use-now'
import { ErrorState, ListSkeleton, PageHeader, WarningItem } from 'common/ui'
import { formatDateShort, todayISO, yesterdayISO } from 'common/utils/date'
import { isLinkablePhone, waHref } from 'common/utils/phone-links'
import { OnboardingChecklist } from 'entities/onboarding'
import { StudentDrawer } from 'entities/students'

import { buildAgendaItems, minutesOfDay } from './agenda-model'
import { HomeModals } from './home-modals'
import { KpiStrip } from './kpi-strip'
import { TodayAgenda } from './today-agenda'
import { useHomePage } from './use-home-page'
import { useUnpaidSubs } from './use-unpaid-subs'

import type { HomeModal } from './home-modals'
import type { UnpaidSub } from './use-unpaid-subs'
import type { CalendarBlock } from 'entities/trainings'

import './home-page.scss'
import dayjs from 'dayjs'

export function HomePage() {
  const { t } = useTranslation()
  const page = useHomePage()
  const { unpaid, count: unpaidCount } = useUnpaidSubs()

  // Всё модальное состояние страницы — одна переменная: какая модалка открыта
  // и с какими данными (см. HomeModal). Отдельно только шторка ученика — она
  // сосуществует с модалками (например, открывается из KPI-детализации).
  const [modal, setModal] = useState<HomeModal | null>(null)
  // Последняя открывавшаяся: при закрытии modal сразу null, а payload отсюда
  // ещё нужен antd на время фейда закрытия.
  const [lastModal, setLastModal] = useState<HomeModal | null>(null)
  const [drawerId, setDrawerId] = useState<string | null>(null)
  // Счётчик открытий формы ученика: key пересоздаёт форму со свежими данными.
  const formSeq = useRef(0)

  const openModal = (m: HomeModal) => {
    setModal(m)
    setLastModal(m)
  }
  const handleCloseModal = () => setModal(null)

  const handleOpenMarkToday = () => openModal({ kind: 'close-day', date: todayISO() })
  const handleOpenYesterday = () => openModal({ kind: 'close-day', date: yesterdayISO() })
  const handleOpenYesterdayBtn = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    handleOpenYesterday()
  }
  const handleOpenType = () => openModal({ kind: 'type-picker' })
  const handleOpenUnpaid = () => openModal({ kind: 'unpaid' })

  const handleOpenStudentDrawer = (id: string) => () => setDrawerId(id)
  const handleRenewWarning =
    (studentId: string, groupId: string) => (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      openModal({ kind: 'renew', studentId, groupId })
    }
  const handlePayUnpaid = (u: UnpaidSub) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    openModal({ kind: 'mark-paid', sub: u })
  }
  // «Пропавшему» пишем в WhatsApp с готовым мягким текстом (кнопка есть
  // только при пригодном для ссылок телефоне).
  const handleWriteLapsed =
    (name: string, phone: string) => (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      window.open(waHref(phone, t('home.lapsedWaText', { name })), '_blank', 'noopener')
    }

  const handleRowClick = (block: CalendarBlock) => openModal({ kind: 'calendar', block })
  const handleQuickMark = (block: CalendarBlock) =>
    openModal({
      kind: 'quick-mark',
      target: {
        groupId: block.groupId,
        trainingId: block.trainingId,
        isInd: block.isInd,
        time: block.time,
        label: block.label,
        date: todayISO(),
      },
    })
  const handleCloseDrawer = () => setDrawerId(null)
  // Редактирование ученика из шторки: шторка закрывается, форма открывается
  // со свежим ключом (seq) — пересоздание сбрасывает прошлый черновик.
  const handleEditStudent = (id: string) => {
    setDrawerId(null)
    formSeq.current += 1
    openModal({ kind: 'student-form', editId: id, seq: formSeq.current })
  }

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
          <KpiStrip kpis={page.kpis} onSelect={(type) => openModal({ kind: 'kpi', type })} />
        </div>
      )}

      <OnboardingChecklist />

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
              onRowClick={handleRowClick}
              onCreate={handleOpenType}
              onQuickMark={handleQuickMark}
            />
          )}
        </section>

        <section className="home-cols__col">
          <div className="section-title">
            {page.warnings.length ||
            unpaid.length ||
            page.lapsed.length ||
            page.yesterdayUnmarked > 0
              ? t('home.attention')
              : t('home.subStatus')}
          </div>
          {page.warnings.length ||
          unpaid.length ||
          page.lapsed.length ||
          page.yesterdayUnmarked > 0 ? (
            <div className="warning-list">
              {/* Серьёзность по убыванию: истёкшие → вчера → неоплаченные → заканчивающиеся. */}
              {page.warnings
                .filter((w) => w.status.type === 'expired')
                .map(renderWarning)}
              {page.yesterdayUnmarked > 0 && (
                <WarningItem
                  name={t('home.attentionYesterday', { count: page.yesterdayUnmarked })}
                  detail={formatDateShort(yesterdayISO())}
                  onClick={handleOpenYesterday}
                  action={
                    <Button
                      className="tk-btn-secondary"
                      size="small"
                      onClick={handleOpenYesterdayBtn}
                    >
                      {t('home.closeYesterdayBtn')}
                    </Button>
                  }
                />
              )}
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
              {/* Радар оттока: давно не появлялся / так и не пришёл. */}
              {page.lapsed.map((l) => (
                <WarningItem
                  key={`lapsed-${l.student.id}`}
                  name={l.student.name}
                  detail={
                    l.neverVisited
                      ? t('home.lapsedNever')
                      : t('home.lapsedDays', { count: l.daysSince })
                  }
                  onClick={handleOpenStudentDrawer(l.student.id)}
                  action={
                    isLinkablePhone(l.student.phone) ? (
                      <Button
                        className="tk-btn-secondary"
                        size="small"
                        onClick={handleWriteLapsed(l.student.name, l.student.phone)}
                      >
                        {t('home.lapsedWrite')}
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="home-empty-card home-empty-card--ok">{t('home.allSubsOk')}</div>
          )}
        </section>
      </div>

      <StudentDrawer
        studentId={drawerId}
        onClose={handleCloseDrawer}
        onEdit={handleEditStudent}
      />

      <HomeModals
        modal={modal}
        lastModal={lastModal}
        onOpen={openModal}
        onClose={handleCloseModal}
        onOpenStudent={setDrawerId}
        students={page.students}
        trainings={page.trainings}
        warnings={page.warnings}
        indNames={page.indNames}
        regularNames={page.regularNames}
      />
    </div>
  )
}
