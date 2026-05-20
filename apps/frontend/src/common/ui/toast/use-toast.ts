import { App } from 'antd'

type ToastType = 'success' | 'warn' | 'error' | 'info'

interface ToastOptions {
  type?: ToastType
  title: string
  msg?: string
}

/** Toast helper backed by antd notification. Must be used inside <App>. */
export function useToast() {
  const { notification } = App.useApp()

  return ({ type = 'info', title, msg = '' }: ToastOptions) => {
    const apiType = type === 'warn' ? 'warning' : type
    notification[apiType]({
      title,
      description: msg || undefined,
      placement: 'topRight',
      duration: 3.5,
    })
  }
}
