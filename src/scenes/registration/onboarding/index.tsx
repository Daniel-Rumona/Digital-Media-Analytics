// OnboardingModal.tsx
import React, { useState } from 'react'
import { Modal, Form, Input, Button, Select, Space, message } from 'antd'
import { db } from '@/firebase/firebase'
import { collection, addDoc } from 'firebase/firestore'

const { Option } = Select
const SOCIAL_PLATFORMS = [
  'Facebook',
  'Instagram',
  'X',
  'Tiktok',
  'Google',
  'YouTube'
]

const OnboardingModal = ({ open, userId, onComplete }) => {
  const [form] = Form.useForm()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)

  const addCompany = values => {
    setCompanies([...companies, values])
    form.resetFields()
  }

  const finishOnboarding = async () => {
    setLoading(true)
    try {
      for (let comp of companies) {
        await addDoc(collection(db, 'users', userId, 'companies'), comp)
      }
      message.success('Companies saved!')
      onComplete()
    } catch (err) {
      message.error('Error saving companies')
    }
    setLoading(false)
  }

  return (
    <Modal
      title='Set Up Your Companies'
      open={open}
      footer={null}
      closable={false}
      centered
    >
      <Form form={form} layout='vertical' onFinish={addCompany}>
        <Form.Item
          name='companyName'
          label='Company Name'
          rules={[{ required: true }]}
        >
          <Input placeholder='e.g. Steij' />
        </Form.Item>
        <Form.List name='accounts' initialValue={[{}]}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align='start'
                >
                  <Form.Item
                    name={[name, 'platform']}
                    rules={[{ required: true, message: 'Platform required' }]}
                  >
                    <Select placeholder='Platform' style={{ width: 120 }}>
                      {SOCIAL_PLATFORMS.map(p => (
                        <Option key={p} value={p}>
                          {p}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name={[name, 'handle']}
                    rules={[
                      { required: true, message: 'Account/Handle required' }
                    ]}
                  >
                    <Input placeholder='Account/Page/Handle' />
                  </Form.Item>
                  <Button
                    danger
                    onClick={() => remove(name)}
                    disabled={fields.length === 1}
                  >
                    Remove
                  </Button>
                </Space>
              ))}
              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() => add()}
                  style={{ width: '100%' }}
                >
                  Add Social Media Account
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
        <Form.Item>
          <Button htmlType='submit' type='primary' block>
            Add Company
          </Button>
        </Form.Item>
      </Form>
      <div style={{ marginTop: 24 }}>
        {companies.length > 0 && (
          <div>
            <b>Companies Added:</b>
            <ul>
              {companies.map((c, idx) => (
                <li key={idx}>
                  <b>{c.companyName}</b>:
                  {c.accounts?.map((acc, i) => (
                    <span key={i} style={{ marginLeft: 8 }}>
                      {acc.platform}: {acc.handle}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
            <Button
              type='primary'
              onClick={finishOnboarding}
              loading={loading}
              block
            >
              Finish Setup
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default OnboardingModal
