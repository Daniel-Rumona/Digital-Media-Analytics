import { useState, useEffect } from 'react'
import {
  Card,
  DatePicker,
  Select,
  Row,
  Col,
  Space,
  Typography,
  Modal
} from 'antd'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import { Flex, Button } from '@chakra-ui/react'
import {
  EyeOutlined,
  LikeOutlined,
  UsergroupAddOutlined,
  FireOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  RadarChartOutlined,
  MessageOutlined,
  PhoneOutlined,
  StarOutlined,
  StarFilled,
  LinkOutlined,
  InteractionOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { FiMaximize2 } from 'react-icons/fi'

import { db } from '@/firebase/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useCompanyData } from '@/context/company-data-context'

const { RangePicker } = DatePicker
const { Option } = Select
const MotionIcon = motion(FiMaximize2)
const { Text } = Typography

dayjs.extend(isBetween)

const chartGroups = {
  Views: ['views'],
  Engagement: ['likes', 'reactions', 'content interactions'],
  Reach: [
    'reach',
    'visits',
    'link clicks',
    'website clicks',
    'directions',
    'booking clicks',
    'calls',
    'messages'
  ],
  Followers: ['followers'],
  Posts: ['posts'],
  Reviews: ['reviews', 'rating']
}

Highcharts.setOptions({
  chart: { backgroundColor: 'transparent', style: { color: '#fff' } },
  title: { style: { color: '#fff' } },
  subtitle: { style: { color: '#fff' } },
  xAxis: {
    labels: { style: { color: '#fff' } },
    title: { style: { color: '#fff' } },
    lineColor: '#fff',
    tickColor: '#fff',
    gridLineColor: '#444'
  },
  yAxis: {
    labels: { style: { color: '#fff' } },
    title: { style: { color: '#fff' } },
    lineColor: '#fff',
    tickColor: '#fff',
    gridLineColor: '#444'
  },
  legend: { itemStyle: { color: '#fff' }, backgroundColor: 'transparent' },
  tooltip: { backgroundColor: 'rgba(30,30,30,0.98)', style: { color: '#fff' } },
  plotOptions: { series: { dataLabels: { color: '#fff' } } }
})

const metricIcons = {
  views: <EyeOutlined style={{ color: '#1890ff' }} />,
  likes: <LikeOutlined style={{ color: '#52c41a' }} />,
  reactions: <FireOutlined style={{ color: '#fa8c16' }} />,
  followers: <UsergroupAddOutlined style={{ color: '#722ed1' }} />,
  posts: <FileTextOutlined style={{ color: '#13c2c2' }} />,
  visits: <EnvironmentOutlined style={{ color: '#fa541c' }} />,
  reach: <RadarChartOutlined style={{ color: '#722ed1' }} />,
  messages: <MessageOutlined style={{ color: '#eb2f96' }} />,
  calls: <PhoneOutlined style={{ color: '#faad14' }} />,
  reviews: <StarOutlined style={{ color: '#fadb14' }} />,
  rating: <StarFilled style={{ color: '#fadb14' }} />,
  'link clicks': <LinkOutlined style={{ color: '#2f54eb' }} />,
  'website clicks': <LinkOutlined style={{ color: '#2f54eb' }} />,
  'content interactions': <InteractionOutlined style={{ color: '#eb2f96' }} />,
  directions: <EnvironmentOutlined style={{ color: '#fa541c' }} />,
  'booking clicks': <LinkOutlined style={{ color: '#eb2f96' }} />
}

const Dashboard = () => {
  const { user, companyData } = useCompanyData()
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(5, 'month').startOf('month'),
    dayjs().endOf('month')
  ])
  const [platforms, setPlatforms] = useState([])
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [metrics, setMetrics] = useState([])
  const [modalConfig, setModalConfig] = useState(null)

  // Get available platforms for this company (assuming companyData.accounts is [{ platform: "facebook" }, ...])
  useEffect(() => {
    if (companyData?.accounts) {
      const list = companyData.accounts.map(
        acc => acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1)
      )
      setPlatforms(list)
      setSelectedPlatform(list[0] || '')
    }
  }, [companyData])

  // Fetch metrics for this company/platform/date range
  useEffect(() => {
    if (
      !user ||
      !companyData?.id ||
      !selectedPlatform ||
      !dateRange[0] ||
      !dateRange[1]
    ) {
      setMetrics([])
      return
    }
    const platformKey = selectedPlatform.toLowerCase()
    const start = dayjs(dateRange[0]).format('YYYY-MM')
    const end = dayjs(dateRange[1]).format('YYYY-MM')
    const metricsRef = collection(
      db,
      'users',
      user.uid,
      'companies',
      companyData.id,
      'metrics'
    )
    const q = query(
      metricsRef,
      where('platform', '==', platformKey),
      where('period', '>=', start),
      where('period', '<=', end)
    )
    getDocs(q).then(snap => {
      setMetrics(snap.docs.map(doc => doc.data()))
    })
  }, [user, companyData, dateRange, selectedPlatform])

  // Transform to match previous logic
  const monthlyLabels = metrics.map(m => m.period).sort()
  const filteredData = metrics.flatMap(doc =>
    Object.entries(doc.metrics).map(([metric, value]) => ({
      month: doc.period,
      metric: metric.trim().toLowerCase(),
      value: Number(value)
    }))
  )

  const availableMetrics = new Set(filteredData.map(d => d.metric))

  const aggregateMetricByMonth = metric => {
    const grouped = {}
    filteredData
      .filter(d => d.metric === metric)
      .forEach(d => {
        if (!grouped[d.month]) grouped[d.month] = 0
        grouped[d.month] += d.value
      })
    return grouped
  }

  const startMonth = monthlyLabels[0]
  const endMonth = monthlyLabels[monthlyLabels.length - 1]

  const getSeriesData = metric => {
    const agg = aggregateMetricByMonth(metric)
    return monthlyLabels.map(month => agg[month] ?? null)
  }

  const availableChartGroups = Object.entries(chartGroups)
    .filter(([_, metrics]) => metrics.some(m => availableMetrics.has(m)))
    .slice(0, 3)

  const chartConfigs = availableChartGroups.reduce((acc, [group, metrics]) => {
    const series = metrics
      .filter(m => availableMetrics.has(m))
      .map(m => ({
        name: m,
        data: getSeriesData(m)
      }))

    acc[group] = {
      chart: { type: 'spline' },
      title: {
        text: `${selectedPlatform} - ${group} Over Time`,
        style: { color: '#fff' }
      },
      xAxis: {
        categories: monthlyLabels,
        title: { text: 'Month', style: { color: '#aaa' } },
        labels: {
          style: { color: '#aaa' },
          formatter () {
            return dayjs(this.value, 'YYYY-MM').format('MMM')
          }
        }
      },
      yAxis: {
        title: { text: group, style: { color: '#aaa' } },
        labels: { style: { color: '#aaa' } }
      },
      legend: { itemStyle: { color: '#ccc' } },
      series
    }
    return acc
  }, {})

  const getMetricChange = metric => {
    const grouped = aggregateMetricByMonth(metric)
    const start = grouped[startMonth] ?? 0
    const end = grouped[endMonth] ?? 0
    const diff = end - start
    const percent = start === 0 ? 0 : (diff / start) * 100
    return { value: end, percent: percent.toFixed(1) }
  }

  const metricScores = Array.from(availableMetrics)
    .map(metric => ({
      ...getMetricChange(metric),
      metric
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)

  const renderMetricCard = m => {
    const icon = metricIcons[m.metric] || (
      <InfoCircleOutlined style={{ color: '#888' }} />
    )
    const isPositive = Number(m.percent) > 0
    const isZero = Number(m.percent) === 0

    return (
      <Col xs={24} sm={12} md={6} key={m.metric}>
        <Card style={{ background: '#2a2a2e', color: '#fff' }}>
          <Space direction='vertical' align='center' style={{ width: '100%' }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
              {m.metric}
            </div>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>{m.value}</div>
            <Text
              style={{
                color: isZero ? '#ccc' : isPositive ? '#3f8600' : '#cf1322'
              }}
            >
              {isZero
                ? '0%'
                : isPositive
                ? `▲ ${m.percent}%`
                : `▼ ${Math.abs(m.percent)}%`}
            </Text>
          </Space>
        </Card>
      </Col>
    )
  }

  const renderExpandButton = config => (
    <Button
      size='sm'
      colorPalette='cyan'
      variant='surface'
      onClick={() => setModalConfig(config)}
    >
      Expand{' '}
      <MotionIcon
        whileHover={{ scale: 1.2, rotate: 12 }}
        transition={{ type: 'spring', stiffness: 300 }}
      />
    </Button>
  )

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <Flex justify='flex-end' gap='5' mb={6} align='center'>
        <Select
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          style={{ width: 200, background: '#2a2a2e', color: '#fff' }}
        >
          {platforms.map(p => (
            <Option key={p} value={p}>
              {p}
            </Option>
          ))}
        </Select>
        <RangePicker
          picker='month'
          value={dateRange}
          format='YYYY-MM'
          onChange={dates => setDateRange(dates)}
          style={{
            background: '#2a2a2e',
            padding: '6px',
            borderRadius: '6px',
            color: 'white'
          }}
        />
      </Flex>
      <Row gutter={16} style={{ marginBottom: 32 }}>
        {metricScores.map(renderMetricCard)}
      </Row>
      <div
        style={{
          display: 'grid',
          gap: 24,
          marginBottom: 32,
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
        }}
      >
        {Object.entries(chartConfigs).map(([title, config]) => (
          <Card
            key={title}
            title={<span style={{ color: '#fff' }}>{title}</span>}
            extra={renderExpandButton(config)}
            hoverable
            style={{ background: '#2a2a2e' }}
          >
            <HighchartsReact
              highcharts={Highcharts}
              options={config}
              containerProps={{ style: { height: 300, width: '100%' } }}
            />
          </Card>
        ))}
      </div>
      <Modal
        open={!!modalConfig}
        onCancel={() => setModalConfig(null)}
        footer={null}
        width='80vw'
        centered
      >
        {modalConfig && (
          <HighchartsReact
            highcharts={Highcharts}
            options={modalConfig}
            containerProps={{ style: { height: 400, width: '100%' } }}
          />
        )}
      </Modal>
    </div>
  )
}

export default Dashboard
