import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

const rootElement = document.getElementById('root')

// Ensure `rootElement` is not null for TypeScript
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

// Uncomment the following line if you want to measure performance
// reportWebVitals(console.log);
