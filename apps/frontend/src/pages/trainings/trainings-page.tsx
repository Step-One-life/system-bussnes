import { Button } from 'antd'
import {
  CalendarOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, PageHeader } from 'common/ui'
import {
  AddToTrainingModal,
  CalendarTrainingModal,
  GroupTrainingModal,
  IndividualSessionModal,
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
  const handleCloseAddTarget = () => page.setAddTarget(null)
  const handleCloseCalendarBlock = () => page.setCalendarBlock(null)

  return (
    <div>
      <PageHeader
        title={t('trainings.title')}
        subtitle={t('trainings.recordsCount', { count: page.trainings.length })}
        actions={
          <>
            <div className="view-toggle">
              <button
                className={`view-toggle__btn${page.view === 'list' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewList')}
                onClick={handleSelectListView}
              >
                <UnorderedListOutlined />
              </button>
              <button
                className={`view-toggle__btn${page.view === 'calendar' ? ' view-toggle__btn--active' : ''}`}
                title={t('trainings.viewWeek')}
                onClick={handleSelectCalendarView}
              >
                <CalendarOutlined />
              </button>
            </div>
            <Button type="primary" icon={<PlusOutlined />} onClick={page.openTypeModal}>
              {t('trainings.record')}
            </Button>
          </>
        }
      />

      {page.view === 'calendar' ? (
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
        />
      ) : (
        <EmptyState title={t('trainings.empty')} text={t('trainings.emptyText')} />
      )}

      <TrainingTypeModal
        open={page.typeModalOpen}
        onClose={handleCloseTypeModal}
        onPickGroup={page.pickGroup}
        onPickIndividual={page.pickIndividual}
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
      />
    </div>
  )
}
