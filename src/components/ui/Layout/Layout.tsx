import { useColorModeValue } from '@/components/ui/color-mode'
import { useState } from 'react'
import { Box, Flex, IconButton, Text, VStack, HStack } from '@chakra-ui/react'
import {
  FiMenu,
  FiHome,
  FiBarChart2,
  FiMessageCircle,
  FiSettings,
  FiClipboard,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi'

import {
  Divider,
  Avatar,
  Breadcrumb,
  Dropdown,
  Menu,
  message,
  Space
} from 'antd'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCompanyData } from '@/context/company-data-context'
import AccountDrawer from './AccountDrawer'
import { auth } from '@/firebase/firebase'
import {
  SettingOutlined,
  LogoutOutlined,
  DownOutlined
} from '@ant-design/icons'
import { signOut } from 'firebase/auth'
import CompanySetupModal from '../metrics'

const SidebarItems = [
  { label: 'Dashboard', icon: FiHome, path: '/dashboard' },
  { label: 'Post Analysis', icon: FiBarChart2, path: '/post-analysis' },
  {
    label: 'Sentiment Analysis',
    icon: FiMessageCircle,
    path: '/sentiment-analysis'
  },
  { label: 'Platform Insights', icon: FiTrendingUp, path: '/platforms' },
  { label: 'Report', icon: FiClipboard, path: '/report' },
  { label: 'Metrics Tracker', icon: FiSettings, path: '/metrics' },
  { label: 'Accounts Setup', icon: FiUsers, path: '/companies' }
]

