// import React, { useEffect, useState, useMemo } from 'react'
// import { Box, Flex } from '@chakra-ui/react'
// import {
//   DatePicker,
//   Card,
//   Select,
//   Row,
//   Col,
//   Modal,
//   Button,
//   Spin,
//   Typography
// } from 'antd'
// import Highcharts from 'highcharts'
// import HighchartsReact from 'highcharts-react-official'
// import { db } from '@/firebase/firebase'
// import { collection, query, where, getDocs } from 'firebase/firestore'
// import { useCompanyData } from '@/context/company-data-context'
// import dayjs from 'dayjs'

// const { MonthPicker } = DatePicker
// const { Option } = Select
// const { Text } = Typography

// // Your master metric mapping
// const PLATFORM_METRICS = {
//   google: [
//     'rating',
//     'reviews',
//     'search hits',
//     'views',
//     'directions',
//     'website clicks',
//     'chat clicks',
//     'calls',
//     'booking clicks'
//   ],
//   facebook: [
//     'posts',
//     'views',
//     'reach',
//     'content interactions',
//     'link clicks',
//     'visits',
//     'new follows'
//   ],
//   instagram: [
//     'posts',
//     'views',
//     'reach',
//     'content interactions',
//     'link clicks',
//     'visits',
//     'new follows'
//   ],
//   tiktok: [
//     'posts',
//     'new follows',
//     'post views',
//     'profile views',
//     'likes',
//     'comments',
//     'shares'
//   ],
//   x: ['new follows', 'posts', 'views', 'likes', 'shares']
// }

// Highcharts.setOptions({
//   chart: {
//     backgroundColor: 'transparent',
//     style: { color: '#fff' }
//   },
//   title: { style: { color: '#fff' } },
//   subtitle: { style: { color: '#fff' } },
//   xAxis: {
//     labels: { style: { color: '#fff' } },
//     title: { style: { color: '#fff' } },
//     lineColor: '#fff',
//     tickColor: '#fff',
//     gridLineColor: '#444'
//   },
//   yAxis: {
//     labels: { style: { color: '#fff' } },
//     title: { style: { color: '#fff' } },
//     lineColor: '#fff',
//     tickColor: '#fff',
//     gridLineColor: '#444'
//   },
//   legend: {
//     itemStyle: { color: '#fff' },
//     itemHoverStyle: { color: '#ffd700' },
//     backgroundColor: 'transparent'
//   },
//   tooltip: {
//     backgroundColor: 'rgba(30,30,30,0.98)',
//     style: { color: '#fff' }
//   },
//   plotOptions: {
//     series: { dataLabels: { color: '#fff' } }
//   }
// })

// const PlatformAnalysis = () => {
//   const { companyData, user } = useCompanyData()
//   const [selectedPlatform, setSelectedPlatform] = useState(null)
//   const [selectedMonth, setSelectedMonth] = useState(dayjs().startOf('month'))
//   const [metricDocs, setMetricDocs] = useState([])
//   const [loading, setLoading] = useState(false)
//   const [expandedChart, setExpandedChart] = useState(null)

//   // 1. Get all platforms connected for this company
//   const connectedPlatforms = useMemo(() => {
//     if (!companyData?.accounts) return []
//     return companyData.accounts
//       .map(acc => acc.platform.toLowerCase())
//       .filter((v, i, a) => !!v && a.indexOf(v) === i)
//   }, [companyData])

//   // 2. Set default platform
//   useEffect(() => {
//     if (!selectedPlatform && connectedPlatforms.length > 0) {
//       setSelectedPlatform(connectedPlatforms[0])
//     }
//     if (selectedPlatform && !connectedPlatforms.includes(selectedPlatform)) {
//       setSelectedPlatform(connectedPlatforms[0] || null)
//     }
//   }, [connectedPlatforms, selectedPlatform])

//   // 3. Fetch metric docs for this platform and month
//   useEffect(() => {
//     if (!user || !companyData || !selectedPlatform || !selectedMonth) {
//       setMetricDocs([])
//       return
//     }
//     setLoading(true)
//     const metricsRef = collection(
//       db,
//       'users',
//       user.uid,
//       'companies',
//       companyData.id,
//       'metrics'
//     )
//     // We use 'period' as a string "YYYY-MM" for querying (as per your save code)
//     const periodString = selectedMonth.format('YYYY-MM')
//     getDocs(
//       query(
//         metricsRef,
//         where('platform', '==', selectedPlatform),
//         where('period', '==', periodString)
//       )
//     )
//       .then(snap => {
//         setMetricDocs(snap.docs.map(doc => doc.data()))
//       })
//       .finally(() => setLoading(false))
//   }, [user, companyData, selectedPlatform, selectedMonth])

//   // 4. Build chart configs for each metric
//   const charts = useMemo(() => {
//     if (!selectedPlatform) return []
//     // Metrics tracked for this platform
//     const trackedMetrics = PLATFORM_METRICS[selectedPlatform] || []
//     // There should only be one doc for this platform+month
//     const metricsObj = metricDocs[0]?.metrics || {}
//     // For each metric, generate chart config
//     return trackedMetrics.map(metric => {
//       const value = metricsObj[metric] ?? null
//       // If value is null or undefined, skip rendering (optionally show "No data")
//       return {
//         metric,
//         config: {
//           chart: {
//             type: 'column',
//             backgroundColor: 'transparent',
//             style: { color: '#fff' }
//           },
//           title: { text: metric.charAt(0).toUpperCase() + metric.slice(1) },
//           xAxis: { categories: [selectedMonth.format('MMM YYYY')] },
//           yAxis: { title: { text: metric }, min: 0 },
//           series: [
//             {
//               name:
//                 selectedPlatform.charAt(0).toUpperCase() +
//                 selectedPlatform.slice(1),
//               data: [typeof value === 'number' ? value : 0]
//             }
//           ]
//         },
//         value
//       }
//     })
//   }, [metricDocs, selectedPlatform, selectedMonth])

