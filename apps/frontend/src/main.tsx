import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

import 'app/i18n'
import 'app/theme/tokens.scss'
import 'app/theme/design-tokens.scss'
import 'app/theme/responsive.scss'
import './index.scss'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
