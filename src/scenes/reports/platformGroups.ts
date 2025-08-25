import type { ChartGroup } from "./types"

export const PLATFORM_CHART_GROUPS: Record<string, ChartGroup[]> = {
  google: [
    { title: 'Website & Booking Clicks', metrics: ['website clicks', 'booking clicks'] },
    { title: 'Reviews & Calls',         metrics: ['reviews', 'calls'] },
    { title: 'Views & Search Hits',     metrics: ['views', 'search hits'] },
    { title: 'Directions & Chat Clicks',metrics: ['directions', 'chat clicks'] },
    { title: 'Rating',                  metrics: ['rating'] }
  ],
  facebook: [
    { title: 'Views & Interactions',    metrics: ['views', 'content interactions'] },
    { title: 'Posts & Reach',           metrics: ['posts', 'reach'] },
    { title: 'Content & Link Clicks',   metrics: ['content interactions', 'link clicks'] },
    { title: 'Visits & New Follows',    metrics: ['visits', 'new follows'] }
  ],
  instagram: [
    { title: 'Views & Interactions',    metrics: ['views', 'content interactions'] },
    { title: 'Posts & Reach',           metrics: ['posts', 'reach'] },
    { title: 'Content & Link Clicks',   metrics: ['content interactions', 'link clicks'] },
    { title: 'Visits & New Follows',    metrics: ['visits', 'new follows'] }
  ],
  tiktok: [
    { title: 'Posts, New Follows & Post Views', metrics: ['posts', 'new follows', 'post views'] },
    { title: 'Profile Views, Likes & Comments', metrics: ['profile views', 'likes', 'comments'] },
    { title: 'Shares',                           metrics: ['shares'] }
  ],
  x: [
    { title: 'New Follows, Posts & Views',      metrics: ['new follows', 'posts', 'views'] },
    { title: 'Likes & Shares',                  metrics: ['likes', 'shares'] }
  ]
}
