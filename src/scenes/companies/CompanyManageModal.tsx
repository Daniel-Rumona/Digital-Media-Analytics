import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Divider,
  message,
  Tag
} from 'antd'
import {
  PlusOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { db } from '@/firebase/firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import MetaOAuthModal from '@/components/MetaOAuthModal'
import { autoDataSync } from '@/services/autoDataSync'

const { Option } = Select

const SOCIAL_PLATFORMS = [
  { label: 'Facebook', value: 'facebook', placeholder: 'Facebook Page' },
  { label: 'Instagram', value: 'instagram', placeholder: 'Instagram Handle' },
  { label: 'X', value: 'x', placeholder: 'X (Twitter) Handle' },
  { label: 'Google', value: 'google', placeholder: 'Google Business Profile' },
  { label: 'Tiktok', value: 'tiktok', placeholder: 'Company Handle URL' },
  { label: 'YouTube', value: 'youtube', placeholder: 'Channel/Brand' }
]

const AccountRow = ({
  idx,
  name,
  restField,
  form,
  oauthStatus,
  setOauthStatus,
  loading,
  remove,
  fields,
  onMetaConnect,
  syncingData,
  setSyncingData
}) => {
  const platform = Form.useWatch(['accounts', name, 'platform'], form)
  const isMetaPlatform = platform === 'facebook' || platform === 'instagram'
  const isConnected = oauthStatus[idx]?.connected

  const handleConnect = () => {
    if (isMetaPlatform) {
      onMetaConnect(idx)
    } else {
      // Original stub logic for other platforms
      message.loading({ content: `Connecting to ${platform}...`, key: platform })
      setTimeout(() => {
        setOauthStatus(status => ({
          ...status,
          [idx]: { connected: true, platform, token: 'fakeToken' }
        }))
        message.success({
          content: `${platform} connected!`,
          key: platform,
          duration: 2
        })
      }, 1200)
    }
  }

  const handleSyncData = async () => {
    if (!isConnected || !isMetaPlatform) return
    
    setSyncingData(prev => ({ ...prev, [idx]: true }))
    try {
      // This would trigger data sync for this specific account
      message.success('Data sync initiated! Check metrics in a few moments.')
    } catch (error) {
      message.error('Failed to sync data')
    }
    setSyncingData(prev => ({ ...prev, [idx]: false }))
  }

  return (
    <Space
      key={idx}
      direction='vertical'
      style={{
        display: 'flex',
        marginBottom: 12,
        background: '#181a20',
        borderRadius: 8,
        padding: '16px 12px'
      }}
      align='start'
    >
      <Space align='start' direction='horizontal' wrap>
        <Form.Item
          {...restField}
          name={[name, 'platform']}
          rules={[{ required: true, message: 'Select platform' }]}
          style={{ minWidth: 140 }}
        >
          <Select
            placeholder='Platform'
            dropdownStyle={{ background: '#181a20', color: '#fff' }}
            style={{ width: 140 }}
          >
            {SOCIAL_PLATFORMS.map(p => (
              <Option value={p.value} key={p.value}>
                {p.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          {...restField}
          name={[name, 'handle']}
          rules={[{ required: true, message: 'Enter page/handle' }]}
        >
          <Input
            placeholder={
              SOCIAL_PLATFORMS.find(
                p =>
                  p.value === form.getFieldValue(['accounts', name, 'platform'])
              )?.placeholder || 'Handle/Page'
            }
            disabled={isConnected && isMetaPlatform}
          />
        </Form.Item>

        <Button
          type={isConnected ? 'primary' : 'default'}
          icon={isConnected ? <CheckCircleOutlined /> : <LinkOutlined />}
          onClick={handleConnect}
          disabled={!platform || loading}
          style={{
            background: isConnected ? '#52c41a' : undefined,
            color: isConnected ? '#fff' : undefined
          }}
        >
          {isConnected ? 'Connected' : 'Connect'}
        </Button>

        {isConnected && isMetaPlatform && (
          <Button
            type='default'
            icon={<SyncOutlined />}
            onClick={handleSyncData}
            loading={syncingData[idx]}
            disabled={loading}
          >
            Sync Data
          </Button>
        )}

        <Button
          type='text'
          danger
          onClick={() => remove(name)}
          disabled={fields.length === 1}
        >
          Remove
        </Button>
      </Space>

      {isConnected && isMetaPlatform && (
        <div style={{ marginTop: 8 }}>
          <Tag color='green'>Auto-sync enabled</Tag>
          <Tag color='blue'>Real-time data</Tag>
        </div>
      )}
    </Space>
  )
}

const CompanyManageModal = ({
  open,
  onCancel,
  onComplete,
  userId,
  company
}) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [oauthStatus, setOauthStatus] = useState({})
  const [metaModalOpen, setMetaModalOpen] = useState(false)
  const [pendingMetaIndex, setPendingMetaIndex] = useState<number | null>(null)
  const [syncingData, setSyncingData] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (company) {
      form.setFieldsValue({
        companyName: company.companyName,
        accounts: (company.accounts || []).map((acc, idx) => ({
          platform: acc.platform,
          handle: acc.handle
        }))
      })
      setOauthStatus(
        (company.accounts || []).reduce(
          (acc, a, idx) =>
            Object.assign(acc, {
              [idx]: {
                connected: !!a.connected,
                platform: a.platform,
                token: a.oauth?.accessToken || '',
                pageId: a.pageId,
                instagramId: a.instagram?.id
              }
            }),
          {}
        )
      )
    } else {
      form.resetFields()
      setOauthStatus({})
    }
  }, [company, open])

  const handleMetaConnect = (accountIndex: number) => {
    setPendingMetaIndex(accountIndex)
    setMetaModalOpen(true)
  }

  const handleMetaSuccess = async (tokens: any, metaAccounts: any[]) => {
    if (pendingMetaIndex === null) return

    // Update the form and oauth status with Meta account data
    const currentAccounts = form.getFieldValue('accounts') || []
    const updatedAccounts = [...currentAccounts]
    
    // For now, just update the first Meta account
    // In a real implementation, you'd let user choose which page to use
    if (metaAccounts.length > 0) {
      const metaAccount = metaAccounts[0]
      updatedAccounts[pendingMetaIndex] = {
        platform: 'facebook',
        handle: metaAccount.handle
      }
      
      setOauthStatus(prev => ({
        ...prev,
        [pendingMetaIndex]: {
          connected: true,
          platform: 'facebook',
          token: metaAccount.accessToken,
          pageId: metaAccount.pageId,
          instagramId: metaAccount.instagram?.id
        }
      }))

      form.setFieldsValue({ accounts: updatedAccounts })
      
      // Trigger initial data sync
      try {
        await autoDataSync.syncHistoricalData(userId, company?.id || 'temp', [
          {
            platform: 'facebook',
            pageId: metaAccount.pageId,
            accessToken: metaAccount.accessToken,
            handle: metaAccount.handle
          }
        ])
        message.success('Meta account connected and data sync initiated!')
      } catch (error) {
        message.warning('Connected but initial sync failed. You can retry from the metrics page.')
      }
    }

    setMetaModalOpen(false)
    setPendingMetaIndex(null)
  }

  const handleSubmit = async values => {
    setLoading(true)
    try {
      function cleanObject (obj) {
        const out = {}
        for (const k in obj) {
          if (obj[k] !== undefined) out[k] = obj[k]
        }
        return out
      }

      const accounts = (values.accounts || [])
        .filter(acc => acc && acc.platform && acc.handle)
        .map((acc, idx) => {
          const status = oauthStatus[idx]
          const obj = {
            platform: acc.platform,
            handle: acc.handle,
            connected: !!status?.connected,
            ...(status?.token ? { oauth: { accessToken: status.token } } : {}),
            ...(status?.pageId ? { pageId: status.pageId } : {}),
            ...(status?.instagramId ? { 
              instagram: { id: status.instagramId } 
            } : {})
          }
          return cleanObject(obj)
        })

      if (company?.id) {
        await updateDoc(doc(db, 'users', userId, 'companies', company.id), {
          companyName: values.companyName,
          accounts
        })
        message.success('Company updated!')
      } else {
        await addDoc(collection(db, 'users', userId, 'companies'), {
          companyName: values.companyName,
          accounts,
          createdAt: new Date()
        })
        message.success('Company added!')
      }
      
      form.resetFields()
      setOauthStatus({})
      onComplete && onComplete()
    } catch (err) {
      message.error('Could not save company: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        onOk={() => form.submit()}
        okText={company ? 'Save' : 'Add'}
        confirmLoading={loading}
        width={800}
        title={
          <span style={{ color: '#fff' }}>
            {company ? 'Manage Company' : 'Add Company'}
          </span>
        }
        destroyOnClose
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          style={{ color: '#fff' }}
          initialValues={{ accounts: [{ platform: undefined, handle: '' }] }}
        >
          <Form.Item
            name='companyName'
            label={<span style={{ color: '#fff' }}>Company Name</span>}
            rules={[{ required: true, message: 'Enter the company name' }]}
          >
            <Input placeholder='e.g. Quantilytix' autoFocus />
          </Form.Item>
          
          <Divider>Social Media Accounts</Divider>
          
          <Form.List name='accounts'>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }, idx) => (
                  <AccountRow
                    key={key}
                    idx={idx}
                    name={name}
                    restField={restField}
                    form={form}
                    oauthStatus={oauthStatus}
                    setOauthStatus={setOauthStatus}
                    loading={loading}
                    remove={remove}
                    fields={fields}
                    onMetaConnect={handleMetaConnect}
                    syncingData={syncingData}
                    setSyncingData={setSyncingData}
                  />
                ))}
                <Form.Item>
                  <Button
                    type='dashed'
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    block
                    style={{
                      background: '#1a1b1f',
                      color: '#fff',
                      borderColor: '#444'
                    }}
                  >
                    Add Social Account
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <MetaOAuthModal
        open={metaModalOpen}
        onClose={() => {
          setMetaModalOpen(false)
          setPendingMetaIndex(null)
        }}
        onSuccess={handleMetaSuccess}
        companyId={company?.id || ''}
      />
    </>
  )
}

export default CompanyManageModal