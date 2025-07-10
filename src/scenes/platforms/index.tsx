import React, { useState, useEffect, useMemo } from 'react'
import { Box, Flex } from '@chakra-ui/react'
import {
  DatePicker,
  Card,
  Select,
  Spin,
  Row,
  Col,
  Modal,
  Button,
  Typography
} from 'antd'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { db } from '@/firebase/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useCompanyData } from '@/context/company-data-context'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { Text } = Typography

const PLATFORM_CHART_GROUPS = {
  google: [
    {
      title: 'Website & Booking Clicks',
      metrics: ['website clicks', 'booking clicks'],
      colors: ['#7CB5EC', '#90ED7D']
    },
    {
      title: 'Reviews & Calls',
      metrics: ['reviews', 'calls'],
      colors: ['#FFD700', '#FF6347']
    },
    {
      title: 'Views & Search Hits',
      metrics: ['views', 'search hits'],
      colors: ['#64E572', '#4B0082']
    },
    {
      title: 'Directions & Chat Clicks',
      metrics: ['directions', 'chat clicks'],
      colors: ['#F5222D', '#8B0000']
    },
    {
      title: 'Rating',
      metrics: ['rating'],
      colors: ['#FAAD14']
    }
  ],
  facebook: [
    {
      title: 'Views & Interactions',
      metrics: ['views', 'content interactions'],
      colors: ['#3B5998', '#FF69B4']
    },
    {
      title: 'Posts & Reach',
      metrics: ['posts', 'reach'],
      colors: ['#52C41A', '#F5222D']
    },
    {
      title: 'Content & Link Clicks',
      metrics: ['content interactions', 'link clicks'],
      colors: ['#1890FF', '#FFD700']
    },
    {
      title: 'Visits & New Follows',
      metrics: ['visits', 'new follows'],
      colors: ['#7CB5EC', '#90ED7D']
    }
  ],
  instagram: [
    {
      title: 'Views & Likes',
      metrics: ['views', 'likes'],
      colors: ['#E1306C', '#405DE6']
    },
    {
      title: 'Posts & Reach',
      metrics: ['posts', 'reach'],
      colors: ['#F77737', '#70C1B3']
    },
    {
      title: 'Content & Link Clicks',
      metrics: ['content interactions', 'link clicks'],
      colors: ['#FDCB52', '#4B0082']
    },
    {
      title: 'Visits & New Follows',
      metrics: ['visits', 'new follows'],
      colors: ['#7CB5EC', '#90ED7D']
    }
  ],
  tiktok: [
    {
      title: 'Posts, New Follows & Post Views',
      metrics: ['posts', 'new follows', 'post views'],
      colors: ['#69C9D0', '#EE1D52', '#F6C344']
    },
    {
      title: 'Profile Views, Likes & Comments',
      metrics: ['profile views', 'likes', 'comments'],
      colors: ['#253858', '#FF69B4', '#FFA500']
    },
    {
      title: 'Shares',
      metrics: ['shares'],
      colors: ['#52C41A']
    }
  ],
  x: [
    {
      title: 'New Follows, Posts & Views',
      metrics: ['new follows', 'posts', 'post views'],
      colors: ['#1DA1F2', '#657786', '#AAB8C2']
    },
    {
      title: 'Likes & Shares',
      metrics: ['likes', 'shares'],
      colors: ['#FFD700', '#F5222D']
    }
  ]
}

