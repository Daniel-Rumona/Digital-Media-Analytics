import { useState, useEffect, useRef, useMemo } from 'react'
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
  FiLink
} from 'react-icons/fi'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import HighchartsMore from 'highcharts/highcharts-more'
import HighchartsFunnel from 'highcharts/modules/funnel'
import html2pdf from 'html2pdf.js'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import { FiMaximize2 } from 'react-icons/fi'
import { useCompanyData } from '@/context/company-data-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/firebase/firebase'
import { Box } from '@chakra-ui/react'
import useAiInsights from './useAIInsight'
import ReactMarkdown from 'react-markdown'

const { RangePicker, MonthPicker } = DatePicker
const { Text, Title, Paragraph } = Typography
const MotionIcon = motion(FiMaximize2)

if (typeof HighchartsFunnel === 'function') HighchartsFunnel(Highcharts)
if (typeof HighchartsMore === 'function') HighchartsMore(Highcharts)

Highcharts.setOptions({
  chart: { backgroundColor: 'transparent', style: { color: '#fff' } },
  title: { style: { color: '#fff' } },
  xAxis: {
    labels: { style: { color: '#fff' } },
    lineColor: '#fff',
    tickColor: '#fff',
    gridLineColor: '#444'
  },
  yAxis: {
    labels: { style: { color: '#fff' } },
    lineColor: '#fff',
    tickColor: '#fff',
    gridLineColor: '#444'
  },
  legend: { itemStyle: { color: '#fff' }, backgroundColor: 'transparent' },
  tooltip: { backgroundColor: 'rgba(30,30,30,0.98)', style: { color: '#fff' } },
  plotOptions: { series: { dataLabels: { color: '#fff' } } }
})

