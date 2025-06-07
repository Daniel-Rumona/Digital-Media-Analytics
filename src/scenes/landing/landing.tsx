import { Suspense, useRef } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Image,
  Button
} from '@chakra-ui/react'
import { useColorModeValue } from '@/components/ui/color-mode'
import offerPic from '../../assets/images/offer-pic.jpg'
import crossPlat from '../../assets/images/cross-plat.jpg'
import aiInsights from '../../assets/images/ai-insights.jpg'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF, Bounds } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'

// Motion-enabled Chakra components
const MotionBox = motion(Box)
const MotionHeading = motion(Heading)
const MotionText = motion(Text)
const MotionButton = motion(Button)

// Load and spin 3D model (auto-framed with <Bounds>)
const ThreeDModel = () => {
  const { scene } = useGLTF('/model/scene.gltf')
  const ref = useRef<THREE.Object3D>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.005
    }
  })

  return <primitive object={scene} ref={ref} scale={1} />
}

const features = [
  {
    title: 'Cross-Platform Tracking',
    image: crossPlat,
    description:
      'Monitor Facebook, Instagram, X and more from a single dashboard.'
  },
  {
    title: 'Real-Time Analytics',
    image: offerPic,
    description:
      'Visualize live metrics and trends with intelligent and interactive integrations.'
  },
  {
    title: 'AI-Driven Insights',
    image: aiInsights,
    description: 'Let AI summarize social media performance and spot anomalies.'
  }
]

const LandingPage = () => {
  const bg = useColorModeValue('gray.900', 'gray.900')
  const textColor = useColorModeValue('gray.100', 'gray.100')

  const navigate = useNavigate()

  return (
    <Box px={6} py={8} bg={bg} color={textColor} minH='100vh' overflow='hidden'>
      {/* Hero Section */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align='center'
        justify='space-between'
        mb={8}
      >
        <Box w={{ base: '100%', md: '48%' }} h='320px'>
          <Canvas style={{ height: '100%', width: '100%' }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[3, 2, 2]} />
            <Suspense fallback={null}>
              <Bounds fit clip observe margin={1.2}>
                <ThreeDModel />
              </Bounds>
            </Suspense>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </Box>
        <MotionBox
          w={{ base: '100%', md: '48%' }}
          mt={{ base: 6, md: 0 }}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <MotionHeading
            size='lg'
            mb={4}
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Steij | Digital Media Analytics
          </MotionHeading>
          <MotionText
            fontSize='md'
            mb={4}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Our system provides real-time insights and performance analytics
            across major social media platforms. Easily visualize your brand's
            digital presence with intuitive dashboards powered by AI.
          </MotionText>
          <MotionButton
            onClick={() => navigate('/register')}
            colorScheme='blue'
            px={8}
            py={4}
            whileHover={{
              scale: 1.1,
              rotate: -2,
              boxShadow: '0px 0px 12px rgba(0, 136, 255, 0.75)'
            }}
            whileTap={{ scale: 0.95, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            Explore
          </MotionButton>
        </MotionBox>
      </Flex>

      {/* Feature Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} columnGap={4}>
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * index, duration: 0.6 }}
          >
            <Box
              borderWidth='1px'
              borderRadius='lg'
              overflow='hidden'
              role='group'
              transition='all 0.3s ease'
              _hover={{ transform: 'scale(1.05)', boxShadow: 'xl' }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: 15,
                  justifyItems: 'center',
                  alignItems: 'center',
                  gap: 25
                }}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  h='180px'
                  w='180px'
                  rounded='full'
                  objectFit='fit'
                />
                <Heading size='xl' mb={2} style={{ textAlign: 'center' }}>
                  {feature.title}
                </Heading>
              </div>
              <Box p={4} textAlign='center'>
                <Text opacity={0.7} _groupHover={{ opacity: 1 }}>
                  {feature.description}
                </Text>
              </Box>
            </Box>
          </motion.div>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export default LandingPage
