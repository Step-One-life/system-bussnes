import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useSearchParams } from 'react-router-dom'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { useDeleteGroup, useGroups } from 'entities/groups'
import { studentKeys } from 'entities/students/api/use-students'
import { getStudents, updateStudent } from 'entities/students/model/students.repo'

import type { Group } from 'entities/groups'

export function useGroupsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const toast = useToast()
  const { data: groups = [], isLoading } = useGroups()
  const deleteGroup = useDeleteGroup()

  // Открытая группа живёт в URL (?group=<id>): браузерное «назад» возвращает
  // к списку, а обновление страницы не теряет открытую деталь. Сам объект
  // всегда берётся из свежего списка групп — после редактирования не устаревает.
  const [searchParams, setSearchParams] = useSearchParams()
  const openedGroup = groups.find((g) => g.id === searchParams.get('group')) ?? null
  const setOpenedGroup = (group: Group | null) =>
    setSearchParams(group ? { group: group.id } : {})
  const [formGroup, setFormGroup] = useState<Group | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  // formKey меняется при каждом открытии формы (новая или другая группа),
  // что заставляет React пересоздать GroupFormModal и сбросить состояние полей.
  const [formKey, setFormKey] = useState(0)

  const regularGroups = groups.filter((g) => !g.isIndividual)

  const openCreate = () => {
    setFormGroup(null)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const openEdit = (group: Group) => {
    setFormGroup(group)
    setFormKey((k) => k + 1)
    setFormOpen(true)
  }

  const closeForm = () => setFormOpen(false)

  const handleDelete = async (group: Group) => {
    await deleteGroup.mutateAsync(group.id)
    const students = await getStudents()
    for (const s of students) {
      if (s.groups.includes(group.name)) {
        await updateStudent(s.id, { groups: s.groups.filter((g) => g !== group.name) })
      }
    }
    qc.invalidateQueries({ queryKey: studentKeys.all })
    toast({ type: 'success', title: t('groups.deleted'), msg: group.name })
    setFormOpen(false)
    setOpenedGroup(null)
  }

  return {
    regularGroups,
    isLoading,
    openedGroup,
    setOpenedGroup,
    formGroup,
    formOpen,
    formKey,
    openCreate,
    openEdit,
    closeForm,
    handleDelete,
  }
}
