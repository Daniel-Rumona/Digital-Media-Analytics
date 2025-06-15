import React, { useState, useEffect, useRef, useMemo, createRef } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Modal,
  Typography,
  DatePicker,
  Divider,
  Flex,
  Spin,
  Alert
} from 'antd'
import {
  FiBarChart2,
  FiThumbsUp,
  FiEdit,
  FiDownload,
  FiLink,
  FiMaximize2
} from 'react-icons/fi'
import Highcharts from 'highcharts'
import type { Options as HighchartsOptions } from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import HighchartsMore from 'highcharts/highcharts-more'
import HighchartsFunnel from 'highcharts/modules/funnel'
import { motion } from 'framer-motion'
import { useCompanyData } from '@/context/company-data-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { Box } from '@chakra-ui/react'
import useAiInsights from './useAIInsight'
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  Media,
  ImageRun
} from 'docx'
import { saveAs } from 'file-saver'
import dayjs, { Dayjs } from 'dayjs'
import HighchartsExporting from 'highcharts/modules/exporting'
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting'

const { RangePicker, MonthPicker } = DatePicker
const { Text, Title, Paragraph: AntParagraph } = Typography
const MotionIcon = motion(FiMaximize2)

if (typeof HighchartsFunnel === 'function') HighchartsFunnel(Highcharts)
if (typeof HighchartsMore === 'function') HighchartsMore(Highcharts)
if (typeof HighchartsExporting === 'function') HighchartsExporting(Highcharts)
if (typeof HighchartsOfflineExporting === 'function')
  HighchartsOfflineExporting(Highcharts)

type MetricsRecord = {
  period: string
  platform: string
  metrics: Record<string, number | string | undefined>
}

type PlatformInsight = {
  name: string
  metrics: { label: string; value: string | number }[]
  observations: string[]
}

type ModalReport = {
  companyName: string
  period: string
  overview: string
  consolidatedChartObservations: string[]
  platforms: PlatformInsight[]
  googleFunnelObservations: string[]
  swot: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
  recommendations: {
    growth: string[]
    engagement: string[]
    conversions: string[]
    content: string[]
    monitor: string[]
  }
  conclusion: string
  preparedBy: string
}

// Chart refs
const consolidatedChartRef = createRef<any>()
const funnelChartRef = createRef<any>()

function computeMovingAverage (arr: any[], key: string) {
  return arr.map((row, idx, arr) => {
    if (idx < 2) return ''
    const vals = [arr[idx][key], arr[idx - 1][key], arr[idx - 2][key]]
    const nums = vals.map(Number).filter(n => !isNaN(n))
    if (nums.length < 3) return ''
    return (nums.reduce((a, b) => a + b, 0) / 3).toFixed(2)
  })
}

function base64ToArrayBuffer (dataUrl: string) {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

// --- THE KEY FIX: SVG to PNG as DataURL ---
async function chartRefToPngDataUrl (chartRef) {
  return new Promise<string>((resolve, reject) => {
    if (
      chartRef?.current &&
      chartRef.current.chart &&
      typeof chartRef.current.chart.getSVGForExport === 'function'
    ) {
      const svg = chartRef.current.chart.getSVGForExport()
      const img = new window.Image()
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        URL.revokeObjectURL(url)
        resolve(dataUrl)
      }
      img.onerror = err => {
        URL.revokeObjectURL(url)
        reject(err)
      }
      img.src = url
    } else {
      reject(new Error('Chart not ready'))
    }
  })
}

