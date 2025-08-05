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
  Image,
  message,
  Spin
} from 'antd'
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  ArrowLeftOutlined,
  GoogleOutlined
} from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase/firebase'
import registrationImage from '@/assets/images/cross-plat.jpg' // Replace with your image

const { Title, Text } = Typography

// Motion components
const MotionDiv = motion.div
const MotionCard = motion(Card)
const MotionButton = motion(Button)
const MotionImage = motion(Image)

const RegistrationPage = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onFinish = async values => {
    if (values.password !== values.confirmPassword) {
      message.error('Passwords do not match!')
      return
    }

    setLoading(true)
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      )
      await setDoc(doc(db, 'users', res.user.uid), {
        fullName: values.fullName,
        email: values.email,
        createdAt: serverTimestamp()
      })
      message.success('Registration successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      await setDoc(doc(db, 'users', res.user.uid), {
        fullName: res.user.displayName || '',
        email: res.user.email,
        createdAt: serverTimestamp()
      })
      message.success('Google registration successful!')
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
          <MotionButton
            type='text'
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            style={{ marginBottom: '1rem' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back
          </MotionButton>

          <Title level={3} style={{ marginBottom: '1rem' }}>
            Create your account
          </Title>

          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Form form={form} layout='vertical' onFinish={onFinish}>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='fullName'
                    label='Full Name'
                    rules={[
                      {
                        required: true,
                        message: 'Please input your full name!'
                      }
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder='John Doe'
                      size='large'
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name='email'
                    label='Email'
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' }
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder='user@example.com'
                      size='large'
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name='password'
                label='Password'
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 6, message: 'Password must be at least 6 characters!' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder='••••••••'
                  size='large'
                  iconRender={visible =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item
                name='confirmPassword'
                label='Confirm Password'
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm your password!' },
                  ({ getFieldValue }) => ({
                    validator (_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('The two passwords do not match!')
                      )
                    }
                  })
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder='••••••••'
                  size='large'
                  iconRender={visible =>
                    visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                  }
                />
              </Form.Item>

              <Form.Item>
                <MotionButton
                  type='primary'
                  htmlType='submit'
                  block
                  size='large'
                  loading={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Register
                </MotionButton>
              </Form.Item>

              <Divider>or</Divider>

              <MotionButton
                icon={<GoogleOutlined />}
                block
                size='large'
                onClick={handleGoogleRegister}
                loading={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue with Google
              </MotionButton>

              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Text>
                  Already have an account? <Link to='/login'>Sign in</Link>
                </Text>
              </div>
            </Form>
          </MotionCard>
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
            Track social media presence with speed
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}>
            Join thousands of marketers using our platform to analyze and
            optimize their social media strategy.
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
          <Spin size='large' tip='Creating account...' />
        </div>
      )}
    </Row>
  )
}

export default RegistrationPage
