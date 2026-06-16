import { useMemo, useState } from 'react'

import { todayISO } from 'common/utils/date'
import { isPrimeTime } from 'entities/trainings/model/training-logic'

import { usePricingRules } from '../api/use-finance'
import { clientTypeToTuple, matchRule } from '../lib/pricing-lookup'

import type { ClientMode, InitialClient } from '../lib/client-field'
import type {
  ClientPaymentType,
  HallCost,
  HallPaymentType,
  Payment,
  TimeSlot,
} from '../model/types'

function today(): string {
  return todayISO()
}

export interface PaymentFormState {
  clientMode: ClientMode
  studentId: string | null
  /** ИМЯ выбранной группы (режим «Группа»). */
  groupId: string | null
  locationId: string | null
  clientType: ClientPaymentType
  clientAmount: number
  hallType: HallPaymentType | ''
  hallAmount: number
  timeSlot: TimeSlot
  date: string
  trainingTime: string
  notes: string
}

interface UsePaymentFormOptions {
  payment?: Payment | null
  hallCost?: HallCost | null
  /** Начальная привязка при редактировании (резолв UUID группы → ИМЯ). */
  initialClient?: InitialClient
}

export function usePaymentForm({ payment, hallCost, initialClient }: UsePaymentFormOptions = {}) {
  const init: InitialClient = initialClient ?? {
    mode: 'student',
    studentId: payment?.student_id ?? null,
    groupName: null,
  }
  const [clientMode, setClientModeState] = useState<ClientMode>(init.mode)
  const [studentId, setStudentIdState] = useState<string | null>(init.studentId)
  const [groupId, setGroupIdState] = useState<string | null>(init.groupName)
  const [locationId, setLocationIdState] = useState<string | null>(
    payment?.location_id ?? hallCost?.location_id ?? null,
  )
  const [clientType, setClientTypeState] = useState<ClientPaymentType>(
    payment?.client_payment_type ?? 'single_individual',
  )
  const [clientAmount, setClientAmount] = useState<number>(payment?.client_amount ?? 0)
  const [hallType, setHallTypeState] = useState<HallPaymentType | ''>(
    hallCost?.hall_payment_type ?? '',
  )
  const [hallAmount, setHallAmount] = useState<number>(hallCost?.hall_amount ?? 0)
  const [timeSlot, setTimeSlotState] = useState<TimeSlot>(hallCost?.time_slot ?? 'regular')
  const [date, setDateState] = useState<string>(payment?.paid_at ?? today())
  const [trainingTime, setTrainingTimeState] = useState<string>(
    hallCost?.training_time ?? '',
  )
  const [notes, setNotes] = useState<string>(payment?.notes ?? '')

  // Tariffs of the chosen location drive the auto-filled prices.
  const { data: rules = [] } = usePricingRules(locationId ?? '')

  const clientPrice = (type: ClientPaymentType, slot: TimeSlot): number => {
    const rule = matchRule(rules, clientTypeToTuple(type))
    if (!rule) return 0
    return slot === 'prime' ? rule.client_prime_price : rule.client_price
  }
  const hallPrice = (type: HallPaymentType, slot: TimeSlot): number => {
    const rule = matchRule(rules, clientTypeToTuple(type))
    if (!rule) return 0
    return slot === 'prime' ? rule.hall_prime_cost : rule.hall_cost
  }

  const setLocationId = (next: string | null) => {
    setLocationIdState(next)
  }

  // Привязка к ученику и к группе взаимоисключающие: выбор одного обнуляет другое.
  const setStudentId = (next: string | null) => {
    setStudentIdState(next)
    if (next) setGroupIdState(null)
  }

  const setGroupId = (next: string | null) => {
    setGroupIdState(next)
    if (next) setStudentIdState(null)
  }

  const setClientMode = (mode: ClientMode) => {
    setClientModeState(mode)
    if (mode === 'group') setStudentIdState(null)
    else setGroupIdState(null)
  }

  const setClientType = (type: ClientPaymentType) => {
    setClientTypeState(type)
    setClientAmount(clientPrice(type, 'regular'))
  }

  const setHallType = (type: HallPaymentType | '') => {
    setHallTypeState(type)
    setHallAmount(type ? hallPrice(type, timeSlot) : 0)
  }

  const setTimeSlot = (slot: TimeSlot) => {
    setTimeSlotState(slot)
    if (hallType) setHallAmount(hallPrice(hallType, slot))
  }

  const applyAutoSlot = (nextDate: string, nextTime: string) => {
    if (!nextTime) return
    const slot: TimeSlot = isPrimeTime(nextDate, nextTime) ? 'prime' : 'regular'
    setTimeSlotState(slot)
    if (hallType) setHallAmount(hallPrice(hallType, slot))
  }

  const setDate = (next: string) => {
    setDateState(next)
    applyAutoSlot(next, trainingTime)
  }

  const setTrainingTime = (next: string) => {
    setTrainingTimeState(next)
    applyAutoSlot(date, next)
  }

  const net = useMemo(
    () => (clientAmount || 0) - (hallAmount || 0),
    [clientAmount, hallAmount],
  )

  const state: PaymentFormState = {
    clientMode,
    studentId,
    groupId,
    locationId,
    clientType,
    clientAmount,
    hallType,
    hallAmount,
    timeSlot,
    date,
    trainingTime,
    notes,
  }

  return {
    ...state,
    state,
    net,
    setStudentId,
    setGroupId,
    setClientMode,
    setLocationId,
    setClientType,
    setClientAmount,
    setHallType,
    setHallAmount,
    setTimeSlot,
    setDate,
    setTrainingTime,
    setNotes,
  }
}
