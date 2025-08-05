import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spin, Alert, Card, Typography } from 'antd'

const { Title, Paragraph } = Typography

const MetaAuthCallback: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageInfo, setPageInfo] = useState<{ name: string; id: string } | null>(null)
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

        const { access_token, pages } = data

        // Store the long-lived user token
        localStorage.setItem('meta_access_token', access_token)

        // Save first page token if available (you can adjust this logic)
        if (pages?.length > 0) {
          const firstPage = pages[0]
          localStorage.setItem('page_id', firstPage.id)
          localStorage.setItem('page_access_token', firstPage.access_token)
          setPageInfo({ name: firstPage.name, id: firstPage.id })
        } else {
          setError('No connected Facebook pages found.')
        }
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
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return error ? (
    <div style={{ maxWidth: 500, margin: '60px auto' }}>
      <Alert message="Authentication Error" description={error} type="error" showIcon />
    </div>
  ) : pageInfo ? (
    <Card style={{ maxWidth: 500, margin: '60px auto' }}>
      <Title level={4}>Facebook Connected</Title>
      <Paragraph>
        Page: <strong>{pageInfo.name}</strong>
        <br />
        Page ID: <code>{pageInfo.id}</code>
      </Paragraph>
    </Card>
  ) : null
}

export default MetaAuthCallback
