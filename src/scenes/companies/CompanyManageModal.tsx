import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Space,
  Divider,
  message
} from 'antd'
import {
  PlusOutlined,
  LinkOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { db } from '@/firebase/firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'

const { Option } = Select

const SOCIAL_PLATFORMS = [
  { label: 'Facebook', value: 'facebook', placeholder: 'Facebook Page' },
  { label: 'Instagram', value: 'instagram', placeholder: 'Instagram Handle' },
  { label: 'X', value: 'x', placeholder: 'X (Twitter) Handle' },
  { label: 'Google', value: 'google', placeholder: 'Google Business Profile' },
  { label: 'Tiktok', value: 'tiktok', placeholder: 'Company Handle URL' },
  { label: 'YouTube', value: 'youtube', placeholder: 'Channel/Brand' }
]

// Stub for OAuth, replace with real logic
const handleConnectStub = async (platform, idx, setOauthStatus) => {
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

const AccountRow = ({
  idx,
  name,
  restField,
  form,
  oauthStatus,
  setOauthStatus,
  loading,
  remove,
  fields
}) => {
  const platform = Form.useWatch(['accounts', name, 'platform'], form)
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
      <Space align='start' direction='horizontal'>
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
          />
        </Form.Item>
        <Button
          id={`connect-btn-${form.getFieldValue('companyName')}-${idx}`}
          type={oauthStatus[idx]?.connected ? 'primary' : 'default'}
          icon={
            oauthStatus[idx]?.connected ? (
              <CheckCircleOutlined />
            ) : (
              <LinkOutlined />
            )
          }
          onClick={() => handleConnectStub(platform, idx, setOauthStatus)}
          disabled={!platform || loading}
          style={{
            background: oauthStatus[idx]?.connected ? '#52c41a' : undefined,
            color: oauthStatus[idx]?.connected ? '#fff' : undefined
          }}
        >
          {oauthStatus[idx]?.connected ? 'Connected' : 'Connect'}
        </Button>
        <Button
          type='text'
          danger
          onClick={() => remove(name)}
          disabled={fields.length === 1}
        >
          Remove
        </Button>
      </Space>
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

  useEffect(() => {
    console.log('[CompanyManageModal] useEffect:', { open, company })
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
                token: a.oauth?.accessToken || ''
              }
            }),
          {}
        )
      )
    } else {
      form.resetFields()
      setOauthStatus({})
    }
    // eslint-disable-next-line
  }, [company, open])

  const handleSubmit = async values => {
    setLoading(true)
    console.log('[CompanyManageModal] handleSubmit called', values)
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
          const obj = {
            platform: acc.platform,
            handle: acc.handle,
            connected: !!oauthStatus[idx]?.connected,
            ...(oauthStatus[idx]?.token
              ? { oauth: { accessToken: oauthStatus[idx].token } }
              : {})
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
        console.log('[CompanyManageModal] userId:', userId)
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
      console.error('[CompanyManageModal] Error saving:', err)
      message.error('Could not save company: ' + err.message)
    }
    setLoading(false)
  }

  const handleFinishFailed = info => {
    console.warn('[CompanyManageModal] Form validation failed:', info)
  }

  return (
    <Modal
      open={open}
      onCancel={() => {
        console.log('[CompanyManageModal] Modal cancelled')
        onCancel && onCancel()
      }}
      onOk={() => {
        console.log('[CompanyManageModal] Modal onOk clicked')
        form.submit()
      }}
      okText={company ? 'Save' : 'Add'}
      confirmLoading={loading}
      width={700}
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
        onFinishFailed={handleFinishFailed}
        onValuesChange={(changed, all) => {
          console.log('[CompanyManageModal] Form value changed:', changed, all)
        }}
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
                />
              ))}
              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() => {
                    add()
                    console.log('[CompanyManageModal] Added social account row')
                  }}
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
  )
}

export default CompanyManageModal
