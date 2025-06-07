import { useState } from 'react'
import {
  Box,
  Flex,
  Heading,
  VStack,
  Input,
  Link,
  IconButton,
  Button,
  Image,
  Text,
  Highlight,
  Stack,
  HStack,
  ButtonGroup
} from '@chakra-ui/react'
import { useColorModeValue } from '@/components/ui/color-mode'
import QuantO from '../../assets/images/QuantilytixO.png'
import { FiEye, FiEyeOff, FiLock, FiArrowLeft } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { auth, db } from '@/firebase/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { message, Spin } from 'antd'

const MotionBox = motion(Box)

export const BackButton = () => (
  <Button
    as={RouterLink}
    to='/'
    size='xs'
    colorPalette='teal'
    variant='ghost'
    rounded='full'
    _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
    _active={{ transform: 'translateY(0)' }}
  >
    <FiArrowLeft />
  </Button>
)

const Field = ({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}) => {
  const textColor = useColorModeValue('gray.100', 'gray.100')
  return (
    <Box>
      <Text mb={1} fontWeight='bold' color={textColor}>
        {label}
      </Text>
      {children}
    </Box>
  )
}

const PasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  isDisabled = false
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  isDisabled?: boolean
}) => {
  const [show, setShow] = useState(false)
  const textColor = useColorModeValue('gray.100', 'gray.100')

  return (
    <Field label={label}>
      <HStack spacing={0} bg='gray.700' borderRadius='md'>
        <Input
          flex='1'
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          bg='transparent'
          border={0}
          color={textColor}
          _focus={{ outline: 'none' }}
          value={value}
          onChange={e => onChange(e.target.value)}
          isDisabled={isDisabled}
        />
        <IconButton
          aria-label='Toggle visibility'
          bg='transparent'
          colorPalette='teal'
          _hover={{ bg: 'transparent' }}
          onClick={() => setShow(!show)}
          isDisabled={isDisabled}
        >
          {show ? <FiEyeOff /> : <FiEye />}
        </IconButton>
      </HStack>
      <Text
        mt={1}
        fontSize='sm'
        color='gray.400'
        display='flex'
        alignItems='center'
      >
        <FiLock style={{ marginRight: '6px' }} /> Your credentials are
        encrypted.
      </Text>
    </Field>
  )
}

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // Fetch user profile, create if missing
  const fetchOrCreateUserProfile = async (uid: string, authUser: any) => {
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      return userSnap.data()
    } else {
      // Auto-create minimal profile from Auth
      const newProfile = {
        fullName: authUser.displayName ?? '',
        email: authUser.email,
        createdAt: serverTimestamp()
      }
      await setDoc(userRef, newProfile)
      return newProfile
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await signInWithEmailAndPassword(auth, email, password)
      await fetchOrCreateUserProfile(res.user.uid, res.user)
      message.success('Login successful!')
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err.message)
      console.log(err)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      await fetchOrCreateUserProfile(res.user.uid, res.user)
      message.success('Signed in with Google!')
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  const bg = useColorModeValue('gray.900', 'gray.900')
  const cardBg = useColorModeValue('gray.800', 'gray.800')
  const textColor = useColorModeValue('gray.100', 'gray.100')

  return (
    <Flex
      minH='100vh'
      bg={bg}
      align='center'
      justify='center'
      position='relative'
      px={4}
    >
      {/* Spinner Overlay */}
      {loading && (
        <Box
          position='fixed'
          zIndex={9999}
          inset={0}
          display='flex'
          alignItems='center'
          justifyContent='center'
          bg='rgba(30,30,30,0.45)'
        >
          <Spin size='large' tip='Logging in...' />
        </Box>
      )}

      {/* Logo */}
      <Image
        src={QuantO}
        alt='Steij'
        position='absolute'
        bottom={4}
        right={4}
        w={150}
        opacity={0.7}
        pointerEvents='none'
      />

      <MotionBox
        w={{ base: 'full', md: '480px' }}
        bg={cardBg}
        p={8}
        borderRadius='lg'
        boxShadow='lg'
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <HStack>
          <BackButton />
          <Stack>
            <Heading size='xl' letterSpacing='tight'>
              <Highlight query='with speed' styles={{ color: 'teal.600' }}>
                Track social media presence with speed
              </Highlight>
            </Heading>
            <Text
              fontSize='md'
              color='fg.muted'
              style={{ textAlign: 'center' }}
            >
              Login to your account
            </Text>
          </Stack>
        </HStack>

        <VStack spacing={4} align='stretch' style={{ marginTop: 20 }}>
          <Field label='Email Address'>
            <Input
              placeholder='user@example.com'
              bg='gray.700'
              border={0}
              color={textColor}
              value={email}
              onChange={e => setEmail(e.target.value)}
              isDisabled={loading}
            />
          </Field>
          <PasswordField
            label='Password'
            placeholder='••••••••'
            value={password}
            onChange={setPassword}
            isDisabled={loading}
          />

          <ButtonGroup grow size='sm' variant='outline'>
            <Button
              size='lg'
              variant='surface'
              colorPalette={'cyan'}
              rounded='full'
              mt={2}
              _hover={{ transform: 'translateY(-2px)' }}
              onClick={handleLogin}
              loading={loading}
              disabled={!email || !password || loading}
            >
              Login
            </Button>
            <Button
              size='lg'
              variant='solid'
              colorScheme='red'
              rounded='full'
              mt={2}
              onClick={handleGoogleLogin}
              loading={loading}
              disabled={loading}
            >
              Sign in with Google
            </Button>
          </ButtonGroup>
          <Text style={{ marginTop: 5, textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link as={RouterLink} to='/register' colorPalette='teal'>
              Register
            </Link>
          </Text>
        </VStack>
      </MotionBox>
    </Flex>
  )
}

export default LoginPage