const PlatformAnalysis = () => {
  const { companyData, user } = useCompanyData()
  const [selectedPlatform, setSelectedPlatform] = useState(null)
  const [selectedRange, setSelectedRange] = useState([
    dayjs().subtract(5, 'month').startOf('month'),
    dayjs().endOf('month')
  ])
  const [metricDocs, setMetricDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedChart, setExpandedChart] = useState(null)

  const connectedPlatforms = useMemo(() => {
    if (!companyData?.accounts) return []
    return companyData.accounts
      .map(acc => acc.platform.toLowerCase())
      .filter((v, i, a) => !!v && a.indexOf(v) === i)
  }, [companyData])

  useEffect(() => {
    if (!selectedPlatform && connectedPlatforms.length > 0) {
      setSelectedPlatform(connectedPlatforms[0])
    }
    if (selectedPlatform && !connectedPlatforms.includes(selectedPlatform)) {
      setSelectedPlatform(connectedPlatforms[0] || null)
    }
  }, [connectedPlatforms, selectedPlatform])

  const useSecondaryAxis = (metric: string) => {
  const lowerMetrics = ['posts', 'rating', 'reviews', 'calls', 'chat clicks', 'directions']
  return lowerMetrics.includes(metric)
}


  useEffect(() => {
    if (
      !user ||
      !companyData ||
      !selectedPlatform ||
      !selectedRange[0] ||
      !selectedRange[1]
    ) {
      setMetricDocs([])
      return
    }
    setLoading(true)
    const metricsRef = collection(
      db,
      'users',
      user.uid,
      'companies',
      companyData.id,
      'metrics'
    )
    getDocs(
      query(
        metricsRef,
        where('platform', '==', selectedPlatform),
        where('period', '>=', selectedRange[0].format('YYYY-MM')),
        where('period', '<=', selectedRange[1].format('YYYY-MM'))
      )
    )
      .then(snap => {
        setMetricDocs(snap.docs.map(doc => doc.data()))
      })
      .finally(() => setLoading(false))
  }, [user, companyData, selectedPlatform, selectedRange])

  const months = useMemo(() => {
    const arr = metricDocs.map(doc => doc.period)
    arr.sort()
    return arr
  }, [metricDocs])

  const chartGroups = PLATFORM_CHART_GROUPS[selectedPlatform] || []

  // Responsive two-column layout (last full-width if odd)
  const chartCards = []
  for (let i = 0; i < chartGroups.length; i += 2) {
    const leftGroup = chartGroups[i]
    const rightGroup = chartGroups[i + 1]

const makeChartCard = (group, key) => {
  const primaryMetrics = group.metrics.filter(m => !useSecondaryAxis(m))
  const secondaryMetrics = group.metrics.filter(m => useSecondaryAxis(m))

  const series = group.metrics.map((metric, idx) => ({
    name: metric.charAt(0).toUpperCase() + metric.slice(1),
    data: months.map(
      period =>
        metricDocs.find(doc => doc.period === period)?.metrics?.[metric] ?? 0
    ),
    color: group.colors?.[idx] || undefined,
    yAxis: useSecondaryAxis(metric) ? 1 : 0
  }))

  const yAxis = []
  if (primaryMetrics.length > 0) {
    yAxis.push({
      title: {
        text: primaryMetrics
          .map(m => m.charAt(0).toUpperCase() + m.slice(1))
          .join(', '),
        style: { color: '#fff' }
      },
      labels: { style: { color: '#fff' } }
    })
  }
  if (secondaryMetrics.length > 0) {
    yAxis.push({
      title: {
        text: secondaryMetrics
          .map(m => m.charAt(0).toUpperCase() + m.slice(1))
          .join(', '),
        style: { color: '#fff' }
      },
      labels: { style: { color: '#fff' } },
      opposite: true
    })
  }

  const emptySeries = series.every(s => s.data.every(val => val === 0))

  const chartConfig = {
    chart: { type: 'column', backgroundColor: 'transparent' },
    title: { text: group.title },
    xAxis: {
      categories: months.map(m => dayjs(m, 'YYYY-MM').format('MMM YYYY'))
    },
    yAxis,
    tooltip: { shared: true },
    legend: { shadow: false },
    series,
    plotOptions: { column: { grouping: true, borderWidth: 0 } }
  }

  return (
    <Card
      key={group.title}
      style={{ marginBottom: 24, background: '#2a2a2e', color: '#fff' }}
      extra={
        <Flex gap={3}>
          <Button onClick={() => setExpandedChart(chartConfig)} type='link'>
            Expand
          </Button>
          <Button
            type='link'
            onClick={() => {
              const container = document.createElement('div')
              document.body.appendChild(container)

              const exportChart = Highcharts.chart(container, {
                ...chartConfig,
                chart: {
                  ...chartConfig.chart,
                  backgroundColor: '#2a2a2e'
                }
              })

              exportChart.exportChart({
                type: 'image/png',
                filename: `${group.title.replace(/\s+/g, '_')}_${selectedPlatform}`
              })

              setTimeout(() => {
                exportChart.destroy()
                document.body.removeChild(container)
              }, 500)
            }}
          >
            Download
          </Button>
        </Flex>
      }
    >
      {emptySeries ? (
        <span style={{ color: '#999' }}>
          No data for this chart in range.
        </span>
      ) : (
        <HighchartsReact highcharts={Highcharts} options={chartConfig} />
      )}
    </Card>
  )
}


  return (
    <Box minH='100vh' p={8}>
      <Flex justify='space-between' align='center' wrap='wrap' mb={6} gap={4}>
        <Select
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          style={{ width: 220, background: '#2a2a2e' }}
          placeholder='Select Platform'
        >
          {connectedPlatforms.map(p => (
            <Option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Option>
          ))}
        </Select>
        <RangePicker
          picker='month'
          value={selectedRange}
          onChange={setSelectedRange}
          style={{
            background: '#2a2a2e',
            color: 'white',
            borderRadius: 6,
            padding: 6
          }}
        />
      </Flex>
      {loading ? <Spin /> : chartCards}
      <Modal
        open={!!expandedChart}
        onCancel={() => setExpandedChart(null)}
        footer={null}
        width='90vw'
        centered
      >
        {expandedChart && (
          <HighchartsReact highcharts={Highcharts} options={expandedChart} />
        )}
      </Modal>
    </Box>
  )
}

export default PlatformAnalysis
