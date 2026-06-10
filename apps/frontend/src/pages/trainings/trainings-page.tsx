import { Button } from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ListSkeleton, PageHeader } from 'common/ui'
import {
  AddToTrainingModal,
  CalendarTrainingModal,
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
        subtitle={t('trainings.recordsCount', { count: page.trainings.length })}
        actions={
          <>
            <div className="view-toggle">
              <button
                className={`view-toggle__btn${page.view === 'calendar' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewWeek')}
                onClick={handleSelectCalendarView}
              >
                <CalendarOutlined />
              </button>
              <button
                className={`view-toggle__btn${page.view === 'list' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewList')}
                onClick={handleSelectListView}
              >
                <UnorderedListOutlined />
              </button>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={page.openTypeModal}>
              {t('trainings.record')}
            </Button>
          </>
        }
      />

      {page.isLoading ? (
        <ListSkeleton />
      ) : page.view === 'calendar' ? (
        <TrainingCalendar
          trainings={page.trainings}
          students={page.students}
          groups={page.groups}
          onBlockClick={page.setCalendarBlock}
        />
      ) : page.trainings.length ? (
        <TrainingList
          trainings={page.trainings}
          students={page.students}
          groups={page.groups}
          onAddStudent={page.openAddStudent}
          onRemoveStudent={page.handleRemoveStudent}
          onDelete={page.handleDelete}
          onEdit={page.openEditTraining}
        />
      ) : (
        <EmptyState title={t('trainings.empty')} text={t('trainings.emptyText')} />
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
    </div>
  )
}
