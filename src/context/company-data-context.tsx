import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'
import { collection, query, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '@/firebase/firebase'

type CompanyData = {
  id: string
  companyName: string
  accounts: Array<{
    platform: string
    handle: string
    metrics: string[]
    connected?: boolean
    oauth?: any
  }>
}

type ContextType = {
  user: any
  companies: CompanyData[]
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string) => void
  companyData: CompanyData | null
  loading: boolean
  refreshCompanyData: () => void
}

const CompanyDataContext = createContext<ContextType | null>(null)

export const useCompanyData = () => {
  const ctx = useContext(CompanyDataContext)
  if (!ctx)
    throw new Error('useCompanyData must be used inside CompanyDataProvider')
  return ctx
}

export const CompanyDataProvider = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  )
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(false)

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser)
      // Reset everything if user changes/logs out
      setCompanies([])
      setSelectedCompanyId(null)
      setCompanyData(null)
    })
    return () => unsubscribe()
  }, [])

  // Fetch all companies for the current user
  const fetchCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([])
      setCompanyData(null)
      setSelectedCompanyId(null)
      return
    }
    setLoading(true)
    const q = query(collection(db, 'users', user.uid, 'companies'))
    const snap = await getDocs(q)
    const data: CompanyData[] = []
    snap.forEach(docSnap => {
      data.push({ id: docSnap.id, ...docSnap.data() } as CompanyData)
    })
    setCompanies(data)
    setLoading(false)
    // If user has companies, and none is selected, select the first
    if (data.length > 0) {
      setSelectedCompanyId(prev =>
        prev && data.find(d => d.id === prev) ? prev : data[0].id
      )
    } else {
      setSelectedCompanyId(null)
    }
  }, [user])

  // When companies or selectedCompanyId changes, update companyData
  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyData(null)
      return
    }
    const current = companies.find(c => c.id === selectedCompanyId)
    setCompanyData(current || null)
  }, [selectedCompanyId, companies])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Helper to refresh just companyData (can be called from components)
  const refreshCompanyData = useCallback(() => {
    if (!selectedCompanyId) return
    const current = companies.find(c => c.id === selectedCompanyId)
    setCompanyData(current || null)
  }, [selectedCompanyId, companies])

  return (
    <CompanyDataContext.Provider
      value={{
        user,
        companies,
        selectedCompanyId,
        setSelectedCompanyId,
        companyData,
        loading,
        refreshCompanyData
      }}
    >
      {children}
    </CompanyDataContext.Provider>
  )
}
