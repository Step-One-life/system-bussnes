import { useState } from 'react'

import { Button, Form, Input } from 'antd'
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons'

import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from 'common/ui'
import { useAuth } from 'entities/auth/api/use-auth'
import { AuthScreen } from 'entities/auth/ui/auth-screen'

import type { RegisterInput } from 'entities/auth/model/types'

import '../login/auth-layout.scss'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: RegisterInput) => {
    setLoading(true)
    try {
      await register(values)
      toast({ type: 'success', title: t('auth.accountCreated') })
      navigate('/', { replace: true })
    } catch (e) {
      toast({ type: 'error', title: e instanceof Error ? e.message : t('auth.registerError') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthScreen
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="auth-screen__link">
            {t('auth.loginLink')}
          </Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item
          name="name"
          label={t('auth.nameLabel')}
          rules={[{ required: true, message: t('auth.nameRequired') }]}
        >
          <Input prefix={<UserOutlined />} placeholder={t('auth.namePlaceholder')} size="large" />
        </Form.Item>
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, type: 'email', message: t('auth.emailInvalid') }]}
        >
          <Input prefix={<MailOutlined />} placeholder="trainer@example.com" size="large" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('auth.passwordLabel')}
          rules={[{ required: true, min: 6, message: t('auth.passwordMin') }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="••••••••" size="large" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          {t('auth.registerBtn')}
        </Button>
      </Form>
    </AuthScreen>
  )
}
