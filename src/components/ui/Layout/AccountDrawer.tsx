import { Drawer, Tabs, Form, Input, Button, message } from 'antd'
import { updateEmail, updatePassword } from 'firebase/auth'
import { auth } from '@/firebase/firebase'
import { useState } from 'react'

type AccountDrawerProps = {
  open: boolean
  onClose: () => void
  tab: string
  setTab: (tab: string) => void
}

const AccountDrawer: React.FC<AccountDrawerProps> = ({
  open,
  onClose,
  tab,
  setTab
}) => {
  const [form] = Form.useForm()
  const [pwForm] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // Change Email
  const handleEmailChange = async (values: { email: string }) => {
    setLoading(true)
    try {
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, values.email)
        message.success('Email updated!')
      }
      form.resetFields()
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  // Change Password
  const handlePasswordChange = async (values: { password: string }) => {
    setLoading(true)
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, values.password)
        message.success('Password updated!')
      }
      pwForm.resetFields()
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title='Manage Account'
      width={400}
      bodyStyle={{ background: '#22232b', color: '#fff' }}
      headerStyle={{ background: '#181a20', color: '#fff' }}
      placement='right'
      destroyOnClose
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        style={{ color: '#fff' }}
        items={[
          {
            key: 'account',
            label: 'Change Email',
            children: (
              <Form form={form} layout='vertical' onFinish={handleEmailChange}>
                <Form.Item
                  label={<span style={{ color: '#fff' }}>New Email</span>}
                  name='email'
                  rules={[
                    { required: true, message: 'Enter new email' },
                    { type: 'email', message: 'Not a valid email' }
                  ]}
                >
                  <Input placeholder='your@email.com' />
                </Form.Item>
                <Form.Item>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={loading}
                    block
                  >
                    Update Email
                  </Button>
                </Form.Item>
              </Form>
            )
          },
          {
            key: 'password',
            label: 'Change Password',
            children: (
              <Form
                form={pwForm}
                layout='vertical'
                onFinish={handlePasswordChange}
              >
                <Form.Item
                  label={<span style={{ color: '#fff' }}>New Password</span>}
                  name='password'
                  rules={[{ required: true, message: 'Enter new password' }]}
                >
                  <Input.Password placeholder='New password' />
                </Form.Item>
                <Form.Item
                  label={
                    <span style={{ color: '#fff' }}>Confirm Password</span>
                  }
                  name='confirm'
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Confirm your password' },
                    ({ getFieldValue }) => ({
                      validator (_: any, value: string) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve()
                        }
                        return Promise.reject(
                          new Error('Passwords do not match!')
                        )
                      }
                    })
                  ]}
                >
                  <Input.Password placeholder='Confirm password' />
                </Form.Item>
                <Form.Item>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={loading}
                    block
                  >
                    Update Password
                  </Button>
                </Form.Item>
              </Form>
            )
          }
        ]}
      />
    </Drawer>
  )
}

export default AccountDrawer