//   // 5. Two-column layout, last chart full-width if odd
//   const chartRows = []
//   for (let i = 0; i < charts.length; i += 2) {
//     if (i === charts.length - 1) {
//       // Odd last one: full width
//       chartRows.push(
//         <Row gutter={[24, 24]} key={charts[i].metric}>
//           <Col span={24}>
//             <Card
//               title={charts[i].config.title.text}
//               extra={
//                 <Button
//                   onClick={() => setExpandedChart(charts[i].config)}
//                   type='link'
//                 >
//                   Expand
//                 </Button>
//               }
//               style={{ background: '#2a2a2e', color: '#fff' }}
//             >
//               {charts[i].value === null ? (
//                 <Text color='gray.400'>No data for this metric</Text>
//               ) : (
//                 <HighchartsReact
//                   highcharts={Highcharts}
//                   options={charts[i].config}
//                 />
//               )}
//             </Card>
//           </Col>
//         </Row>
//       )
//     } else {
//       chartRows.push(
//         <Row gutter={[24, 24]} key={charts[i].metric}>
//           <Col span={12}>
//             <Card
//               title={charts[i].config.title.text}
//               extra={
//                 <Button
//                   onClick={() => setExpandedChart(charts[i].config)}
//                   type='link'
//                 >
//                   Expand
//                 </Button>
//               }
//               style={{ background: '#2a2a2e', color: '#fff' }}
//             >
//               {charts[i].value === null ? (
//                 <Text color='gray.400'>No data for this metric</Text>
//               ) : (
//                 <HighchartsReact
//                   highcharts={Highcharts}
//                   options={charts[i].config}
//                 />
//               )}
//             </Card>
//           </Col>
//           <Col span={12}>
//             <Card
//               title={charts[i + 1].config.title.text}
//               extra={
//                 <Button
//                   onClick={() => setExpandedChart(charts[i + 1].config)}
//                   type='link'
//                 >
//                   Expand
//                 </Button>
//               }
//               style={{ background: '#2a2a2e', color: '#fff' }}
//             >
//               {charts[i + 1].value === null ? (
//                 <Text color='gray.400'>No data for this metric</Text>
//               ) : (
//                 <HighchartsReact
//                   highcharts={Highcharts}
//                   options={charts[i + 1].config}
//                 />
//               )}
//             </Card>
//           </Col>
//         </Row>
//       )
//     }
//   }

//   return (
//     <Box minH='100vh' p={8}>
//       <Flex justify='space-between' align='center' wrap='wrap' mb={6} gap={4}>
//         <Select
//           value={selectedPlatform}
//           onChange={setSelectedPlatform}
//           style={{ width: 220, background: '#2a2a2e' }}
//           placeholder='Select Platform'
//           disabled={!connectedPlatforms.length}
//         >
//           {connectedPlatforms.map(p => (
//             <Option key={p} value={p}>
//               {p.charAt(0).toUpperCase() + p.slice(1)}
//             </Option>
//           ))}
//         </Select>

//         <MonthPicker
//           value={selectedMonth}
//           onChange={setSelectedMonth}
//           picker='month'
//           style={{
//             background: '#2a2a2e',
//             padding: '6px',
//             borderRadius: '6px',
//             color: 'white'
//           }}
//         />
//       </Flex>

//       {loading ? (
//         <Spin />
//       ) : !selectedPlatform ? (
//         <Text>Select a platform to view metrics.</Text>
//       ) : (
//         chartRows
//       )}

//       <Modal
//         open={!!expandedChart}
//         onCancel={() => setExpandedChart(null)}
//         footer={null}
//         width='90vw'
//         centered
//       >
//         {expandedChart && (
//           <HighchartsReact highcharts={Highcharts} options={expandedChart} />
//         )}
//       </Modal>
//     </Box>
//   )
// }

// export default PlatformAnalysis

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
      title: 'Views & Likes',
      metrics: ['views', 'likes'],
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
      metrics: ['new follows', 'posts', 'views'],
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
      const series = group.metrics.map((metric, idx) => ({
        name: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: months.map(
          period =>
            metricDocs.find(doc => doc.period === period)?.metrics?.[metric] ??
            0
        ),
        color: group.colors?.[idx] || undefined
      }))
      const emptySeries = series.every(s => s.data.every(val => val === 0))
      const chartConfig = {
        chart: { type: 'column', backgroundColor: 'transparent' },
        title: { text: group.title },
        xAxis: {
          categories: months.map(m => dayjs(m, 'YYYY-MM').format('MMM YYYY'))
        },
        yAxis: { min: 0 },
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
            <Button onClick={() => setExpandedChart(chartConfig)} type='link'>
              Expand
            </Button>
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

    if (!rightGroup) {
      chartCards.push(
        <Row gutter={[24, 24]} key={leftGroup.title}>
          <Col span={24}>{makeChartCard(leftGroup, leftGroup.title)}</Col>
        </Row>
      )
    } else {
      chartCards.push(
        <Row gutter={[24, 24]} key={leftGroup.title}>
          <Col span={12}>{makeChartCard(leftGroup, leftGroup.title)}</Col>
          <Col span={12}>{makeChartCard(rightGroup, rightGroup.title)}</Col>
        </Row>
      )
    }
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