export default function ReportDashboard () {
  // Analytics state
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])
  const [expandedChart, setExpandedChart] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMonth, setModalMonth] = useState(null)
  const reportRef = useRef()
  const { companyData, user } = useCompanyData()
  const [metrics, setMetrics] = useState([])

  // Modal AI state
  const {
    insights: modalReport,
    loading: modalLoading,
    error: modalError,
    generateInsights
  } = useAiInsights()

  // Helper for fetching metrics if you want per month in modal
  const [modalMetrics, setModalMetrics] = useState([])

  // Injects PDF mode styles on first render if not already present
  if (typeof window !== 'undefined' && !document.getElementById('pdf-style')) {
    const style = document.createElement('style')
    style.id = 'pdf-style'
    style.innerHTML = `
      .pdf-mode, .pdf-mode * {
        background: #fff !important;
        color: #111 !important;
        border-color: #222 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    `
    document.head.appendChild(style)
  }

  function buildAIPayloadFromMetrics (metrics) {
    return metrics.map(row => ({
      name: row.platform.charAt(0).toUpperCase() + row.platform.slice(1),
      metrics: Object.entries(row.metrics || {}).map(([label, value]) => ({
        label: label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value
      }))
    }))
  }

  // Fetch Firestore metrics for dashboard/range
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
      setMetrics(snap.docs.map(doc => doc.data()))
    })
  }, [user, companyData, dateRange])

  // Fetch Firestore metrics for selected modal month
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
      setModalMetrics(snap.docs.map(doc => doc.data()))
    })
  }, [user, companyData, modalMonth])

  // Aggregate values per platform (dashboard)
  const agg = useMemo(() => {
    const platforms = {}
    metrics.forEach(row => {
      const pf = row.platform?.toLowerCase()
      if (!platforms[pf]) platforms[pf] = []
      platforms[pf].push(row.metrics || {})
    })
    const getSum = (pf, field) =>
      (platforms[pf] || []).reduce((a, b) => a + (Number(b[field]) || 0), 0)
    return { platforms, getSum }
  }, [metrics])

  // Handle modal open/close
  const openModal = () => {
    setIsModalOpen(true)
    setModalMonth(null)
    // No AI call yet
  }
  const closeModal = () => setIsModalOpen(false)

  // Only call generateInsights after selecting month and clicking button
  const handleGenerateReport = () => {
    if (!modalMonth) return
    const period = modalMonth.format('MMMM YYYY')
    const platforms = buildAIPayloadFromMetrics(modalMetrics)
    console.log({
      platforms,
      companyName: companyData?.companyName || '',
      period
    })

    generateInsights({
      platforms, // <-- match backend
      companyName: companyData?.companyName || '',
      period
    })
  }

  // PDF Download logic
  const downloadPDF = () => {
    if (reportRef.current) {
      reportRef.current.classList.add('pdf-mode')
      html2pdf()
        .from(reportRef.current)
        .set({
          margin: 0.5,
          filename: `Report_${
            modalMonth
              ? modalMonth.format('YYYY-MM')
              : dayjs().format('YYYY-MM')
          }.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .save()
        .then(() => reportRef.current.classList.remove('pdf-mode'))
        .catch(() => reportRef.current.classList.remove('pdf-mode'))
    }
  }

  function fixMarkdownTables (md) {
    if (!md) return md
    // Find all likely tables (lines with multiple pipes)
    return md.replace(/((?:\|[^\n]+\|)+)/g, block => {
      // Remove extra spaces
      let cleaned = block
        .replace(/\s*\|\s*/g, '|')
        .replace(/^\|/, '')
        .replace(/\|$/, '')
      // Split at header, align, and break into rows of 2 (or more) columns
      // Collapse duplicate pipes and remove empty segments
      let parts = cleaned.split('|').filter(Boolean)
      // Detect number of columns by counting first |...| after header
      let numCols = 2
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].match(/^-+$/)) {
          numCols = i
          break
        }
      }
      if (numCols < 2) numCols = 2 // fallback
      // Reassemble into lines
      let out = ''
      for (let i = 0; i < parts.length; i += numCols) {
        out += '| ' + parts.slice(i, i + numCols).join(' | ') + ' |\n'
      }
      return out
    })
  }

  // Summary values
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

  // Metric Cards (AntD Card + Typography)
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

  // Six Chart configs, using real data
  const chartConfigs = [
    // 1. Platform Metrics with View Trends
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
    // 2. Funnel Chart: Website Clicks → Landing Page Views → Signups → Bookings
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
    // 3. Monthly Trends for Likes and Followers (across all months in range)
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
    // 4. Pie Chart: Engagement Distribution
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
    // 5. Radar Chart (Polar): Engagement Quality Overview
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
    // 6. Monthly Growth in Followers (compare Instagram and X)
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
          onChange={dates => setDateRange(dates)}
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

      {/* Metrics Summary */}
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

      {/* Charts Grid (two per row) */}
      <div ref={reportRef}>
        <Row gutter={[24, 24]}>
          {chartConfigs.map((config, idx) => (
            <Col xs={24} md={12} key={idx}>
              <Card
                style={{
                  background: '#23242A',
                  color: '#fff',
                  minHeight: 360
                }}
                title={
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {config?.title?.text || `Chart ${idx + 1}`}
                  </Text>
                }
                extra={
                  <Button
                    size='small'
                    onClick={() =>
                      setExpandedChart(JSON.parse(JSON.stringify(config)))
                    }
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

      {/* Expand Chart Modal */}
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

      {/* PDF/Executive Modal */}
      {/* MODAL for AI report */}
      <Modal
        title={
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Generate AI Social Media Report
            </Title>
            <Text type='secondary'>
              Select a month and click "Generate Report"
            </Text>
          </div>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        width='700px'
        destroyOnClose
      >
        {/* Month selector and trigger */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            marginBottom: 20
          }}
        >
          <MonthPicker
            value={modalMonth}
            onChange={setModalMonth}
            placeholder='Select month'
            style={{
              background: '#2a2a2e',
              color: 'white',
              borderRadius: 6,
              width: 200
            }}
          />
          <Button
            type='primary'
            onClick={handleGenerateReport}
            disabled={!modalMonth}
            loading={modalLoading}
          >
            Generate Report
          </Button>
        </div>

        {/* Display result or error */}
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
              <Paragraph>{modalReport.overview}</Paragraph>
              <Divider />
              {modalReport.platforms?.map(platform => (
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
                            color: '#222', // << set to black/near-black!
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
                            color: '#222', // << set to black/near-black!
                            fontWeight: 600
                          }}
                        >
                          Value
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {platform.metrics.map(m => (
                        <tr key={m.label}>
                          <td
                            style={{ border: '1px solid #e5e7eb', padding: 8 }}
                          >
                            {m.label}
                          </td>
                          <td
                            style={{ border: '1px solid #e5e7eb', padding: 8 }}
                          >
                            {m.value}
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
              <Paragraph>{modalReport.conclusion}</Paragraph>
              <Divider />
              <Text type='secondary'>
                Prepared by: {modalReport.preparedBy}
              </Text>
            </div>
            <Button type='primary' icon={<FiDownload />} onClick={downloadPDF}>
              Download PDF
            </Button>
          </>
        )}
      </Modal>
    </Box>
  )
}
