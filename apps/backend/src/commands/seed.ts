/**
 * Demo data seeder. Ported from the frontend localStorage seed.
 * Run: npm run seed
 */
import { NestFactory } from '@nestjs/core'
import * as bcrypt from 'bcrypt'

import { AppModule } from '../app.module'
import { DateUtil } from '../common/utils/date.util'
import { GroupService } from '../modules/group/group.service'
import { StudentService } from '../modules/student/student.service'
import { SubscriptionsService } from '../modules/student/subscriptions.service'
import { TrainingService } from '../modules/training/training.service'
import { UsersService } from '../modules/user/users.service'

const DEMO_EMAIL = 'demo@trikick.ru'
const DEMO_PASSWORD = 'demo1234'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  const usersService = app.get(UsersService)
  const groupService = app.get(GroupService)
  const studentService = app.get(StudentService)
  const subscriptionsService = app.get(SubscriptionsService)
  const trainingService = app.get(TrainingService)

  // ── Demo trainer ──
  let user = await usersService.findByEmail(DEMO_EMAIL)
  if (user) {
    console.log(`Демо-пользователь ${DEMO_EMAIL} уже существует — пропускаю сидинг.`)
    await app.close()
    return
  }
  user = await usersService.create({
    name: 'Демо Тренер',
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
  })
  const userId = user.id

  // ── Groups ──
  const trikick = await groupService.createGroup(userId, {
    name: 'Трикинг',
    duration: 90,
    schedule: [
      { day: 'Пн', time: '19:00' },
      { day: 'Ср', time: '19:00' },
      { day: 'Пт', time: '19:00' },
    ],
  })
  const adults = await groupService.createGroup(userId, {
    name: 'Взрослые',
    duration: 60,
    schedule: [
      { day: 'Вт', time: '20:00' },
      { day: 'Чт', time: '20:00' },
    ],
  })
  const taekwondo = await groupService.createGroup(userId, {
    name: 'Тхэквондо',
    duration: 60,
    schedule: [
      { day: 'Пн', time: '17:00' },
      { day: 'Ср', time: '17:00' },
      { day: 'Пт', time: '17:00' },
    ],
  })
  const individual = await groupService.createGroup(userId, {
    name: 'Индивидуальные',
    duration: 60,
    schedule: [],
    isIndividual: true,
  })

  // ── Students ──
  const s1 = await studentService.createStudent(userId, {
    name: 'Алексей Иванов',
    groups: [trikick.id, individual.id],
  })
  const s2 = await studentService.createStudent(userId, {
    name: 'Мария Смирнова',
    groups: [taekwondo.id],
  })
  const s3 = await studentService.createStudent(userId, {
    name: 'Дмитрий Козлов',
    groups: [adults.id],
  })
  const s4 = await studentService.createStudent(userId, {
    name: 'Анна Петрова',
    groups: [trikick.id],
  })
  const s5 = await studentService.createStudent(userId, {
    name: 'Иван Сидоров',
    groups: [taekwondo.id, adults.id],
  })
  const s6 = await studentService.createStudent(userId, {
    name: 'Ольга Новикова',
    groups: [adults.id],
  })
  const s7 = await studentService.createStudent(userId, {
    name: 'Сергей Морозов',
    groups: [trikick.id],
  })
  const s8 = await studentService.createStudent(userId, {
    name: 'Екатерина Волкова',
    groups: [individual.id],
  })

  // ── Subscriptions ──
  await subscriptionsService.add(s1.id, { groupId: trikick.id, type: '8', createdAt: daysAgo(20) })
  await subscriptionsService.add(s1.id, {
    groupId: individual.id,
    type: '4',
    createdAt: daysAgo(10),
  })
  await subscriptionsService.add(s2.id, {
    groupId: taekwondo.id,
    type: '8',
    createdAt: daysAgo(14),
  })
  await subscriptionsService.add(s3.id, { groupId: adults.id, type: '4', createdAt: daysAgo(12) })
  await subscriptionsService.add(s4.id, { groupId: trikick.id, type: '4', createdAt: daysAgo(8) })
  await subscriptionsService.add(s5.id, {
    groupId: taekwondo.id,
    type: '8',
    createdAt: daysAgo(18),
  })
  await subscriptionsService.add(s5.id, { groupId: adults.id, type: '4', createdAt: daysAgo(5) })
  await subscriptionsService.add(s6.id, { groupId: adults.id, type: '1', createdAt: daysAgo(3) })
  await subscriptionsService.add(s7.id, { groupId: trikick.id, type: '8', createdAt: daysAgo(25) })
  await subscriptionsService.add(s8.id, {
    groupId: individual.id,
    type: '4',
    createdAt: daysAgo(7),
  })

  // ── Simulate deductions to make statuses interesting ──
  for (let i = 0; i < 3; i++) await subscriptionsService.deduct(s4.id, trikick.id)
  for (let i = 0; i < 2; i++) await subscriptionsService.deduct(s3.id, adults.id)
  await subscriptionsService.deduct(s6.id, adults.id)
  for (let i = 0; i < 6; i++) await subscriptionsService.deduct(s7.id, trikick.id)
  for (let i = 0; i < 3; i++) await subscriptionsService.deduct(s1.id, trikick.id)

  // ── Trainings ──
  // Historical trainings — seeded WITHOUT re-deducting sessions
  // (ручные списания выше уже отражают остатки).
  await trainingService.createTraining(
    userId,
    { date: daysAgo(1), time: '19:00', groupId: trikick.id, attendees: [s1.id, s4.id, s7.id] },
    false,
  )
  await trainingService.createTraining(
    userId,
    { date: daysAgo(2), time: '18:00', groupId: taekwondo.id, attendees: [s2.id, s5.id] },
    false,
  )
  await trainingService.createTraining(
    userId,
    { date: daysAgo(3), time: '20:00', groupId: adults.id, attendees: [s3.id, s5.id, s6.id] },
    false,
  )
  await trainingService.createTraining(
    userId,
    { date: daysAgo(7), time: '19:00', groupId: individual.id, attendees: [s8.id] },
    false,
  )

  console.log('✓ Демо-данные созданы.')
  console.log(`  Тренер: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`  Сегодня: ${DateUtil.todayIso()}`)

  await app.close()
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Ошибка сидинга:', err)
    process.exit(1)
  })
