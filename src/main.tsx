import { ConfigProvider, theme as antdTheme } from 'antd'
import { Provider } from '@/components/ui/provider' // Chakra, etc.
import { CompanyDataProvider } from '@/context/company-data-context'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: antdTheme.darkAlgorithm
      }}
    >
      <Provider>
        <CompanyDataProvider>
          <App />
        </CompanyDataProvider>
      </Provider>
    </ConfigProvider>
  </React.StrictMode>
)
