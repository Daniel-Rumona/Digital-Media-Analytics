import React, { useState, useMemo } from 'react'
import { Box, Flex, Text, Heading, HStack, Image } from '@chakra-ui/react'
import {
  Select,
  DatePicker,
  Spin,
  Card,
  Tooltip,
  Modal,
  Pagination,
  Tag
} from 'antd'
import {
  LikeOutlined,
  MessageOutlined,
  InteractionOutlined,
  RadarChartOutlined,
  EyeOutlined,
  FileTextOutlined,
  UsergroupAddOutlined,
  StarOutlined,
  PhoneOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  ShareAltOutlined,
  VideoCameraOutlined,
  StarFilled,
  SearchOutlined,
  PictureOutlined
} from '@ant-design/icons'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import dayjs from 'dayjs'

const { Option } = Select

// Helper to detect media type
const getMediaType = post => {
  if (post.video) return 'video'
  if (post.image) return 'image'
  if (post.plays) return 'video'
  return 'image'
}

const MEDIA_TYPE_ICON = {
  image: PictureOutlined,
  video: VideoCameraOutlined
}

const PLATFORM_POST_INTERACTIONS = {
  Facebook: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#52c41a' },
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageOutlined,
      color: '#38b2ac'
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: InteractionOutlined,
      color: '#f59e42'
    },
    {
      key: 'reach',
      label: 'Reach',
      icon: RadarChartOutlined,
      color: '#3b82f6'
    },
    { key: 'views', label: 'Views', icon: EyeOutlined, color: '#1890ff' }
  ],
  Instagram: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#e1306c' },
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageOutlined,
      color: '#3b82f6'
    },
    {
      key: 'impressions',
      label: 'Impressions',
      icon: RadarChartOutlined,
      color: '#f59e42'
    },
    { key: 'reach', label: 'Reach', icon: RadarChartOutlined, color: '#34d399' }
  ],
  X: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#fff' },
    {
      key: 'retweets',
      label: 'Retweets',
      icon: InteractionOutlined,
      color: '#1da1f2'
    },
    {
      key: 'quotes',
      label: 'Quotes',
      icon: FileTextOutlined,
      color: '#ffcd38'
    },
    {
      key: 'replies',
      label: 'Replies',
      icon: MessageOutlined,
      color: '#38b2ac'
    },
    {
      key: 'impressions',
      label: 'Impressions',
      icon: RadarChartOutlined,
      color: '#f59e42'
    }
  ],
  Google: [
    { key: 'rating', label: 'Rating', icon: StarFilled, color: '#fadb14' },
    { key: 'reviews', label: 'Reviews', icon: StarOutlined, color: '#fadb14' },
    {
      key: 'search_hits',
      label: 'Search Hits',
      icon: SearchOutlined,
      color: '#3182ce'
    },
    {
      key: 'website_clicks',
      label: 'Website Clicks',
      icon: LinkOutlined,
      color: '#2f54eb'
    },
    { key: 'calls', label: 'Calls', icon: PhoneOutlined, color: '#faad14' },
    {
      key: 'directions',
      label: 'Directions',
      icon: RadarChartOutlined,
      color: '#3b82f6'
    },
    { key: 'views', label: 'Views', icon: EyeOutlined, color: '#1890ff' }
  ],
  LinkedIn: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#0077b5' },
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageOutlined,
      color: '#005983'
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: ShareAltOutlined,
      color: '#003e63'
    },
    {
      key: 'impressions',
      label: 'Impressions',
      icon: RadarChartOutlined,
      color: '#6ec1e4'
    },
    {
      key: 'followers',
      label: 'Followers',
      icon: UsergroupAddOutlined,
      color: '#233c53'
    }
  ],
  TikTok: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#ee1d52' },
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageOutlined,
      color: '#69c9d0'
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: ShareAltOutlined,
      color: '#f59e42'
    },
    {
      key: 'plays',
      label: 'Plays',
      icon: PlayCircleOutlined,
      color: '#3b82f6'
    },
    {
      key: 'followers',
      label: 'Followers',
      icon: UsergroupAddOutlined,
      color: '#722ed1'
    }
  ],
  YouTube: [
    { key: 'likes', label: 'Likes', icon: LikeOutlined, color: '#ff0000' },
    {
      key: 'comments',
      label: 'Comments',
      icon: MessageOutlined,
      color: '#3b82f6'
    },
    {
      key: 'shares',
      label: 'Shares',
      icon: ShareAltOutlined,
      color: '#f59e42'
    },
    { key: 'views', label: 'Views', icon: EyeOutlined, color: '#ffcd38' },
    {
      key: 'subscribers',
      label: 'Subscribers',
      icon: UsergroupAddOutlined,
      color: '#ff0000'
    },
    {
      key: 'video',
      label: 'Video',
      icon: VideoCameraOutlined,
      color: '#d32f2f'
    }
  ]
}

