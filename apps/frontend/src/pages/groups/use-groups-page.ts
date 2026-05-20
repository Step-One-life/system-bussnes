import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

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
  const { data: groups = [] } = useGroups()
  const deleteGroup = useDeleteGroup()

  const [openedGroup, setOpenedGroup] = useState<Group | null>(null)
  const [formGroup, setFormGroup] = useState<Group | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const regularGroups = groups.filter((g) => !g.isIndividual)

  const openCreate = () => {
    setFormGroup(null)
    setFormOpen(true)
  }

  const openEdit = (group: Group) => {
    setFormGroup(group)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    // keep openedGroup in sync after edit
    if (openedGroup) {
      const fresh = groups.find((g) => g.id === openedGroup.id)
      if (fresh) setOpenedGroup(fresh)
    }
  }

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
    openedGroup,
    setOpenedGroup,
    formGroup,
    formOpen,
    openCreate,
    openEdit,
    closeForm,
    handleDelete,
  }
}
