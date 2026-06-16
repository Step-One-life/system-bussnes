import { useState } from 'react'

import { Button } from 'antd'
import {
  CalendarOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  TeamOutlined,
  WifiOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, KpiCard, PageHeader, StatusBadge, SubProgressBar, useToast } from 'common/ui'
import { formatDateShort } from 'common/utils/date'
import { getInitials, getSubStatus } from 'entities/students'
import {
  AddToTrainingModal,
  IndividualSessionModal,
  TrainingList,
  useDeleteTrainingWithRestore,
  useRemoveFromTraining,
} from 'entities/trainings'

import { useIndividualPage } from './use-individual-page'

import type { Training } from 'entities/trainings'

import './individual-page.scss'

export function IndividualPage() {
  const { t } = useTranslation()
  const page = useIndividualPage()
  const toast = useToast()
  const removeFromTraining = useRemoveFromTraining()
  const deleteTraining = useDeleteTrainingWithRestore()

  const [addTarget, setAddTarget] = useState<Training | null>(null)

  const handleRemoveStudent = async (training: Training, studentId: string) => {
    await removeFromTraining.mutateAsync({ trainingId: training.id, studentId })
    toast({ type: 'info', title: t('individual.removedFromTraining') })
  }

  const handleDelete = async (training: Training) => {
    const series = training.recurring && !!training.recurringId
    await deleteTraining.mutateAsync({ training, series })
    toast({
      type: 'success',
      title: series ? t('individual.seriesDeleted') : t('individual.trainingDeleted'),
    })
  }

  const handleOpenSession = () => page.setSessionOpen(true)
  const handleCloseSession = () => page.setSessionOpen(false)
  const handleOpenOnlineSession = () => page.setOnlineSessionOpen(true)
  const handleCloseOnlineSession = () => page.setOnlineSessionOpen(false)
  const handleCloseAdd = () => setAddTarget(null)

  if (page.isError) {
    return (
      <div>
        <PageHeader title={t('individual.title')} />
        <ErrorState onRetry={page.refetch} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('individual.title')}
        subtitle={t('individual.subtitle', { count: page.kpis.clients })}
        actions={
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <Button
              icon={<WifiOutlined />}
              disabled={!page.indGroupId}
              onClick={handleOpenOnlineSession}
            >
              {t('individual.recordOnline')}
            </Button>
            <Button
              className="tk-btn-primary"
              icon={<PlusOutlined />}
              disabled={!page.indGroupId}
              onClick={handleOpenSession}
            >
              {t('individual.record')}
            </Button>
          </div>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: 'var(--sp-6)' }}>
        <KpiCard
          label={t('individual.kpiClients')}
          value={page.kpis.clients}
          icon={<TeamOutlined />}
        />
        <KpiCard
          label={t('individual.kpiMonth')}
          value={page.kpis.monthSessions}
          icon={<CalendarOutlined />}
          variant="ok"
        />
        <KpiCard
          label={t('individual.kpiWeek')}
          value={page.kpis.weekSessions}
          icon={<CalendarOutlined />}
        />
        <KpiCard
          label={t('individual.kpiAttention')}
          value={page.kpis.expiring}
          icon={<ExclamationCircleOutlined />}
          variant={page.kpis.expiring > 0 ? 'danger' : 'ok'}
        />
      </div>

      {page.warnings.length > 0 && (
        <>
          <div className="individual-section">{t('individual.attention')}</div>
          <div className="warning-list" style={{ marginBottom: 'var(--sp-6)' }}>
            {page.warnings.map((w) => (
              <div
                key={`${w.student.id}-${w.groupId}`}
                className={`warning-item${w.status.type === 'expired' ? ' warning-item--danger' : ''}`}
              >
                <div className="warning-item__main">
                  <div className="warning-item__name">{w.student.name}</div>
                  <div className="warning-item__detail">
                    {page.indGroupNames.includes(w.groupId)
                      ? t('individual.indTraining')
                      : w.groupId}{' '}
                    · {w.status.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="individual-section">{t('individual.clients')}</div>
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        {page.clients.length ? (
          <div className="ind-clients-list">
            {page.clients.map(({ student, lastVisit }) => {
              const sub =
                student.subscriptions.find(
                  (s) => page.indGroupNames.includes(s.groupId) && s.isActive,
                ) ?? null
              const indGroup = student.groups.find((g) => page.indGroupNames.includes(g))
              return (
                <div key={student.id} className="ind-client-card">
                  <div className="ind-client-card__avatar">{getInitials(student.name)}</div>
                  <div className="ind-client-card__main">
                    <div className="ind-client-card__name">{student.name}</div>
                    <SubProgressBar sub={sub} />
                    <div className="ind-client-card__visit">
                      {lastVisit
                        ? t('individual.session', { date: formatDateShort(lastVisit) })
                        : t('individual.noSessions')}
                    </div>
                  </div>
                  <div className="ind-client-card__side">
                    {indGroup && <StatusBadge status={getSubStatus(student, indGroup)} />}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title={t('individual.noClients')}
            text={t('individual.noClientsText')}
            action={
              <Button
                className="tk-btn-primary"
                icon={<PlusOutlined />}
                disabled={!page.indGroupId}
                onClick={handleOpenSession}
              >
                {t('individual.record')}
              </Button>
            }
          />
        )}
      </div>

      {page.recentSessions.length > 0 && (
        <>
          <div className="individual-section">{t('individual.recentSessions')}</div>
          <TrainingList
            trainings={page.recentSessions}
            students={page.students}
            groups={page.groups}
            onAddStudent={setAddTarget}
            onRemoveStudent={handleRemoveStudent}
            onDelete={handleDelete}
          />
        </>
      )}

      {page.indGroupId && (
        <IndividualSessionModal
          open={page.sessionOpen}
          indGroupId={page.indGroupId}
          onClose={handleCloseSession}
        />
      )}

      {page.indGroupId && (
        <IndividualSessionModal
          open={page.onlineSessionOpen}
          indGroupId={page.indGroupId}
          onClose={handleCloseOnlineSession}
          isOnline
        />
      )}

      <AddToTrainingModal
        open={!!addTarget}
        training={addTarget}
        onClose={handleCloseAdd}
      />
    </div>
  )
}