const PLATFORMS = Object.keys(PLATFORM_POST_INTERACTIONS)
const SAMPLE_POSTS = [
  // Facebook
  {
    id: '1',
    platform: 'Facebook',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?fit=crop&w=500&q=80',
    caption: 'Our best post ever!',
    date: '2024-06-08',
    likes: 120,
    comments: 32,
    shares: 10,
    reach: 4500,
    views: 3200
  },
  {
    id: '2',
    platform: 'Facebook',
    image:
      'https://images.unsplash.com/photo-1454023492550-5696f8ff10e1?fit=crop&w=500&q=80',
    caption: 'Event highlights from yesterday.',
    date: '2024-06-08',
    likes: 75,
    comments: 18,
    shares: 5,
    reach: 3100,
    views: 2200
  },
  // Instagram
  {
    id: '3',
    platform: 'Instagram',
    image:
      'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?fit=crop&w=500&q=80',
    caption: 'Behind the scenes at the office!',
    date: '2024-06-08',
    likes: 200,
    comments: 60,
    impressions: 5000,
    reach: 4200
  },
  {
    id: '4',
    platform: 'Instagram',
    image:
      'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?fit=crop&w=500&q=80',
    caption: 'Team lunch vibes 🍕',
    date: '2024-06-08',
    likes: 150,
    comments: 37,
    impressions: 3400,
    reach: 2980
  },
  // X
  {
    id: '5',
    platform: 'X',
    image:
      'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?fit=crop&w=500&q=80',
    caption: 'Hot take of the day!',
    date: '2024-06-08',
    likes: 90,
    retweets: 22,
    replies: 9,
    quotes: 4,
    impressions: 2100
  },
  {
    id: '6',
    platform: 'X',
    image:
      'https://images.unsplash.com/photo-1465101178521-c1a9136a01b6?fit=crop&w=500&q=80',
    caption: 'Thank you for 10K followers!',
    date: '2024-06-08',
    likes: 250,
    retweets: 55,
    replies: 27,
    quotes: 7,
    impressions: 5900
  },
  // Google
  {
    id: '7',
    platform: 'Google',
    image:
      'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?fit=crop&w=500&q=80',
    caption: 'Google search is up by 12%.',
    date: '2024-06-08',
    rating: 4.8,
    reviews: 29,
    search_hits: 2900,
    website_clicks: 280,
    calls: 14,
    directions: 33,
    views: 9100
  },
  {
    id: '8',
    platform: 'Google',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?fit=crop&w=500&q=80',
    caption: '5-star review from our latest customer!',
    date: '2024-06-08',
    rating: 5.0,
    reviews: 120,
    search_hits: 4100,
    website_clicks: 350,
    calls: 25,
    directions: 20,
    views: 10500
  },
  // LinkedIn
  {
    id: '9',
    platform: 'LinkedIn',
    image:
      'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?fit=crop&w=500&q=80',
    caption: 'Excited to announce our new partnership.',
    date: '2024-06-08',
    likes: 45,
    comments: 9,
    shares: 2,
    impressions: 990,
    followers: 3200
  },
  {
    id: '10',
    platform: 'LinkedIn',
    image:
      'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?fit=crop&w=500&q=80',
    caption: 'Meet our new team member, Sarah!',
    date: '2024-06-08',
    likes: 32,
    comments: 12,
    shares: 1,
    impressions: 800,
    followers: 3250
  },
  // TikTok
  {
    id: '11',
    platform: 'TikTok',
    image:
      'https://images.unsplash.com/photo-1454023492550-5696f8ff10e1?fit=crop&w=500&q=80',
    caption: 'Trending now: office dance challenge 💃',
    date: '2024-06-08',
    likes: 780,
    comments: 130,
    shares: 65,
    plays: 9100,
    followers: 15100
  },
  // YouTube
  {
    id: '12',
    platform: 'YouTube',
    image:
      'https://images.unsplash.com/photo-1465101178521-c1a9136a01b6?fit=crop&w=500&q=80',
    caption: 'Watch our new product demo!',
    date: '2024-06-08',
    likes: 1020,
    comments: 89,
    shares: 44,
    views: 28900,
    subscribers: 5600,
    video: 1
  },
  {
    id: '13',
    platform: 'YouTube',
    image:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?fit=crop&w=500&q=80',
    caption: 'Live Q&A session replay!',
    date: '2024-06-08',
    likes: 870,
    comments: 74,
    shares: 32,
    views: 17500,
    subscribers: 5700,
    video: 1
  }
]

