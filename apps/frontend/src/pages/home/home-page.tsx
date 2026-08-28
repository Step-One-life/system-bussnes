import { useMemo, useRef, useState } from 'react'

import { Button } from 'antd'
import { CheckSquareOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { useNow } from 'common/hooks/use-now'
import { useTelegramMessage } from 'common/hooks/use-telegram-message'
import { ErrorState, ListSkeleton, PageHeader, QueryState, WarningItem } from 'common/ui'
import { formatDateShort, todayISO, yesterdayISO } from 'common/utils/date'
import { isLinkablePhone } from 'common/utils/phone-links'
import { OnboardingChecklist } from 'entities/onboarding'
import { StudentDrawer } from 'entities/students'

import { buildAgendaItems, minutesOfDay } from './agenda-model'
import { ATTENTION_LIMIT, buildAttentionFeed } from './attention-feed'
import { HomeModals } from './home-modals'
import { KpiStrip } from './kpi-strip'
import { TodayAgenda } from './today-agenda'
import { useHomePage } from './use-home-page'
import { useUnpaidSubs } from './use-unpaid-subs'

import type { AttentionItem, AttentionReason } from './attention-feed'
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
  // Лента внимания показывается по top-5; «Показать ещё» раскрывает остальное.
  const [showAllAttention, setShowAllAttention] = useState(false)
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
  // «Пропавшему» пишем в Telegram по номеру: чат открывается, мягкий текст
  // ложится в буфер (кнопка есть только при пригодном для ссылок телефоне).
  const sendTelegram = useTelegramMessage()
  const handleWriteLapsed =
    (name: string, phone: string) => (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      sendTelegram(phone, t('home.lapsedMsgText', { name }))
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

  // Лента: одна строка на ученика, причины — чипами, действие — одно
  // (первичное по худшей причине).
  const attention = useMemo(
    () => buildAttentionFeed(page.warnings, unpaid, page.lapsed),
    [page.warnings, unpaid, page.lapsed],
  )
  const visibleAttention = showAllAttention ? attention : attention.slice(0, ATTENTION_LIMIT)
  const hiddenAttention = attention.length - visibleAttention.length
  const handleShowAllAttention = () => setShowAllAttention(true)

  const REASON_KEY: Record<AttentionReason, string> = {
    expired: 'home.reasonExpired',
    unpaid: 'home.attentionUnpaid',
    ending: 'home.reasonEnding',
    lapsed: 'home.reasonLapsed',
  }

  const renderAttention = (item: AttentionItem) => {
    // «Давно не был» показываем конкретной подписью («Не был 80 дней»), а не
    // общим чипом — иначе строка дублирует сама себя.
    const parts = item.reasons.filter((r) => r !== 'lapsed').map((r) => t(REASON_KEY[r]))
    if (item.reasons.includes('lapsed')) {
      parts.push(
        item.neverVisited
          ? t('home.lapsedNever')
          : t('home.lapsedDays', { count: item.lapsedDays ?? 0 }),
      )
    }
    const detail = parts.join(' · ')
    return (
      <WarningItem
        key={item.studentId}
        name={item.name}
        detail={detail}
        danger={item.top === 'expired'}
        onClick={handleOpenStudentDrawer(item.studentId)}
        action={renderAttentionAction(item)}
      />
    )
  }

  const renderAttentionAction = (item: AttentionItem) => {
    if (item.top === 'unpaid' && item.unpaid) {
      return (
        <Button className="tk-btn-secondary" size="small" onClick={handlePayUnpaid(item.unpaid)}>
          {t('students.subCard.markPaid')}
        </Button>
      )
    }
    if (item.warning) {
      return (
        <Button
          className="tk-btn-primary"
          size="small"
          onClick={handleRenewWarning(item.studentId, item.warning.groupId)}
        >
          {t('home.extend')}
        </Button>
      )
    }
    if (isLinkablePhone(item.phone)) {
      return (
        <Button
          className="tk-btn-secondary"
          size="small"
          onClick={handleWriteLapsed(item.name, item.phone)}
        >
          {t('home.lapsedWrite')}
        </Button>
      )
    }
    return undefined
  }

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
          {/* Пока ученики грузятся, «в порядке» — ложь: раньше на холодном
              открытии и после смены аккаунта колонка зеленела на 1-2 секунды. */}
          <QueryState
            isPending={page.studentsPending}
            isError={page.studentsError}
            onRetry={page.refetchStudents}
            skeletonRows={3}
            isEmpty={
              !page.warnings.length &&
              !unpaid.length &&
              !page.lapsed.length &&
              page.yesterdayUnmarked === 0
            }
            empty={
              <div className="home-empty-card home-empty-card--ok">{t('home.allSubsOk')}</div>
            }
          >
            <div className="warning-list">
              {/* «Вчера не отмечено» — про день, а не про ученика: отдельной строкой. */}
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
              {/* Одна строка на УЧЕНИКА с чипами причин: раньше он давал до
                  трёх одинаковых плашек, а колонка росла до трёх экранов. */}
              {visibleAttention.map(renderAttention)}
              {hiddenAttention > 0 && (
                <Button
                  type="text"
                  block
                  className="attention-more"
                  onClick={handleShowAllAttention}
                >
                  {t('home.attentionShowMore', { count: hiddenAttention })}
                </Button>
              )}
            </div>
          </QueryState>
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
