import { useState } from 'react'

import { Button, Form, Input } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'

import { Link, useNavigate } from 'react-router-dom'

import { useToast } from 'common/ui'
import { useAuth } from 'entities/auth/api/use-auth'
import { AuthScreen } from 'entities/auth/ui/auth-screen'

import type { LoginInput } from 'entities/auth/model/types'

import './auth-layout.scss'

export function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: LoginInput) => {
    setLoading(true)
    try {
      await login(values)
      navigate('/', { replace: true })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : 'Ошибка входа' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen
      subtitle="Вход в систему"
      footer={
        <>
          Нет аккаунта?{' '}
          <Link to="/register" className="auth-screen__link">
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
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
          rules={[{ required: true, message: 'Введите пароль' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Войти
        </Button>
      </Form>
    </AuthScreen>
  )
}
