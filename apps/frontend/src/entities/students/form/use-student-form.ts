import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'

import { useTranslation } from 'react-i18next'

import { useToast } from 'common/ui'
import { todayISO } from 'common/utils/date'
import { financeKeys } from 'entities/finance/api/use-finance'
import { getPricingRules } from 'entities/finance/model/finance.repo'
import { useGroups } from 'entities/groups/api/use-groups'
import { useLocations } from 'entities/locations'

import { useAddSubscription, useCreateStudent, useUpdateStudent } from '../api/use-students'
import { subFromRule, tariffOptions } from './sub-from-rule'

import type { Student } from '../model/types'
import type { LessonKind, PricingRule } from 'entities/finance/model/types'

interface UseStudentFormOptions {
  student: Student | null
  onDone: () => void
}

/** Map of groupName → chosen pricing-rule id (empty = no subscription). */
type SubChoice = Record<string, string>

export function useStudentForm({ student, onDone }: UseStudentFormOptions) {
  const { t } = useTranslation()
  const isEdit = !!student
  const toast = useToast()
  const { data: groups = [] } = useGroups()
  const { data: locations = [] } = useLocations()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const addSubscription = useAddSubscription()

  // Тарифы по всем локациям — каждый дропдаун группы берёт строки своей локации.
  const locationRules = useQueries({
    queries: locations.map((loc) => ({
      queryKey: financeKeys.pricingRules(loc.id),
      queryFn: () => getPricingRules(loc.id),
      enabled: !!loc.id,
    })),
  })
  const rulesByLocation: Record<string, PricingRule[]> = {}
  locations.forEach((loc, i) => {
    rulesByLocation[loc.id] = locationRules[i]?.data ?? []
  })
  const defaultLocId = locations.length
    ? (locations.find((l) => l.isDefault) ?? locations[0]).id
    : ''

  const regularGroups = groups.filter((g) => !g.isIndividual)
  const indGroup =
    groups.find((g) => g.isIndividual && g.name === 'Индивидуальные') ??
    groups.find((g) => g.isIndividual) ??
    null

  /** Активные тарифы для дропдауна конкретной группы (вид занятия + её локация). */
  const optionsForGroup = (groupName: string): PricingRule[] => {
    const g = groups.find((x) => x.name === groupName)
    const locId = g?.locationId ?? defaultLocId
    const kind: LessonKind = g?.isIndividual ? 'individual' : 'group'
    return tariffOptions(rulesByLocation[locId] ?? [], kind)
  }

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
        const ruleById = new Map(
          Object.values(rulesByLocation).flat().map((r) => [r.id, r]),
        )
        for (const [groupName, ruleId] of Object.entries(subChoice)) {
          if (!ruleId || !selectedGroups.includes(groupName)) continue
          const rule = ruleById.get(ruleId)
          if (!rule) continue
          // Создаём только абонемент (без записи дохода) из параметров тарифа.
          await addSubscription.mutateAsync({
            studentId: created.id,
            data: { groupId: groupName, createdAt: subStartDate, ...subFromRule(rule) },
          })
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
    optionsForGroup,
    saving,
    submit,
  }
}
