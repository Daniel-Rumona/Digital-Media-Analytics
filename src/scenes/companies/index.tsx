import { useEffect, useState } from 'react'
import { Table, Button, Tag, Space, Spin } from 'antd'
import { db } from '@/firebase/firebase'
import { collection, getDocs, DocumentData } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  LinkOutlined
} from '@ant-design/icons'
import CompanyManageModal from './CompanyManageModal'

// --- Types ---
type Account = {
  platform: string
  handle: string
  connected: boolean
}

type Company = {
  id: string
  companyName: string
  accounts: Account[]
}

const CompaniesTable = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editCompany, setEditCompany] = useState<Company | null>(null)
  const [modalKey, setModalKey] = useState<number>(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState<boolean>(true)

  // Listen for auth changes and set userId
  useEffect(() => {
    const auth = getAuth()
    const unsub = onAuthStateChanged(auth, user => {
      if (user) {
        setUserId(user.uid)
      } else {
        setUserId(null)
      }
      setAuthLoading(false)
    })
    return () => unsub()
  }, [])

  // Fetch companies only when userId is present
  const fetchCompanies = async () => {
    if (!userId) return
    const snap = await getDocs(collection(db, 'users', userId, 'companies'))
    setCompanies(
      snap.docs.map(doc => {
        const data = doc.data() as Omit<Company, 'id'>
        return {
          id: doc.id,
          ...data,
          accounts: Array.isArray(data.accounts)
            ? data.accounts.map(a => ({
                platform: a.platform,
                handle: a.handle,
                connected: !!a.connected
              }))
            : []
        }
      })
    )
  }

  useEffect(() => {
    if (userId) fetchCompanies()
    // eslint-disable-next-line
  }, [userId])

  // Table columns
  const columns = [
    { title: 'Company', dataIndex: 'companyName', key: 'companyName' },
    {
      title: 'Platforms',
      dataIndex: 'accounts',
      key: 'accounts',
      render: (accounts: Account[]) =>
        accounts && accounts.length > 0 ? (
          accounts.map(acc => (
            <Tag key={acc.platform} color='blue'>
              {acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1)}
            </Tag>
          ))
        ) : (
          <span style={{ color: '#bbb' }}>None</span>
        )
    },
    {
      title: 'Handles',
      dataIndex: 'accounts',
      key: 'handles',
      render: (accounts: Account[]) =>
        accounts && accounts.length > 0 ? (
          accounts.map(acc => (
            <Tag key={acc.handle} color='purple'>
              {acc.handle}
            </Tag>
          ))
        ) : (
          <span style={{ color: '#bbb' }}>None</span>
        )
    },
    {
      title: 'Connected',
      dataIndex: 'accounts',
      key: 'connected',
      render: (accounts: Account[]) =>
        accounts && accounts.length > 0 ? (
          <Tag color='green'>
            {accounts.filter(acc => acc.connected).length} / {accounts.length}
          </Tag>
        ) : (
          <span style={{ color: '#bbb' }}>0 / 0</span>
        )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Company) => (
        <Space>
          <Button
            size='small'
            onClick={() => {
              setEditCompany(record)
              setShowModal(true)
              setModalKey(prev => prev + 1)
            }}
          >
            Manage
          </Button>
        </Space>
      )
    }
  ]

  // Expandable row: platforms with status/connect
  const expandedRowRender = (company: Company) => (
    <Table<Account>
      size='small'
      columns={[
        {
          title: 'Platform',
          dataIndex: 'platform',
          key: 'platform'
        },
        {
          title: 'Handle',
          dataIndex: 'handle',
          key: 'handle'
        },
        {
          title: 'Connected',
          dataIndex: 'connected',
          key: 'connected',
          render: (connected: boolean) =>
            connected ? (
              <Tag
                icon={<CheckCircleTwoTone twoToneColor='#52c41a' />}
                color='success'
              >
                Connected
              </Tag>
            ) : (
              <Tag
                icon={<CloseCircleTwoTone twoToneColor='#faad14' />}
                color='warning'
              >
                Not Connected
              </Tag>
            )
        },
        {
          title: 'OAuth',
          key: 'oauth',
          render: (_: any, acc: Account, idx: number) => (
            <Button
              type={acc.connected ? 'default' : 'primary'}
              size='small'
              icon={<LinkOutlined />}
              onClick={() => {
                setEditCompany(company)
                setShowModal(true)
                setModalKey(prev => prev + 1)
                setTimeout(() => {
                  document
                    .getElementById(`connect-btn-${company.id}-${idx}`)
                    ?.click()
                }, 400)
              }}
            >
              {acc.connected ? 'Reconnect' : 'Connect'}
            </Button>
          )
        }
      ]}
      dataSource={company.accounts?.map((a, idx) => ({ ...a, key: idx })) || []}
      pagination={false}
      rowKey='key'
    />
  )

  // Loading spinner while auth loads
  if (authLoading) return <Spin tip='Loading user...' />

  // Optional: show login notice if userId is still missing
  if (!userId) return <div>Please log in to manage your companies.</div>

  return (
    <>
      <Button
        type='primary'
        style={{ marginBottom: 16 }}
        onClick={() => {
          setEditCompany(null)
          setShowModal(true)
          setModalKey(prev => prev + 1)
        }}
      >
        Add Company
      </Button>
      <Table<Company>
        columns={columns}
        dataSource={companies}
        rowKey='id'
        expandable={{ expandedRowRender }}
      />
      <CompanyManageModal
        key={modalKey}
        open={showModal || !!editCompany}
        onCancel={() => {
          setShowModal(false)
          setEditCompany(null)
          fetchCompanies()
        }}
        onComplete={() => {
          setShowModal(false)
          setEditCompany(null)
          fetchCompanies()
        }}
        userId={userId}
        company={editCompany}
      />
    </>
  )
}

export default CompaniesTable
