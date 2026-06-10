import { useState } from 'react'

import { Button } from 'antd'
import { UserAddOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'

import { EmptyState, ListSkeleton, PageHeader } from 'common/ui'
import { useGroups } from 'entities/groups'
import {
  StudentDrawer,
  StudentFormModal,
  StudentList,
  StudentToolbar,
  useStudentFilter,
  useStudents,
} from 'entities/students'

export function StudentsPage() {
  const { t } = useTranslation()
  const { data: students = [], isLoading } = useStudents()
  const { data: groups = [] } = useGroups()
  const { filter, setFilter, filtered, hasActiveFilter } = useStudentFilter(students)

  const [drawerId, setDrawerId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  // formKey меняется при каждом открытии формы, чтобы React пересоздал
  // StudentFormModal и useState внутри инициализировался свежими данными.
  const [formKey, setFormKey] = useState(0)

  const indNames = groups.filter((g) => g.isIndividual).map((g) => g.name)
  const groupNames = groups.map((g) => g.name)
  const editStudent = students.find((s) => s.id === editId) ?? null

  const openCreate = () => {
    setEditId(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const openEdit = (id: string) => {
    setDrawerId(null)
    setEditId(id)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const handleCloseDrawer = () => setDrawerId(null)
  const handleCloseForm = () => setFormOpen(false)

  return (
    <div>
      <PageHeader
        title={t('nav.students')}
        subtitle={t('students.count', { count: filtered.length })}
        actions={
          <Button type="primary" icon={<UserAddOutlined />} onClick={openCreate}>
            {t('students.add')}
          </Button>
        }
      />

      <StudentToolbar filter={filter} onChange={setFilter} groupNames={groupNames} />

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length ? (
        <StudentList students={filtered} indNames={indNames} onOpen={setDrawerId} />
      ) : (
        <EmptyState
          title={t('students.notFound')}
          text={hasActiveFilter ? t('students.tryFilters') : t('students.addFirst')}
        />
      )}

      <StudentDrawer studentId={drawerId} onClose={handleCloseDrawer} onEdit={openEdit} />

      <StudentFormModal
        key={formKey}
        open={formOpen}
        student={editStudent}
        onClose={handleCloseForm}
      />
    </div>
  )
}