// For demo, return a random 7-day trend for each post metric
function getFakeTrend (metric) {
  // Random walk around the metric value
  const vals = []
  let v = Math.max(1, Math.floor(Math.random() * 20) + 0.7 * metric)
  for (let i = 0; i < 7; ++i) {
    v = Math.max(1, v + Math.floor(Math.random() * 8 - 3))
    vals.push(v)
  }
  return vals
}

const PAGE_SIZE = 6 // Number of cards per page

const PostAnalysis = () => {
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0])
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [loading, setLoading] = useState(false)
  const [modalPost, setModalPost] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const posts = useMemo(
    () =>
      SAMPLE_POSTS.filter(
        post =>
          post.platform === selectedPlatform &&
          dayjs(post.date).isSame(selectedDate, 'day')
      ),
    [selectedPlatform, selectedDate]
  )

  const interactions = PLATFORM_POST_INTERACTIONS[selectedPlatform] || []

  // Pagination logic
  const total = posts.length
  const paginatedPosts = posts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  // Mini trend chart config
  const makeTrendChart = (trendData, color, metricName) => ({
    chart: {
      type: 'spline',
      backgroundColor: 'transparent',
      height: 60,
      margin: [2, 8, 8, 8]
    },
    title: { text: '' },
    xAxis: { visible: false },
    yAxis: { visible: false, min: 0 },
    series: [
      {
        data: trendData,
        color,
        marker: { enabled: false },
        name: metricName
      }
    ],
    credits: { enabled: false },
    legend: { enabled: false },
    tooltip: { enabled: false }
  })

  // Reset page when platform/date changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [selectedPlatform, selectedDate])

  return (
    <Box minH='100vh' py={6} px={{ base: 2, md: 8 }}>
      <Heading size='lg' mb={6}>
        Post Analysis
      </Heading>
      <Flex gap={4} mb={6} wrap='wrap'>
        <Select
          value={selectedPlatform}
          onChange={v => {
            setSelectedPlatform(v)
            setCurrentPage(1)
          }}
          style={{ width: 180 }}
        >
          {PLATFORMS.map(p => (
            <Option key={p} value={p}>
              {p}
            </Option>
          ))}
        </Select>
        <DatePicker
          value={selectedDate}
          onChange={d => {
            setSelectedDate(d)
            setCurrentPage(1)
          }}
          style={{ minWidth: 160 }}
          allowClear={false}
        />
      </Flex>
      {loading ? (
        <Spin />
      ) : (
        <>
          <Flex wrap='wrap' gap='28px'>
            {paginatedPosts.map(post => {
              const MediaIcon = MEDIA_TYPE_ICON[getMediaType(post)]
              return (
                <Card
                  key={post.id}
                  style={{
                    background: '#22232b',
                    color: '#fff',
                    borderRadius: 12,
                    width: 340,
                    marginBottom: 24,
                    boxShadow: '0 1px 8px 0 rgba(0,0,0,0.14)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.15s'
                  }}
                  hoverable
                  onClick={() => setModalPost(post)}
                  bodyStyle={{ paddingBottom: 16 }}
                >
                  {/* Platform and date row */}
                  <Flex justify='space-between' align='center' mb={2}>
                    <Tag color='#3182ce' style={{ fontWeight: 500 }}>
                      {post.platform}
                    </Tag>
                    <Tag color='gray'>
                      {dayjs(post.date).format('YYYY-MM-DD')}
                    </Tag>
                  </Flex>

                  {/* Media badge */}
                  <Flex align='center' mb={2} gap={2}>
                    <Tooltip title={getMediaType(post)}>
                      <span>
                        <MediaIcon
                          style={{
                            color:
                              getMediaType(post) === 'video'
                                ? '#f87171'
                                : '#4299e1',
                            fontSize: 18
                          }}
                        />
                      </span>
                    </Tooltip>
                    <Text fontSize='xs' color='gray.400' ml={1}>
                      {getMediaType(post).toUpperCase()}
                    </Text>
                  </Flex>
                  <Image
                    src={post.image}
                    alt='Post'
                    rounded='lg'
                    mb={2}
                    h='140px'
                    objectFit='cover'
                    w='100%'
                  />
                  <Text fontWeight='bold' mb={1} noOfLines={2}>
                    {post.caption}
                  </Text>
                  {/* Metrics */}
                  <HStack gap={5} mt={2} mb={1} flexWrap='wrap'>
                    {interactions.map(interaction =>
                      post[interaction.key] !== undefined ? (
                        <Flex key={interaction.key} align='center' gap={1}>
                          <Tooltip title={interaction.label}>
                            <interaction.icon
                              style={{ color: interaction.color, fontSize: 20 }}
                            />
                          </Tooltip>
                          <Text ml={1}>{post[interaction.key]}</Text>
                        </Flex>
                      ) : null
                    )}
                  </HStack>
                  {/* Mini Trend for main metric */}
                  {interactions[0] && post[interactions[0].key] !== undefined && (
                    <Box mt={3}>
                      <Text fontSize='xs' color='gray.400' mb={0}>
                        7-day {interactions[0].label} trend
                      </Text>
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={makeTrendChart(
                          getFakeTrend(post[interactions[0].key]),
                          interactions[0].color,
                          interactions[0].label
                        )}
                      />
                    </Box>
                  )}
                </Card>
              )
            })}
          </Flex>
          {/* Pagination */}
          <Flex justify='center' mt={6}>
            <Pagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={total}
              onChange={page => setCurrentPage(page)}
              showSizeChanger={false}
              style={{ color: '#fff' }}
            />
          </Flex>
          {/* Modal for expanded post */}
          <Modal
            open={!!modalPost}
            onCancel={() => setModalPost(null)}
            footer={null}
            width={600}
          >
            {modalPost &&
              (() => {
                const MediaIcon = MEDIA_TYPE_ICON[getMediaType(modalPost)]
                return (
                  <Box p={6}>
                    <Flex justify='space-between' align='center' mb={2}>
                      <Tag color='#3182ce'>{modalPost.platform}</Tag>
                      <Tag color='gray'>
                        {dayjs(modalPost.date).format('YYYY-MM-DD')}
                      </Tag>
                    </Flex>
                    <Flex align='center' mb={3} gap={2}>
                      <Tooltip title={getMediaType(modalPost)}>
                        <span>
                          <MediaIcon
                            style={{
                              color:
                                getMediaType(modalPost) === 'video'
                                  ? '#f87171'
                                  : '#4299e1',
                              fontSize: 18
                            }}
                          />
                        </span>
                      </Tooltip>
                      <Text fontSize='xs' color='gray.400' ml={1}>
                        {getMediaType(modalPost).toUpperCase()}
                      </Text>
                    </Flex>
                    <Image
                      src={modalPost.image}
                      alt='Post'
                      rounded='lg'
                      mb={3}
                      h='180px'
                      objectFit='cover'
                      w='100%'
                    />
                    <Text fontWeight='bold' mb={3}>
                      {modalPost.caption}
                    </Text>
                    <HStack gap={7} mt={2} mb={2} flexWrap='wrap'>
                      {interactions.map(interaction =>
                        modalPost[interaction.key] !== undefined ? (
                          <Flex key={interaction.key} align='center' gap={1}>
                            <Tooltip title={interaction.label}>
                              <interaction.icon
                                style={{
                                  color: interaction.color,
                                  fontSize: 22
                                }}
                              />
                            </Tooltip>
                            <Text ml={1}>{modalPost[interaction.key]}</Text>
                          </Flex>
                        ) : null
                      )}
                    </HStack>
                    {/* Modal Trend for main metric */}
                    {interactions[0] &&
                      modalPost[interactions[0].key] !== undefined && (
                        <Box mt={5}>
                          <Text fontSize='sm' color='gray.400' mb={2}>
                            7-day {interactions[0].label} trend
                          </Text>
                          <HighchartsReact
                            highcharts={Highcharts}
                            options={makeTrendChart(
                              getFakeTrend(modalPost[interactions[0].key]),
                              interactions[0].color,
                              interactions[0].label
                            )}
                          />
                        </Box>
                      )}
                  </Box>
                )
              })()}
          </Modal>
        </>
      )}
    </Box>
  )
}

export default PostAnalysis
