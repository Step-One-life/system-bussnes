import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '../locales/en/translation.json'
import ru from '../locales/ru/translation.json'

import 'dayjs/locale/ru'
import dayjs from 'dayjs'

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
})

// Даты (dayjs) следуют за языком интерфейса.
dayjs.locale(i18n.language)
i18n.on('languageChanged', (lng) => {
  dayjs.locale(lng)
})

export default i18n
