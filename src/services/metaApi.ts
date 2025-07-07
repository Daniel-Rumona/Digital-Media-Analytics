// Meta API Integration Service
import axios from 'axios'

export interface MetaTokens {
  accessToken: string
  pageAccessToken?: string
  expiresIn?: number
  refreshToken?: string
}

export interface FacebookPageData {
  id: string
  name: string
  access_token: string
  category: string
  tasks: string[]
}

export interface InstagramBusinessAccount {
  id: string
  name: string
  username: string
}

export interface FacebookInsights {
  page_views: number
  page_likes: number
  page_followers_count: number
  page_impressions: number
  page_engaged_users: number
  page_post_engagements: number
  page_posts_impressions: number
  page_video_views: number
}

export interface InstagramInsights {
  reach: number
  impressions: number
  profile_views: number
  website_clicks: number
  follower_count: number
  media_count: number
}

class MetaApiService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0'
  
  // Step 1: Get Facebook Login URL
  getLoginUrl(appId: string, redirectUri: string): string {
    const scope = [
      'pages_read_engagement',
      'pages_show_list',
      'instagram_basic',
      'instagram_manage_insights',
      'read_insights',
      'business_management'
    ].join(',')
    
    return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code`
  }

  // Step 2: Exchange code for access token
  async exchangeCodeForToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string
  ): Promise<MetaTokens> {
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/access_token`, {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code
        }
      })
      return response.data
    } catch (error) {
      console.error('Token exchange failed:', error)
      throw new Error('Failed to exchange code for token')
    }
  }

  // Step 3: Get user's Facebook pages
  async getUserPages(accessToken: string): Promise<FacebookPageData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,category,tasks'
        }
      })
      return response.data.data
    } catch (error) {
      console.error('Failed to fetch pages:', error)
      throw new Error('Failed to fetch Facebook pages')
    }
  }

  // Step 4: Get Instagram Business Account connected to page
  async getInstagramAccount(pageId: string, pageAccessToken: string): Promise<InstagramBusinessAccount | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/${pageId}`, {
        params: {
          access_token: pageAccessToken,
          fields: 'instagram_business_account{id,name,username}'
        }
      })
      return response.data.instagram_business_account || null
    } catch (error) {
      console.error('Failed to fetch Instagram account:', error)
      return null
    }
  }

  // Step 5: Fetch Facebook Page Insights
  async getFacebookInsights(
    pageId: string,
    pageAccessToken: string,
    since: string,
    until: string
  ): Promise<FacebookInsights> {
    try {
      const metrics = [
        'page_views',
        'page_likes',
        'page_followers_count',
        'page_impressions',
        'page_engaged_users',
        'page_post_engagements',
        'page_posts_impressions',
        'page_video_views'
      ]

      const response = await axios.get(`${this.baseUrl}/${pageId}/insights`, {
        params: {
          access_token: pageAccessToken,
          metric: metrics.join(','),
          since,
          until,
          period: 'total_over_range'
        }
      })

      // Transform API response to our format
      const insights: Partial<FacebookInsights> = {}
      response.data.data.forEach((metric: any) => {
        const value = metric.values[0]?.value || 0
        insights[metric.name as keyof FacebookInsights] = value
      })

      return insights as FacebookInsights
    } catch (error) {
      console.error('Failed to fetch Facebook insights:', error)
      throw new Error('Failed to fetch Facebook insights')
    }
  }

  // Step 6: Fetch Instagram Insights
  async getInstagramInsights(
    instagramAccountId: string,
    accessToken: string,
    since: string,
    until: string
  ): Promise<InstagramInsights> {
    try {
      const metrics = [
        'reach',
        'impressions',
        'profile_views',
        'website_clicks',
        'follower_count'
      ]

      const response = await axios.get(`${this.baseUrl}/${instagramAccountId}/insights`, {
        params: {
          access_token: accessToken,
          metric: metrics.join(','),
          since,
          until,
          period: 'total_over_range'
        }
      })

      const insights: Partial<InstagramInsights> = {}
      response.data.data.forEach((metric: any) => {
        const value = metric.values[0]?.value || 0
        insights[metric.name as keyof InstagramInsights] = value
      })

      // Get media count separately
      const mediaResponse = await axios.get(`${this.baseUrl}/${instagramAccountId}/media`, {
        params: {
          access_token: accessToken,
          since,
          until,
          fields: 'id'
        }
      })
      insights.media_count = mediaResponse.data.data.length

      return insights as InstagramInsights
    } catch (error) {
      console.error('Failed to fetch Instagram insights:', error)
      throw new Error('Failed to fetch Instagram insights')
    }
  }

  // Helper: Convert insights to our metrics format
  convertFacebookInsights(insights: FacebookInsights): Record<string, number> {
    return {
      'views': insights.page_views || 0,
      'reach': insights.page_impressions || 0,
      'content interactions': insights.page_post_engagements || 0,
      'link clicks': 0, // Not directly available, would need post-level data
      'visits': insights.page_views || 0,
      'new follows': insights.page_likes || 0,
      'posts': 0 // Would need separate API call for post count
    }
  }

  convertInstagramInsights(insights: InstagramInsights): Record<string, number> {
    return {
      'views': insights.impressions || 0,
      'reach': insights.reach || 0,
      'content interactions': 0, // Would need post-level engagement data
      'link clicks': insights.website_clicks || 0,
      'visits': insights.profile_views || 0,
      'new follows': insights.follower_count || 0,
      'posts': insights.media_count || 0
    }
  }
}

export const metaApiService = new MetaApiService()