import { useState } from 'react'

import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ListSkeleton, PageHeader } from 'common/ui'
import { GroupDetail, GroupFormModal, GroupList } from 'entities/groups'
import { StudentDrawer, StudentFormModal, useStudents } from 'entities/students'

import { useGroupsPage } from './use-groups-page'

export function GroupsPage() {
  const { t } = useTranslation()
  const page = useGroupsPage()
  const { data: students = [] } = useStudents()

  // Дровер ученика, открываемый из карточки в деталях группы (раньше клик был
  // мёртвым — onOpenStudent={() => {}}); правка карандашом — через ту же форму.
  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [studentFormKey, setStudentFormKey] = useState(0)
  const editStudent = students.find((s) => s.id === editId) ?? null

  const handleBack = () => page.setOpenedGroup(null)
  const handleCloseDrawer = () => setDrawerId(null)
  const handleEditStudent = (id: string) => {
    setDrawerId(null)
    setEditId(id)
    setStudentFormKey((k) => k + 1)
  }
  const handleCloseStudentForm = () => setEditId(null)

  if (page.openedGroup) {
    return (
      <>
        <GroupDetail
          group={page.openedGroup}
          onBack={handleBack}
          onEdit={page.openEdit}
          onOpenStudent={setDrawerId}
        />
        <GroupFormModal
          key={page.formKey}
          open={page.formOpen}
          group={page.formGroup}
          onClose={page.closeForm}
          onDelete={page.handleDelete}
        />
        <StudentDrawer
          studentId={drawerId}
          onClose={handleCloseDrawer}
          onEdit={handleEditStudent}
        />
        <StudentFormModal
          key={studentFormKey}
          open={!!editId}
          student={editStudent}
          onClose={handleCloseStudentForm}
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
