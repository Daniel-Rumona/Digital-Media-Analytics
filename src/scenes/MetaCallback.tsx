import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, Alert } from 'antd'

const MetaAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      setError('No code found in redirect URI.')
      setLoading(false)
      return
    }

    const exchangeToken = async () => {
      try {
        const res = await fetch(
          'https://us-central1-digital-media-analytics-e9a0e.cloudfunctions.net/exchangeMetaToken',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
          }
        )

        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Token exchange failed')

        // Optionally save the token
        localStorage.setItem('meta_access_token', data.access_token)

        navigate('/dashboard')
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    exchangeToken()
  }, [navigate])

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', marginTop: '40vh' }}
      >
        <Spin size='large' />
      </div>
    )
  }

  return error ? (
    <div style={{ maxWidth: 500, margin: '60px auto' }}>
      <Alert
        message='Authentication Error'
        description={error}
        type='error'
        showIcon
      />
    </div>
  ) : null
}

export default MetaAuthCallback
