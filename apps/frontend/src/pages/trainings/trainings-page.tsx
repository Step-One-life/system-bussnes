import { Button } from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ErrorState, ListSkeleton, PageHeader } from 'common/ui'
import {
  AddToTrainingModal,
  CalendarTrainingModal,
  DeleteTrainingModal,
  EditTrainingModal,
  GroupTrainingModal,
  IndividualSessionModal,
  PairSessionModal,
  TrainingCalendar,
  TrainingList,
  TrainingTypeModal,
} from 'entities/trainings'

import { useTrainingsPage } from './use-trainings-page'

import './trainings-page.scss'

export function TrainingsPage() {
  const { t } = useTranslation()
  const page = useTrainingsPage()

  const handleSelectListView = () => page.setView('list')
  const handleSelectCalendarView = () => page.setView('calendar')
  const handleSelectDayMode = () => page.setCalMode('day')
  const handleSelectWeekMode = () => page.setCalMode('week')
  const handleCloseTypeModal = () => page.setTypeModalOpen(false)
  const handleCloseGroupModal = () => page.setGroupModalOpen(false)
  const handleCloseIndModal = () => page.setIndModalOpen(false)
  const handleCloseOnlineModal = () => page.setOnlineModalOpen(false)
  const handleClosePairModal = () => page.setPairModalOpen(false)
  const handleCloseAddTarget = () => page.setAddTarget(null)
  const handleCloseCalendarBlock = () => page.setCalendarBlock(null)
  const handleCloseEdit = () => page.setEditTarget(null)

  return (
    <div>
      <PageHeader
        title={t('trainings.title')}
        subtitle={
          page.view === 'calendar'
            ? t('trainings.weekCount', { count: page.weekCount })
            : t('trainings.recordsCount', { count: page.trainings.length })
        }
        actions={
          <>
            {page.view === 'calendar' && (
              <div className="view-toggle">
                <button
                  className={`view-toggle__btn view-toggle__btn--text${page.calMode === 'day' ? ' view-toggle__btn--active' : ''}`}
                  onClick={handleSelectDayMode}
                >
                  {t('trainings.calendar.modeDay')}
                </button>
                <button
                  className={`view-toggle__btn view-toggle__btn--text${page.calMode === 'week' ? ' view-toggle__btn--active' : ''}`}
                  onClick={handleSelectWeekMode}
                >
                  {t('trainings.calendar.modeWeek')}
                </button>
              </div>
            )}
            <div className="view-toggle">
              <button
                className={`view-toggle__btn${page.view === 'calendar' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewCalendar')}
                aria-label={t('trainings.viewCalendar')}
                onClick={handleSelectCalendarView}
              >
                <CalendarOutlined />
              </button>
              <button
                className={`view-toggle__btn${page.view === 'list' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewList')}
                aria-label={t('trainings.viewList')}
                onClick={handleSelectListView}
              >
                <UnorderedListOutlined />
              </button>
            </div>
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={page.openTypeModal}>
              {t('trainings.record')}
            </Button>
          </>
        }
      />

      {page.isLoading ? (
        <ListSkeleton />
      ) : page.isError ? (
        <ErrorState onRetry={page.refetch} />
      ) : page.view === 'calendar' ? (
        <TrainingCalendar
          trainings={page.trainings}
          students={page.students}
          groups={page.groups}
          mode={page.calMode}
          date={page.calDate}
          onDateChange={page.setCalDate}
          onBlockClick={page.setCalendarBlock}
        />
      ) : page.trainings.length ? (
        <TrainingList
          trainings={page.trainings}
          students={page.students}
          groups={page.groups}
          onAddStudent={page.openAddStudent}
          onRemoveStudent={page.handleRemoveStudent}
          onDelete={page.del.request}
          onEdit={page.openEditTraining}
        />
      ) : (
        <EmptyState
          title={t('trainings.empty')}
          text={t('trainings.emptyText')}
          action={
            <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={page.openTypeModal}>
              {t('home.recordTraining')}
            </Button>
          }
        />
      )}

      <TrainingTypeModal
        open={page.typeModalOpen}
        onClose={handleCloseTypeModal}
        onPickGroup={page.pickGroup}
        onPickIndividual={page.pickIndividual}
        onPickOnline={page.pickOnline}
        onPickPair={page.pickPair}
      />

      <GroupTrainingModal
        open={page.groupModalOpen}
        onClose={handleCloseGroupModal}
      />

      {page.indGroupId && (
        <IndividualSessionModal
          open={page.indModalOpen}
          indGroupId={page.indGroupId}
          onClose={handleCloseIndModal}
        />
      )}

      {page.indGroupId && (
        <IndividualSessionModal
          open={page.onlineModalOpen}
          indGroupId={page.indGroupId}
          onClose={handleCloseOnlineModal}
          isOnline
        />
      )}

      {page.indGroupId && (
        <PairSessionModal
          open={page.pairModalOpen}
          indGroupId={page.indGroupId}
          onClose={handleClosePairModal}
        />
      )}

      <AddToTrainingModal
        open={!!page.addTarget}
        training={page.addTarget}
        onClose={handleCloseAddTarget}
      />

      <CalendarTrainingModal
        open={!!page.calendarBlock}
        block={page.calendarBlock}
        onClose={handleCloseCalendarBlock}
        onAddStudent={page.openAddStudent}
        onEdit={page.openEditTraining}
      />
      <EditTrainingModal
        open={!!page.editTarget}
        training={page.editTarget}
        onClose={handleCloseEdit}
      />
      <DeleteTrainingModal
        training={page.del.target}
        deleting={page.del.deleting}
        onConfirm={page.del.confirm}
        onCancel={page.del.cancel}
      />
    </div>
  )
}
