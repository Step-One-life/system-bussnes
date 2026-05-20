import { useState } from 'react'

import { Button, Form, Input } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'

import { Link, useNavigate } from 'react-router-dom'

import { useToast } from 'common/ui'
import { useAuth } from 'entities/auth/api/use-auth'
import { AuthScreen } from 'entities/auth/ui/auth-screen'

import type { RegisterInput } from 'entities/auth/model/types'

import '../login/auth-layout.scss'

export function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: RegisterInput) => {
    setLoading(true)
    try {
      await register(values)
      toast({ type: 'success', title: 'Аккаунт создан' })
      navigate('/', { replace: true })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Ошибка регистрации' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen
      subtitle="Создание аккаунта"
      footer={
        <>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="auth-screen__link">
            Войти
          </Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item
          name="name"
          label="Имя"
          rules={[{ required: true, message: 'Введите имя' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Иван Тренеров" size="large" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
        >
          <Input prefix={<MailOutlined />} placeholder="trainer@example.com" size="large" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Зарегистрироваться
        </Button>
      </Form>
    </AuthScreen>
  )
}
