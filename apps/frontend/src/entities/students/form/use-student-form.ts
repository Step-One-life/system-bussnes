import { useMemo, useState } from 'react'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { resolvePricingRule, subTypeToTuple } from 'entities/finance/lib/pricing-lookup'
import { useGroups } from 'entities/groups/api/use-groups'

import { useAddSubscription, useCreateStudent, useUpdateStudent } from '../api/use-students'

import type { Student, SubscriptionType } from '../model/types'

interface UseStudentFormOptions {
  student: Student | null
  onDone: () => void
}

/** Map of groupId → chosen subscription type (empty = none). */
type SubChoice = Record<string, SubscriptionType | ''>

export function useStudentForm({ student, onDone }: UseStudentFormOptions) {
  const { t } = useTranslation()
  const isEdit = !!student
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const addSubscription = useAddSubscription()

  const regularGroups = useMemo(() => groups.filter((g) => !g.isIndividual), [groups])
  const indGroup = useMemo(
    () =>
      groups.find((g) => g.isIndividual && g.name === 'Индивидуальные') ??
      groups.find((g) => g.isIndividual) ??
      null,
    [groups],
  )

  const [name, setName] = useState(student?.name ?? '')
  const [selectedGroups, setSelectedGroups] = useState<string[]>(student?.groups ?? [])
  const [subChoice, setSubChoice] = useState<SubChoice>({})
  const [subStartDate, setSubStartDate] = useState(todayISO())

  const saving =
    createStudent.isPending || updateStudent.isPending || addSubscription.isPending

  const toggleGroup = (group: string, on: boolean) => {
    setSelectedGroups((prev) => (on ? [...prev, group] : prev.filter((g) => g !== group)))
  }

  const submit = async () => {
    if (!name.trim()) {
      toast({ type: 'error', title: t('students.nameRequired') })
      return
    }
    try {
      if (isEdit) {
        await updateStudent.mutateAsync({
          id: student.id,
          changes: { name: name.trim(), groups: selectedGroups },
        })
        toast({ type: 'success', title: t('students.updated'), msg: name.trim() })
      } else {
        const created = await createStudent.mutateAsync({
          name: name.trim(),
          groups: selectedGroups,
        })
        for (const [groupId, type] of Object.entries(subChoice)) {
          if (type && selectedGroups.includes(groupId)) {
            const group = groups.find((g) => g.name === groupId) ?? null
            const isIndividual = group?.isIndividual ?? false
            const { rule } = await resolvePricingRule(
              group?.locationId ?? null,
              subTypeToTuple(type, isIndividual),
            )
            await addSubscription.mutateAsync({
              studentId: created.id,
              data: { groupId, type, createdAt: subStartDate, validityDays: rule?.validity_days },
            })
          }
        }
        toast({ type: 'success', title: t('students.added'), msg: name.trim() })
      }
      onDone()
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('common.error') })
    }
  }

  return {
    isEdit,
    regularGroups,
    indGroup,
    name,
    setName,
    selectedGroups,
    toggleGroup,
    subChoice,
    setSubChoice,
    subStartDate,
    setSubStartDate,
    saving,
    submit,
  }
}
