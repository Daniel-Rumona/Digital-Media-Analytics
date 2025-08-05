import { useState } from 'react'
import {
  Row,
  Col,
  Card,
  Form,
  Input,
  Button,
  Divider,
  Typography,
  message,
  Spin
} from 'antd'
import {
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ArrowLeftOutlined,
  GoogleOutlined
} from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { auth, db } from '@/firebase/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const { Title, Text } = Typography
const { Password } = Input

// Motion components
const MotionDiv = motion.div

const LoginPage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async values => {
    setLoading(true)
    try {
      const res = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      )
      await setDoc(doc(db, 'users', res.user.uid), {
        fullName: res.user.displayName ?? '',
        email: res.user.email,
        createdAt: serverTimestamp()
      })
      message.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      await setDoc(doc(db, 'users', res.user.uid), {
        fullName: res.user.displayName ?? '',
        email: res.user.email,
        createdAt: serverTimestamp()
      })
      message.success('Google login successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Row style={{ minHeight: '100vh' }}>
      {/* Left Pane - Form */}
      <Col
        xs={24}
        md={12}
        style={{ padding: '2rem', display: 'flex', alignItems: 'center' }}
      >
        <MotionDiv
          style={{ maxWidth: '450px', margin: '0 auto', width: '100%' }}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            type='text'
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ marginBottom: '1rem' }}
          >
            Back
          </Button>

          <Title level={3} style={{ marginBottom: '1rem' }}>
            Login to your account
          </Title>

          <Card>
            <Form form={form} layout='vertical' onFinish={onFinish}>
              <Form.Item
                name='email'
                label='Email'
                rules={[
                  { required: true, message: 'Please input your email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder='user@example.com'
                  size='large'
                />
              </Form.Item>

              <Form.Item
                name='password'
                label='Password'
                rules={[
                  { required: true, message: 'Please input your password!' }
                ]}
              >
                <Password
                  prefix={<LockOutlined />}
                  placeholder='••••••••'
                  size='large'
                  iconRender={visible =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type='primary'
                  htmlType='submit'
                  block
                  size='large'
                  loading={loading}
                >
                  Login
                </Button>
              </Form.Item>

              <Divider>or</Divider>

              <Button
                icon={<GoogleOutlined />}
                block
                size='large'
                onClick={handleGoogleLogin}
                loading={loading}
              >
                Continue with Google
              </Button>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Text>
                  Don't have an account? <Link to='/register'>Sign up</Link>
                </Text>
              </div>
            </Form>
          </Card>
        </MotionDiv>
      </Col>

      {/* Right Pane - Floating Blobs with Centered Message */}
      <Col xs={0} md={12} style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Main Blob (Large, Centered) */}
        <MotionDiv
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            width: '400px',
            height: '400px',
            borderRadius: '76% 24% 85% 15% / 30% 72% 28% 70%',
            background:
              'linear-gradient(45deg, rgba(24, 144, 255, 0.7), rgba(114, 46, 209, 0.7))',
            filter: 'blur(60px)',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
          animate={{
            borderRadius: [
              '76% 24% 85% 15% / 30% 72% 28% 70%',
              '53% 47% 34% 66% / 63% 38% 62% 37%',
              '76% 24% 85% 15% / 30% 72% 28% 70%'
            ],
            scale: [1, 1.1, 1],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        />

        {/* Secondary Blob (Top Right) */}
        <MotionDiv
          style={{
            position: 'absolute',
            top: '25%',
            right: '15%',
            width: '200px',
            height: '200px',
            borderRadius: '63% 37% 56% 44% / 25% 66% 34% 75%',
            background:
              'linear-gradient(45deg, rgba(19, 194, 194, 0.6), rgba(82, 196, 26, 0.6))',
            filter: 'blur(40px)',
            zIndex: 2
          }}
          animate={{
            borderRadius: [
              '63% 37% 56% 44% / 25% 66% 34% 75%',
              '37% 63% 44% 56% / 66% 25% 75% 34%',
              '63% 37% 56% 44% / 25% 66% 34% 75%'
            ],
            y: ['0px', '-30px', '0px'],
            x: ['0px', '20px', '0px']
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: 1
          }}
        />

        {/* Tertiary Blob (Bottom Left) */}
        <MotionDiv
          style={{
            position: 'absolute',
            bottom: '20%',
            left: '15%',
            width: '150px',
            height: '150px',
            borderRadius: '37% 63% 70% 30% / 47% 30% 70% 53%',
            background:
              'linear-gradient(45deg, rgba(250, 140, 22, 0.5), rgba(245, 34, 45, 0.5))',
            filter: 'blur(30px)',
            zIndex: 3
          }}
          animate={{
            borderRadius: [
              '37% 63% 70% 30% / 47% 30% 70% 53%',
              '63% 37% 30% 70% / 30% 47% 53% 70%',
              '37% 63% 70% 30% / 47% 30% 70% 53%'
            ],
            y: ['0px', '20px', '0px'],
            x: ['0px', '-20px', '0px']
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: 2
          }}
        />

        {/* Centered White Message */}
        <MotionDiv
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            maxWidth: '500px',
            padding: '1rem',
            zIndex: 4,
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          <Title level={2} style={{ color: 'white', marginBottom: '1rem' }}>
            Welcome back!
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}>
            Login to access your dashboard and continue tracking your social
            media performance.
          </Text>
        </MotionDiv>
      </Col>

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <Spin size='large' tip='Logging in...' />
        </div>
      )}
    </Row>
  )
}

export default LoginPage