const Sidebar = ({ collapsed, onToggle, onOpenCompanyModal }) => {
  const bg = useColorModeValue('gray.800', 'gray.900')
  const textColor = 'white'
  const { companies, selectedCompanyId, setSelectedCompanyId, companyData } =
    useCompanyData()

  // AntD Dropdown items for company switch
  const items = companies.map(c => ({
    key: c.id,
    label: c.companyName,
    onClick: () => setSelectedCompanyId(c.id)
  }))

  // Find the selected company
  const selectedCompany = companies.find(c => c.id === selectedCompanyId) ||
    companies[0] || { companyName: 'Select Company' }

  return (
    <Box
      as='nav'
      bg={bg}
      color={textColor}
      w={collapsed ? '80px' : '250px'}
      transition='width 0.3s ease'
      h='100vh'
      p={4}
      position='fixed'
      overflowY='auto'
    >
      <Flex justify='space-between' align='center' mb={4}>
        {!collapsed ? (
          <Dropdown
            menu={{ items }}
            trigger={['hover']}
            placement='bottomLeft'
            overlayStyle={{ minWidth: 140 }}
          >
            <a
              onClick={e => e.preventDefault()}
              style={{
                color: '#bae0ff',
                fontWeight: 600,
                fontSize: 18,
                cursor: 'pointer',
                padding: 0,
                background: 'none',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Space>
                {selectedCompany.companyName}
                <DownOutlined style={{ fontSize: 13, color: '#91caff' }} />
              </Space>
            </a>
          </Dropdown>
        ) : (
          <Dropdown
            menu={{ items }}
            trigger={['hover']}
            placement='bottomLeft'
            overlayStyle={{ minWidth: 70 }}
          >
            <a
              onClick={e => e.preventDefault()}
              style={{
                color: '#bae0ff',
                fontWeight: 700,
                fontSize: 22,
                cursor: 'pointer',
                padding: 0,
                background: 'none',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Space>
                <DownOutlined style={{ fontSize: 13, color: '#91caff' }} />
              </Space>
            </a>
          </Dropdown>
        )}
        <IconButton
          aria-label='Toggle Sidebar'
          size='sm'
          onClick={onToggle}
          variant='ghost'
          colorPalette='white'
        >
          <FiMenu />
        </IconButton>
      </Flex>

      <Divider style={{ borderColor: '#4A5568', marginBottom: '16px' }} />

      <VStack spacing={4} align='stretch'>
        {SidebarItems.map(item =>
          item.label === 'Metrics Tracker' ? (
            <HStack
              as='button'
              key={item.label}
              _hover={{ bg: 'gray.700' }}
              bg={location.pathname === item.path ? 'gray.700' : 'transparent'}
              p={2}
              borderRadius='md'
              cursor='pointer'
              spacing={collapsed ? 0 : 3}
              justify={collapsed ? 'center' : 'flex-start'}
              onClick={onOpenCompanyModal}
            >
              <item.icon />
              {!collapsed && <Text>{item.label}</Text>}
            </HStack>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              style={{ textDecoration: 'none' }}
            >
              {({ isActive }) => (
                <HStack
                  _hover={{ bg: 'gray.700' }}
                  bg={isActive ? 'gray.700' : 'transparent'}
                  p={2}
                  borderRadius='md'
                  cursor='pointer'
                  spacing={collapsed ? 0 : 3}
                  justify={collapsed ? 'center' : 'flex-start'}
                >
                  <item.icon />
                  {!collapsed && <Text>{item.label}</Text>}
                </HStack>
              )}
            </NavLink>
          )
        )}
      </VStack>
    </Box>
  )
}

const Topbar = ({ collapsed }) => {
  const { companyData } = useCompanyData()
  const location = useLocation()
  const path = location.pathname.replace('/', '')
  const routeLabel =
    SidebarItems.find(item => item.path.includes(path))?.label || 'Home'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState('account')
  const navigate = useNavigate()

  // -- Avatar Dropdown Menu
  const menu = (
    <Menu
      items={[
        {
          key: 'manage',
          icon: <SettingOutlined />,
          label: 'Manage Account',
          onClick: () => {
            setDrawerTab('account')
            setDrawerOpen(true)
          }
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Logout',
          onClick: async () => {
            await signOut(auth)
            message.success('Logged out!')
            navigate('/login')
          }
        }
      ]}
      style={{ background: '#181a20', color: '#fff', minWidth: 170 }}
    />
  )

  return (
    <>
      <Flex
        as='header'
        justify='space-between'
        align='center'
        px={6}
        py={4}
        ml={collapsed ? '80px' : '250px'}
        bg={useColorModeValue('white', 'gray.800')}
        borderBottom='1px solid'
        borderColor={useColorModeValue('gray.200', 'gray.700')}
        position='sticky'
        top='0'
        zIndex='1000'
      >
        <Breadcrumb
          items={[
            {
              title: (
                <a style={{ color: 'white' }} href='/dashboard'>
                  Digital Media Analytics
                </a>
              )
            },
            {
              title: <span style={{ color: 'dodgerblue' }}>{routeLabel}</span>
            }
          ]}
        />
        <Text
          fontSize='lg'
          fontWeight='bold'
          color='#fff'
          style={{
            background: '#181a20',
            padding: '6px 18px',
            borderRadius: 8
          }}
        >
          {companyData?.companyName || 'No Company'}
        </Text>
        <Dropdown overlay={menu} placement='bottomRight' trigger={['click']}>
          <Avatar
            src='https://bit.ly/sage-adebayo'
            style={{ cursor: 'pointer', border: '2px solid #096dd9' }}
          />
        </Dropdown>
      </Flex>

      <AccountDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tab={drawerTab}
        setTab={setDrawerTab}
      />
    </>
  )
}

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const toggleSidebar = () => setCollapsed(!collapsed)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const user = auth.currentUser

  return (
    <>
      <Sidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        onOpenCompanyModal={() => setShowCompanyModal(true)}
      />

      <Topbar collapsed={collapsed} />
      <Box
        ml={collapsed ? '80px' : '250px'}
        p={6}
        transition='margin-left 0.3s ease'
        bg={useColorModeValue('gray.50', 'gray.800')}
        minH='100vh'
      >
        {children}
      </Box>
      <CompanySetupModal
        open={showCompanyModal}
        userId={user?.uid || ''} // Pass the current user id
        onCancel={() => setShowCompanyModal(false)}
        // onComplete={() => setShowCompanyModal(false)}
      />
    </>
  )
}

export default Layout
