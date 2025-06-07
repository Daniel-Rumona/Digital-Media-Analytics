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
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiArrowLeft,
  FiUserPlus
} from 'react-icons/fi'
import { motion } from 'framer-motion'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/firebase/firebase'
import OnboardingModal from './onboarding'
import { message, Spin } from 'antd'

const MotionBox = motion(Box)

interface FieldProps {
  label: string
  children: React.ReactNode
}
const Field = ({ label, children }: FieldProps) => {
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

interface PasswordFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  isDisabled?: boolean
}
const PasswordField = ({
  label,
  placeholder,
  value,
  onChange,
  isDisabled = false
}: PasswordFieldProps) => {
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
          colorScheme='teal'
          _hover={{ bg: 'transparent' }}
          onClick={() => setShow(!show)}
          isDisabled={isDisabled}
          icon={show ? <FiEyeOff /> : <FiEye />}
        />
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

export const BackButton = () => (
  <Button
    as={RouterLink}
    to='/'
    size='xs'
    colorScheme='teal'
    variant='ghost'
    rounded='full'
    _hover={{ transform: 'translateY(-1px)', boxShadow: 'lg' }}
    _active={{ transform: 'translateY(0)' }}
    leftIcon={<FiArrowLeft />}
  >
    Back
  </Button>
)

const RegistrationPage = () => {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  // Email/Password Registration
  const handleRegister = async (): Promise<void> => {
    if (password !== confirmPassword) {
      message.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', res.user.uid), {
        fullName,
        email,
        createdAt: serverTimestamp()
      })
      setUserId(res.user.uid)
      setShowOnboarding(true)
      message.success('Registration successful!')
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  // Google Registration
  const handleGoogleRegister = async (): Promise<void> => {
    setLoading(true)
    try {
      const provider = new GoogleAuthProvider()
      const res = await signInWithPopup(auth, provider)
      await setDoc(
        doc(db, 'users', res.user.uid),
        {
          fullName: res.user.displayName ?? '',
          email: res.user.email,
          createdAt: serverTimestamp()
        },
        { merge: true }
      )
      setUserId(res.user.uid)
      setShowOnboarding(true)
      message.success('Signed up with Google!')
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    navigate('/dashboard')
  }

  const bg = useColorModeValue('gray.900', 'gray.900')
  const cardBg = useColorModeValue('gray.800', 'gray.800')
  const textColor = useColorModeValue('gray.100', 'gray.100')

  const canRegister =
    !!fullName &&
    !!email &&
    !!password &&
    !!confirmPassword &&
    password === confirmPassword &&
    !loading

  return (
    <Flex
      minH='100vh'
      bg={bg}
      align='center'
      justify='center'
      position='relative'
      px={4}
    >
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
          <Spin size='large' tip='Creating account...' />
        </Box>
      )}

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
              Create your account
            </Text>
          </Stack>
        </HStack>

        <VStack spacing={4} align='stretch' style={{ marginTop: 20 }}>
          <Field label='Full Name'>
            <Input
              placeholder='John Doe'
              bg='gray.700'
              border={0}
              color={textColor}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              isDisabled={loading}
            />
          </Field>
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
          <PasswordField
            label='Confirm Password'
            placeholder='••••••••'
            value={confirmPassword}
            onChange={setConfirmPassword}
            isDisabled={loading}
          />

          <ButtonGroup width='100%' size='sm' variant='outline' spacing={2}>
            <Button
              size='lg'
              variant='outline'
              colorScheme='cyan'
              rounded='full'
              mt={2}
              _hover={{ transform: 'translateY(-2px)' }}
              onClick={handleRegister}
              isLoading={loading}
              loadingText='Registering'
              isDisabled={!canRegister}
              leftIcon={<FiUserPlus />}
            >
              Register
            </Button>
            <Button
              size='lg'
              variant='solid'
              colorScheme='red'
              rounded='full'
              mt={2}
              onClick={handleGoogleRegister}
              isLoading={loading}
              loadingText='Registering'
              isDisabled={loading}
            >
              Sign up with Google
            </Button>
          </ButtonGroup>
          <Text style={{ marginTop: 5, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link as={RouterLink} to='/login' color='teal.400'>
              Login
            </Link>
          </Text>
        </VStack>
      </MotionBox>

      {/* ONBOARDING MODAL */}
      {userId && (
        <OnboardingModal
          open={showOnboarding}
          userId={userId}
          onComplete={handleOnboardingComplete}
        />
      )}
    </Flex>
  )
}

export default RegistrationPage
