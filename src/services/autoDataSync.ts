import { metaApiService } from './metaApi'
import { db } from '@/firebase/firebase'
import { collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore'
import dayjs from 'dayjs'

export interface ConnectedAccount {
  platform: 'facebook' | 'instagram'
  pageId?: string
  instagramId?: string
  accessToken: string
  handle: string
}

export class AutoDataSyncService {
  // Sync data for a specific month
  async syncMetricsForMonth(
    userId: string,
    companyId: string,
    accounts: ConnectedAccount[],
    targetMonth: string // YYYY-MM format
  ): Promise<void> {
    const startDate = dayjs(targetMonth, 'YYYY-MM').startOf('month')
    const endDate = dayjs(targetMonth, 'YYYY-MM').endOf('month')
    
    const since = startDate.format('YYYY-MM-DD')
    const until = endDate.format('YYYY-MM-DD')

    for (const account of accounts) {
      try {
        let metrics: Record<string, number> = {}

        if (account.platform === 'facebook' && account.pageId) {
          const insights = await metaApiService.getFacebookInsights(
            account.pageId,
            account.accessToken,
            since,
            until
          )
          metrics = metaApiService.convertFacebookInsights(insights)
        } else if (account.platform === 'instagram' && account.instagramId) {
          const insights = await metaApiService.getInstagramInsights(
            account.instagramId,
            account.accessToken,
            since,
            until
          )
          metrics = metaApiService.convertInstagramInsights(insights)
        }

        // Save to Firestore
        const metricsRef = collection(
          db,
          'users',
          userId,
          'companies',
          companyId,
          'metrics'
        )

        // Check if data already exists for this platform/period
        const existingQuery = query(
          metricsRef,
          where('platform', '==', account.platform),
          where('period', '==', targetMonth)
        )
        const existingDocs = await getDocs(existingQuery)

        const docData = {
          platform: account.platform,
          period: targetMonth,
          metrics,
          lastSynced: new Date(),
          autoSynced: true
        }

        if (existingDocs.empty) {
          // Create new document
          await setDoc(doc(metricsRef), docData)
        } else {
          // Update existing document
          await setDoc(doc(metricsRef, existingDocs.docs[0].id), docData)
        }

        console.log(`✅ Synced ${account.platform} data for ${targetMonth}`)
      } catch (error) {
        console.error(`❌ Failed to sync ${account.platform} for ${targetMonth}:`, error)
      }
    }
  }

  // Sync last 6 months of data
  async syncHistoricalData(
    userId: string,
    companyId: string,
    accounts: ConnectedAccount[]
  ): Promise<void> {
    const months = []
    for (let i = 0; i < 6; i++) {
      months.push(dayjs().subtract(i, 'month').format('YYYY-MM'))
    }

    for (const month of months) {
      await this.syncMetricsForMonth(userId, companyId, accounts, month)
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Schedule automatic daily sync (you'd call this from a cron job or similar)
  async scheduleDailySync(
    userId: string,
    companyId: string,
    accounts: ConnectedAccount[]
  ): Promise<void> {
    const currentMonth = dayjs().format('YYYY-MM')
    await this.syncMetricsForMonth(userId, companyId, accounts, currentMonth)
  }
}

export const autoDataSync = new AutoDataSyncService()