// --- DOCX EXPORT (async) ---
async function exportReportToWord (
  modalReport,
  platformMetricsHistory,
  consolidatedChartRef,
  funnelChartRef
) {
  // Use new SVG to PNG for both charts
  const consolidatedDataUrl = await chartRefToPngDataUrl(consolidatedChartRef)
  const funnelDataUrl = await chartRefToPngDataUrl(funnelChartRef)

  if (
    !consolidatedDataUrl ||
    !consolidatedDataUrl.startsWith('data:image/png')
  ) {
    alert('Consolidated chart image not ready.')
    return
  }
  if (!funnelDataUrl || !funnelDataUrl.startsWith('data:image/png')) {
    alert('Funnel chart image not ready.')
    return
  }

  const consolidatedImg = base64ToArrayBuffer(consolidatedDataUrl)
  const funnelImg = base64ToArrayBuffer(funnelDataUrl)
  const doc = new Document({ sections: [] })

  const children = [
    new Paragraph({
      text: `${modalReport.companyName} — Social Media Report`,
      heading: HeadingLevel.HEADING_1
    }),
    new Paragraph({
      text: modalReport.period,
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({ text: modalReport.overview }),
    new Paragraph({
      text: 'Platform Metrics View Chart',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({
      children: [
        new ImageRun({
          data: consolidatedImg,
          transformation: { width: 600, height: 300 }
        })
      ]
    }),
    new Paragraph({
      text: 'Platform Metrics View Observations',
      heading: HeadingLevel.HEADING_3
    }),
    ...(modalReport.consolidatedChartObservations || []).map(
      o => new Paragraph({ text: `- ${o}` })
    ),
    ...modalReport.platforms.flatMap(platform => [
      new Paragraph({
        text: platform.name,
        heading: HeadingLevel.HEADING_2
      }),
      ...(platform.name === 'Google'
        ? [
            new Paragraph({
              text: 'Google Funnel Chart',
              heading: HeadingLevel.HEADING_3
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: funnelImg,
                  transformation: { width: 500, height: 220 }
                })
              ]
            }),
            new Paragraph({
              text: 'Google Funnel Observations',
              heading: HeadingLevel.HEADING_3
            }),
            ...(modalReport.googleFunnelObservations || []).map(
              o => new Paragraph({ text: `- ${o}` })
            )
          ]
        : []),
      new Paragraph({
        text: 'Key Observations',
        heading: HeadingLevel.HEADING_3
      }),
      ...(platform.observations || []).map(
        o => new Paragraph({ text: `- ${o}` })
      ),
      new Paragraph({
        text: 'Metrics',
        heading: HeadingLevel.HEADING_3
      }),
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Metric')] }),
              new TableCell({ children: [new Paragraph('Value')] }),
              new TableCell({ children: [new Paragraph('3-Point MA')] })
            ]
          }),
        ...(platform.metrics || []).map((m, idx) => {
  const historyKey = platform.name.toLowerCase()
  const averages = computeMovingAverage(platformMetricsHistory[historyKey] || [], m.label)
  const average = averages[idx] || 'N/A'

  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph(String(m.label))]
      }),
      new TableCell({
        children: [new Paragraph(String(m.value))]
      }),
      new TableCell({
        children: [new Paragraph(String(average))]
      })
    ]
  })
})
        )
        ]
      })
    ]),
    new Paragraph({
      text: 'SWOT Analysis',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({ text: 'Strengths', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.swot.strengths || []).map(
      s => new Paragraph({ text: `- ${s}` })
    ),
    new Paragraph({ text: 'Weaknesses', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.swot.weaknesses || []).map(
      s => new Paragraph({ text: `- ${s}` })
    ),
    new Paragraph({ text: 'Opportunities', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.swot.opportunities || []).map(
      s => new Paragraph({ text: `- ${s}` })
    ),
    new Paragraph({ text: 'Threats', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.swot.threats || []).map(
      s => new Paragraph({ text: `- ${s}` })
    ),
    new Paragraph({
      text: 'Recommendations',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({ text: 'Growth', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.recommendations.growth || []).map(
      r => new Paragraph({ text: `- ${r}` })
    ),
    new Paragraph({ text: 'Engagement', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.recommendations.engagement || []).map(
      r => new Paragraph({ text: `- ${r}` })
    ),
    new Paragraph({ text: 'Conversions', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.recommendations.conversions || []).map(
      r => new Paragraph({ text: `- ${r}` })
    ),
    new Paragraph({ text: 'Content', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.recommendations.content || []).map(
      r => new Paragraph({ text: `- ${r}` })
    ),
    new Paragraph({ text: 'Monitor', heading: HeadingLevel.HEADING_3 }),
    ...(modalReport.recommendations.monitor || []).map(
      r => new Paragraph({ text: `- ${r}` })
    ),
    new Paragraph({
      text: 'Conclusion',
      heading: HeadingLevel.HEADING_2
    }),
    new Paragraph({ text: modalReport.conclusion }),
    new Paragraph({ text: `Prepared by: ${modalReport.preparedBy}` })
  ]

  doc.addSection({ children })

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${modalReport.companyName}_SocialMediaReport.docx`)
  })
}

export default function ReportDashboard () {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [expandedChart, setExpandedChart] = useState<HighchartsOptions | null>(
    null
  )
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMonth, setModalMonth] = useState<Dayjs | null>(null)
  const reportRef = useRef<HTMLDivElement | null>(null)
  const { companyData, user } = useCompanyData()
  const [metrics, setMetrics] = useState<MetricsRecord[]>([])
  const {
    insights: modalReport,
    loading: modalLoading,
    error: modalError,
    generateInsights
  } = useAiInsights()
  const [modalMetrics, setModalMetrics] = useState<MetricsRecord[]>([])
  const [chartsReady, setChartsReady] = useState(false)

  useEffect(() => {
    if (
      consolidatedChartRef.current &&
      funnelChartRef.current &&
      consolidatedChartRef.current.chart &&
      funnelChartRef.current.chart
    ) {
      setChartsReady(true)
    }
  }, [consolidatedChartRef.current, funnelChartRef.current, isModalOpen])

  // History for moving average computation
  const [platformMetricsHistory, setPlatformMetricsHistory] = useState<
    Record<string, any[]>
  >({})

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        if (
          consolidatedChartRef.current &&
          consolidatedChartRef.current.chart &&
          funnelChartRef.current &&
          funnelChartRef.current.chart
        ) {
          setChartsReady(true)
        }
      }, 700)
    } else {
      setChartsReady(false)
    }
  }, [isModalOpen])

  useEffect(() => {
    if (!user || !companyData?.id || !dateRange[0] || !dateRange[1]) {
      setMetrics([])
      return
    }
    const start = dateRange[0].format('YYYY-MM')
    const end = dateRange[1].format('YYYY-MM')
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
        where('period', '>=', start),
        where('period', '<=', end)
      )
    ).then(snap => {
      const rows = snap.docs.map(doc => doc.data() as MetricsRecord)
      setMetrics(rows)
      const history: Record<string, any[]> = {}
     rows.forEach(row => {
  const pf = row.platform.toLowerCase()
  if (!history[pf]) history[pf] = []
  history[pf].push({ ...row.metrics, period: row.period })
})
      setPlatformMetricsHistory(history)
    })
  }, [user, companyData, dateRange])

  useEffect(() => {
    if (!user || !companyData?.id || !modalMonth) {
      setModalMetrics([])
      return
    }
    const monthStr = modalMonth.format('YYYY-MM')
    const metricsRef = collection(
      db,
      'users',
      user.uid,
      'companies',
      companyData.id,
      'metrics'
    )
    getDocs(query(metricsRef, where('period', '==', monthStr))).then(snap => {
      setModalMetrics(snap.docs.map(doc => doc.data() as MetricsRecord))
    })
  }, [user, companyData, modalMonth])

  function buildAIPayloadFromMetrics (
    metrics: MetricsRecord[],
    platformMetricsHistory: Record<string, any[]>
  ) {
    // Aggregates by platform, and adds 3-pt moving average for each metric label
    // Only use platforms shown in the chart
    const platforms = ['Google', 'Facebook', 'Instagram', 'Tiktok', 'X']
    const agg: Record<string, Record<string, number>> = {}

    // Aggregate all metrics by platform (sum)
    metrics.forEach(row => {
      const pf = row.platform.charAt(0).toUpperCase() + row.platform.slice(1)
      if (!agg[pf]) agg[pf] = {}
      Object.entries(row.metrics || {}).forEach(([k, v]) => {
        if (typeof v === 'number') {
          agg[pf][k] = (agg[pf][k] || 0) + v
        }
      })
    })

    // Build payload for each platform, include moving average
    return platforms
      .filter(pf => agg[pf])
      .map(pf => {
        const keys = Object.keys(agg[pf])
        // For MAs, we use platformMetricsHistory
        const hist = platformMetricsHistory[pf] || []
        return {
          name: pf,
          metrics: keys.map(label => ({
            label: label
              .replace(/_/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase()),
            value: agg[pf][label],
            ma_3pt: computeMovingAverage(hist, label).pop() || null // last MA value
          }))
        }
      })
  }

  const openModal = () => {
    setIsModalOpen(true)
    setModalMonth(null)
  }
  
  const closeModal = () => setIsModalOpen(false)
  
  const handleGenerateReport = () => {
    console.log('Generating')
 const period = `${dateRange[0].format('MMM YYYY')} - ${dateRange[1].format('MMM YYYY')}`
    const platforms = buildAIPayloadFromMetrics(metrics, platformMetricsHistory) // aggregate using main table data
    generateInsights({
      platforms,
      companyName: companyData?.companyName || '',
      period: `${dateRange[0].format('MMM YYYY')} - ${dateRange[1].format(
        'MMM YYYY'
      )}`
    })
  }

  // Chart configs with refs
  const agg = useMemo(() => {
    const platforms: Record<string, Record<string, number>[]> = {}
    metrics.forEach(row => {
      const pf = row.platform?.toLowerCase()
      if (!platforms[pf]) platforms[pf] = []
      platforms[pf].push((row.metrics || {}) as Record<string, number>)
    })
    const getSum = (pf: string, field: string) =>
      (platforms[pf] || []).reduce((a, b) => a + (Number(b[field]) || 0), 0)
    return { platforms, getSum }
  }, [metrics])

  const totalViews = ['google', 'facebook', 'instagram', 'tiktok', 'x'].reduce(
    (sum, pf) => sum + agg.getSum(pf, 'views'),
    0
  )
  const totalLikes = ['facebook', 'instagram', 'tiktok', 'x'].reduce(
    (sum, pf) => sum + agg.getSum(pf, 'likes'),
    0
  )
  const totalBookings = agg.getSum('google', 'booking clicks')
  const conversionRate =
    totalViews && totalBookings
      ? `${((totalBookings / totalViews) * 100).toFixed(1)}%`
      : '--'

  const visualSummary = [
    {
      label: 'Total Views',
      value: totalViews,
      color: '#4299E1',
      icon: <FiBarChart2 size={28} color='#4299E1' />
    },
    {
      label: 'Total Likes',
      value: totalLikes,
      color: '#ED64A6',
      icon: <FiThumbsUp size={28} color='#ED64A6' />
    },
    {
      label: 'Conversion Rate',
      value: conversionRate,
      color: '#48BB78',
      icon: <FiLink size={28} color='#48BB78' />
    }
  ]

  const chartConfigs: HighchartsOptions[] = [
    {
      chart: { zoomType: 'xy' },
      title: { text: 'Platform Metrics with View Trends', color: '#fff' },
      xAxis: [{ categories: ['Google', 'Facebook', 'Instagram', 'TikTok'] }],
      yAxis: [
        { title: { text: 'Counts' } },
        { title: { text: 'Views' }, opposite: true }
      ],
      tooltip: { shared: true },
      series: [
        {
          type: 'column',
          name: 'Likes',
          data: [
            agg.getSum('google', 'likes'),
            agg.getSum('facebook', 'likes'),
            agg.getSum('instagram', 'likes'),
            agg.getSum('tiktok', 'likes')
          ],
          color: '#ED64A6'
        },
        {
          type: 'column',
          name: 'Followers',
          data: [
            agg.getSum('google', 'followers'),
            agg.getSum('facebook', 'followers'),
            agg.getSum('instagram', 'followers'),
            agg.getSum('tiktok', 'followers')
          ],
          color: '#48BB78'
        },
        {
          type: 'column',
          name: 'Clicks',
          data: [
            agg.getSum('google', 'website clicks'),
            agg.getSum('facebook', 'website clicks'),
            agg.getSum('instagram', 'website clicks'),
            agg.getSum('tiktok', 'website clicks')
          ],
          color: '#F6AD55'
        },
        {
          type: 'spline',
          name: 'Views',
          data: [
            agg.getSum('google', 'views'),
            agg.getSum('facebook', 'views'),
            agg.getSum('instagram', 'views'),
            agg.getSum('tiktok', 'views')
          ],
          yAxis: 1,
          color: '#4299E1'
        }
      ]
    },
    {
      chart: { type: 'funnel' },
      title: { text: 'Conversion Funnel' },
      plotOptions: {
        series: {
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.y}',
            softConnector: true
          },
          center: ['50%', '50%'],
          width: '80%'
        }
      },
      series: [
        {
          name: 'Users',
          data: [
            ['Website Clicks', agg.getSum('google', 'website clicks')],
            ['Landing Page Views', agg.getSum('google', 'views')],
            ['Calls', agg.getSum('google', 'calls')],
            ['Bookings', agg.getSum('google', 'booking clicks')]
          ]
        }
      ]
    },
    {
      title: { text: 'Monthly Trends for Likes and Followers' },
      xAxis: {
        categories: metrics.map(row => row.period)
      },
      yAxis: { title: { text: 'Count' } },
      series: [
        {
          type: 'spline',
          name: 'Likes',
          data: metrics.map(row => row.metrics['likes'] || 0),
          color: '#ED64A6'
        },
        {
          type: 'spline',
          name: 'Followers',
          data: metrics.map(row => row.metrics['followers'] || 0),
          color: '#48BB78'
        }
      ]
    },
    {
      chart: { type: 'pie' },
      title: { text: 'Engagement Distribution' },
      series: [
        {
          name: 'Engagement',
          data: [
            { name: 'Likes', y: totalLikes },
            {
              name: 'Clicks',
              y:
                agg.getSum('google', 'website clicks') +
                agg.getSum('facebook', 'website clicks')
            },
            {
              name: 'Comments',
              y:
                agg.getSum('facebook', 'comments') +
                agg.getSum('instagram', 'comments')
            },
            {
              name: 'Shares',
              y:
                agg.getSum('facebook', 'shares') +
                agg.getSum('instagram', 'shares')
            }
          ]
        }
      ]
    },
    {
      chart: { polar: true, type: 'line' },
      title: { text: 'Engagement Quality Overview' },
      pane: { size: '80%' },
      xAxis: {
        categories: ['Likes', 'Comments', 'Shares', 'Clicks', 'Views'],
        tickmarkPlacement: 'on',
        lineWidth: 0
      },
      yAxis: { gridLineInterpolation: 'polygon', lineWidth: 0, min: 0 },
      series: [
        {
          name: 'Engagement',
          data: [
            totalLikes,
            agg.getSum('facebook', 'comments') +
              agg.getSum('instagram', 'comments'),
            agg.getSum('facebook', 'shares') +
              agg.getSum('instagram', 'shares'),
            agg.getSum('google', 'website clicks') +
              agg.getSum('facebook', 'website clicks'),
            totalViews
          ],
          pointPlacement: 'on',
          color: '#3182CE'
        }
      ]
    },
    {
      chart: { type: 'column' },
      title: { text: 'Monthly Growth in Followers' },
      xAxis: {
        categories: metrics.map(row => row.period),
        title: { text: 'Month' }
      },
      yAxis: {
        title: { text: 'Growth/Drop' },
        plotLines: [{ value: 0, color: 'gray', width: 1 }]
      },
      tooltip: { shared: true },
      plotOptions: {
        column: {
          dataLabels: { enabled: true },
          grouping: true,
          borderWidth: 0
        }
      },
      series: [
        {
          name: 'Instagram',
          data: metrics.map(row => row.metrics['instagram_growth'] || 0),
          color: '#48BB78'
        },
        {
          name: 'X',
          data: metrics.map(row => row.metrics['x_growth'] || 0),
          color: '#F56565'
        }
      ]
    }
  ]

  return (
    <Box style={{ minHeight: '100vh', padding: 32, background: '#191A1F' }}>
      <Flex justify='flex-end' align='center' mb={6} style={{ gap: 16 }}>
        <RangePicker
          picker='month'
          value={dateRange}
          onChange={dates => dates && setDateRange(dates as [Dayjs, Dayjs])}
          style={{
            background: '#2a2a2e',
            padding: '6px',
            borderRadius: '6px',
            color: 'white'
          }}
        />
        <Button type='default' icon={<FiEdit />} onClick={openModal}>
          Generate Report
        </Button>
      </Flex>
      <Row gutter={16} style={{ marginBottom: 32, marginTop: 20 }}>
        {visualSummary.map(({ label, value, color, icon }, idx) => (
          <Col xs={24} sm={8} key={idx}>
            <Card
              bordered={false}
              style={{
                background: '#23242A',
                color: color,
                minHeight: 90
              }}
            >
              <Flex align='center' style={{ gap: 16 }}>
                <div>{icon}</div>
                <div>
                  <Text style={{ color: color, fontWeight: 700 }}>{label}</Text>
                  <br />
                  <Text style={{ color: color, fontSize: 26 }}>{value}</Text>
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
      <div ref={reportRef}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card
              style={{
                background: '#23242A',
                color: '#fff',
                minHeight: 360
              }}
              title={
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {chartConfigs[0]?.title?.text || `Chart 1`}
                </Text>
              }
              extra={
                <Button
                  size='small'
                  onClick={() => setExpandedChart({ ...chartConfigs[0] })}
                >
                  Expand <MotionIcon style={{ marginLeft: 4 }} />
                </Button>
              }
              hoverable
            >
              <HighchartsReact
                ref={consolidatedChartRef}
                highcharts={Highcharts}
                options={chartConfigs[0]}
              />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card
              style={{
                background: '#23242A',
                color: '#fff',
                minHeight: 360
              }}
              title={
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {chartConfigs[1]?.title?.text || `Chart 2`}
                </Text>
              }
              extra={
                <Button
                  size='small'
                  onClick={() => setExpandedChart({ ...chartConfigs[1] })}
                >
                  Expand <MotionIcon style={{ marginLeft: 4 }} />
                </Button>
              }
              hoverable
            >
              <HighchartsReact
                ref={funnelChartRef}
                highcharts={Highcharts}
                options={chartConfigs[1]}
              />
            </Card>
          </Col>
          {chartConfigs.slice(2).map((config, idx) => (
            <Col xs={24} md={12} key={idx + 2}>
              <Card
                style={{
                  background: '#23242A',
                  color: '#fff',
                  minHeight: 360
                }}
                title={
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {config?.title?.text || `Chart ${idx + 3}`}
                  </Text>
                }
                extra={
                  <Button
                    size='small'
                    onClick={() => setExpandedChart({ ...config })}
                  >
                    Expand <MotionIcon style={{ marginLeft: 4 }} />
                  </Button>
                }
                hoverable
              >
                <HighchartsReact highcharts={Highcharts} options={config} />
              </Card>
            </Col>
          ))}
        </Row>
      </div>
      <Modal
        open={!!expandedChart}
        onCancel={() => setExpandedChart(null)}
        footer={null}
        width='90vw'
      >
        {expandedChart && (
          <HighchartsReact highcharts={Highcharts} options={expandedChart} />
        )}
      </Modal>
      <Modal
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Generate Social Media Report
            </Title>
          </div>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width='700px'
        destroyOnClose
      >
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            marginBottom: 20
          }}
        >
          <Button
            type='primary'
            onClick={handleGenerateReport}
            loading={modalLoading}
          >
            Generate Report
          </Button>
        </div>
        {modalLoading && <Spin tip='Generating report...' />}
        {modalError && (
          <Alert
            type='error'
            message={modalError}
            style={{ marginBottom: 16 }}
          />
        )}
        {modalReport && (
          <>
            <div
              ref={reportRef}
              style={{
                background: 'transparent',
                padding: 24,
                borderRadius: 8,
                marginBottom: 24
              }}
            >
              <Title level={4}>
                {modalReport.companyName} — Social Media Report
              </Title>
              <Text type='secondary'>{modalReport.period}</Text>
              <Divider />
              <AntParagraph>{modalReport.overview}</AntParagraph>
              <Divider />
              {modalReport?.consolidatedChartObservations && (
                <div style={{ marginBottom: 20 }}>
                  <Title level={5}>Platform Metrics View Observations</Title>
                  <ul>
                    {modalReport.consolidatedChartObservations.map(
                      (obs, idx) => (
                        <li key={idx}>{obs}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
              <Divider>Platform Breakdown</Divider>
              {modalReport?.platforms?.map(platform => (
                <div key={platform.name} style={{ marginBottom: 24 }}>
                  <Title level={5}>{platform.name}</Title>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      marginBottom: 8
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            border: '1px solid #e5e7eb',
                            background: '#f8fafc',
                            padding: 8,
                            color: '#222',
                            fontWeight: 600
                          }}
                        >
                          Metric
                        </th>
                        <th
                          style={{
                            border: '1px solid #e5e7eb',
                            background: '#f8fafc',
                            padding: 8,
                            color: '#222',
                            fontWeight: 600
                          }}
                        >
                          Value
                        </th>
                        <th
                          style={{
                            border: '1px solid #e5e7eb',
                            background: '#f8fafc',
                            padding: 8,
                            color: '#222',
                            fontWeight: 600
                          }}
                        >
                          3-Point MA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {platform.metrics.map((m, idx) => (
                        <tr key={m.label}>
                          <td
                            style={{
                              border: '1px solid #e5e7eb',
                              padding: 8
                            }}
                          >
                            {m.label}
                          </td>
                          <td
                            style={{
                              border: '1px solid #e5e7eb',
                              padding: 8
                            }}
                          >
                            {m.value}
                          </td>
                          <td
                            style={{
                              border: '1px solid #e5e7eb',
                              padding: 8
                            }}
                          >
                            {computeMovingAverage(
                              platformMetricsHistory[platform.name] || [],
                              m.label
                            )[idx] ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Text strong>Key Observations:</Text>
                  <ul>
                    {platform.observations.map((obs, i) => (
                      <li key={i}>{obs}</li>
                    ))}
                  </ul>
                  {platform.name === 'Google' &&
                    modalReport?.googleFunnelObservations && (
                      <div style={{ margin: '16px 0 8px 0' }}>
                        <Title level={5}>Google Funnel Observations</Title>
                        <ul>
                          {modalReport.googleFunnelObservations.map(
                            (obs, idx) => (
                              <li key={idx}>{obs}</li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ))}
              <Divider />
              <Title level={5}>Key Insights (SWOT)</Title>
              <Row gutter={24}>
                <Col xs={12} sm={6}>
                  <b>Strengths</b>
                  <ul>
                    {modalReport.swot?.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Col>
                <Col xs={12} sm={6}>
                  <b>Weaknesses</b>
                  <ul>
                    {modalReport.swot?.weaknesses.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Col>
                <Col xs={12} sm={6}>
                  <b>Opportunities</b>
                  <ul>
                    {modalReport.swot?.opportunities.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Col>
                <Col xs={12} sm={6}>
                  <b>Threats</b>
                  <ul>
                    {modalReport.swot?.threats.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Col>
              </Row>
              <Divider />
              <Title level={5}>Recommendations</Title>
              <b>Boost Follower Growth</b>
              <ul>
                {modalReport.recommendations?.growth.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <b>Increase Engagement</b>
              <ul>
                {modalReport.recommendations?.engagement.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <b>Drive Conversions</b>
              <ul>
                {modalReport.recommendations?.conversions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <b>Content Strategy</b>
              <ul>
                {modalReport.recommendations?.content.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <b>Monitor and Adjust</b>
              <ul>
                {modalReport.recommendations?.monitor.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <Divider />
              <Title level={5}>Conclusion</Title>
              <AntParagraph>{modalReport.conclusion}</AntParagraph>
              <Divider />
              <Text type='secondary'>
                Prepared by: {modalReport.preparedBy}
              </Text>
            </div>
            <Button
              type='primary'
              icon={<FiDownload />}
              disabled={!chartsReady}
              onClick={async () =>
                await exportReportToWord(
                  modalReport,
                  platformMetricsHistory,
                  consolidatedChartRef,
                  funnelChartRef
                )
              }
            >
              Download Word
            </Button>
          </>
        )}
      </Modal>
    </Box>
  )
}
