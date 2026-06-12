import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ListSkeleton, PageHeader } from 'common/ui'
import { GroupDetail, GroupFormModal, GroupList } from 'entities/groups'

import { useGroupsPage } from './use-groups-page'

export function GroupsPage() {
  const { t } = useTranslation()
  const page = useGroupsPage()

  const handleBack = () => page.setOpenedGroup(null)
  const handleOpenStudentNoop = () => {}

  if (page.openedGroup) {
    return (
      <>
        <GroupDetail
          group={page.openedGroup}
          onBack={handleBack}
          onEdit={page.openEdit}
          onOpenStudent={handleOpenStudentNoop}
        />
        <GroupFormModal
          key={page.formKey}
          open={page.formOpen}
          group={page.formGroup}
          onClose={page.closeForm}
          onDelete={page.handleDelete}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('nav.groups')}
        actions={
          <Button className="tk-btn-primary" icon={<PlusOutlined />} onClick={page.openCreate}>
            {t('groups.create')}
          </Button>
        }
      />

      {page.isLoading ? (
        <ListSkeleton rows={3} />
      ) : page.regularGroups.length ? (
        <GroupList
          groups={page.regularGroups}
          onOpen={page.setOpenedGroup}
          onEdit={page.openEdit}
        />
      ) : (
        <EmptyState title={t('groups.empty')} text={t('groups.emptyText')} />
      )}

      <GroupFormModal
        key={page.formKey}
        open={page.formOpen}
        group={page.formGroup}
        onClose={page.closeForm}
        onDelete={page.handleDelete}
      />
    </div>
  )
}
