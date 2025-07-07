import React, { useState, useEffect } from 'react'
import { Modal, Button, Steps, Alert, Spin, List, Card, message } from 'antd'
import { LinkOutlined, CheckCircleOutlined, FacebookOutlined, InstagramOutlined } from '@ant-design/icons'
import { metaApiService, type FacebookPageData, type InstagramBusinessAccount } from '@/services/metaApi'

const { Step } = Steps

interface MetaOAuthModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (tokens: any, accounts: any[]) => void
  companyId: string
}

// You'll need to set these in your environment variables
const META_APP_ID = import.meta.env.VITE_META_APP_ID || 'your-meta-app-id'
const META_APP_SECRET = import.meta.env.VITE_META_APP_SECRET || 'your-meta-app-secret'
const REDIRECT_URI = `${window.location.origin}/auth/meta/callback`

const MetaOAuthModal: React.FC<MetaOAuthModalProps> = ({
  open,
  onClose,
  onSuccess,
  companyId
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [pages, setPages] = useState<FacebookPageData[]>([])
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [instagramAccounts, setInstagramAccounts] = useState<Record<string, InstagramBusinessAccount>>({})

  // Step 1: Handle OAuth redirect
  useEffect(() => {
    if (open) {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error = urlParams.get('error')

      if (error) {
        setError(`OAuth error: ${error}`)
        return
      }

      if (code && !accessToken) {
        handleTokenExchange(code)
      }
    }
  }, [open])

  const handleTokenExchange = async (code: string) => {
    setLoading(true)
    setError(null)
    try {
      const tokens = await metaApiService.exchangeCodeForToken(
        code,
        META_APP_ID,
        META_APP_SECRET,
        REDIRECT_URI
      )
      setAccessToken(tokens.accessToken)
      setCurrentStep(1)
      await fetchUserPages(tokens.accessToken)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  const fetchUserPages = async (token: string) => {
    try {
      const userPages = await metaApiService.getUserPages(token)
      setPages(userPages)
      setCurrentStep(2)

      // Fetch Instagram accounts for each page
      const instagramData: Record<string, InstagramBusinessAccount> = {}
      for (const page of userPages) {
        const instagramAccount = await metaApiService.getInstagramAccount(
          page.id,
          page.access_token
        )
        if (instagramAccount) {
          instagramData[page.id] = instagramAccount
        }
      }
      setInstagramAccounts(instagramData)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startOAuth = () => {
    const loginUrl = metaApiService.getLoginUrl(META_APP_ID, REDIRECT_URI)
    window.location.href = loginUrl
  }

  const handlePageSelection = (pageId: string, selected: boolean) => {
    if (selected) {
      setSelectedPages([...selectedPages, pageId])
    } else {
      setSelectedPages(selectedPages.filter(id => id !== pageId))
    }
  }

  const handleComplete = () => {
    const selectedPageData = pages.filter(page => selectedPages.includes(page.id))
    const accounts = selectedPageData.map(page => ({
      platform: 'facebook',
      handle: page.name,
      pageId: page.id,
      accessToken: page.access_token,
      connected: true,
      instagram: instagramAccounts[page.id] ? {
        id: instagramAccounts[page.id].id,
        username: instagramAccounts[page.id].username
      } : null
    }))

    onSuccess({ accessToken }, accounts)
    message.success(`Connected ${accounts.length} Meta account(s)`)
    onClose()
  }

  const reset = () => {
    setCurrentStep(0)
    setAccessToken(null)
    setPages([])
    setSelectedPages([])
    setInstagramAccounts({})
    setError(null)
    setLoading(false)
  }

  return (
    <Modal
      title="Connect Meta Accounts (Facebook & Instagram)"
      open={open}
      onCancel={() => {
        reset()
        onClose()
      }}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="Authorize" icon={<LinkOutlined />} />
        <Step title="Authenticate" icon={<CheckCircleOutlined />} />
        <Step title="Select Accounts" icon={<FacebookOutlined />} />
      </Steps>

      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Connecting to Meta..." />
        </div>
      )}

      {currentStep === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <h3>Connect Your Meta Business Accounts</h3>
          <p>This will allow automatic data fetching from Facebook and Instagram</p>
          <Button
            type="primary"
            size="large"
            icon={<FacebookOutlined />}
            onClick={startOAuth}
          >
            Connect with Meta
          </Button>
        </div>
      )}

      {currentStep === 2 && !loading && (
        <div>
          <h4>Select Facebook Pages to Connect:</h4>
          <List
            dataSource={pages}
            renderItem={(page) => (
              <List.Item>
                <Card
                  style={{ width: '100%' }}
                  actions={[
                    <Button
                      key="select"
                      type={selectedPages.includes(page.id) ? 'primary' : 'default'}
                      onClick={() => handlePageSelection(page.id, !selectedPages.includes(page.id))}
                    >
                      {selectedPages.includes(page.id) ? 'Selected' : 'Select'}
                    </Button>
                  ]}
                >
                  <Card.Meta
                    avatar={<FacebookOutlined style={{ fontSize: 24, color: '#1877f2' }} />}
                    title={page.name}
                    description={
                      <div>
                        <div>Category: {page.category}</div>
                        {instagramAccounts[page.id] && (
                          <div style={{ marginTop: 8, color: '#E4405F' }}>
                            <InstagramOutlined /> Instagram: @{instagramAccounts[page.id].username}
                          </div>
                        )}
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
          
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button onClick={reset} style={{ marginRight: 8 }}>
              Start Over
            </Button>
            <Button
              type="primary"
              onClick={handleComplete}
              disabled={selectedPages.length === 0}
            >
              Complete Setup ({selectedPages.length} selected)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default MetaOAuthModal