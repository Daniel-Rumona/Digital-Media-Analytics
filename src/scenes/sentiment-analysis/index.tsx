import React, { useState, FC } from 'react'
import { Row, Col, Card, Modal, Button } from 'antd'
import Highcharts, { Options, Chart } from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import wordcloud from 'highcharts/modules/wordcloud'
import solidGauge from 'highcharts/modules/solid-gauge'
import { ExpandOutlined } from '@ant-design/icons'

// TypeScript module augmentation for Highcharts
if (typeof Highcharts === 'object') {
  wordcloud(Highcharts)
  solidGauge(Highcharts)
}

// --- Types
type SentimentPoint = { name: string; y: number; color: string }
type TrendPoint = {
  month: string
  positive: number
  neutral: number
  negative: number
}
type PlatformPoint = {
  platform: string
  positive: number
  neutral: number
  negative: number
}
type WordCloudPoint = { name: string; weight: number }

interface ChartCardProps {
  title: string
  options: Options
}

interface SentimentDataType {
  overall: SentimentPoint[]
  trends: TrendPoint[]
  platforms: PlatformPoint[]
  wordCloud: WordCloudPoint[]
  sentimentScore: number
}

const sentimentData: SentimentDataType = {
  overall: [
    { name: 'Positive', y: 48, color: '#4caf50' },
    { name: 'Neutral', y: 30, color: '#ff9800' },
    { name: 'Negative', y: 22, color: '#f44336' }
  ],
  trends: [
    { month: 'Jan', positive: 10, neutral: 25, negative: 15 },
    { month: 'Feb', positive: 25, neutral: 28, negative: 17 },
    { month: 'Mar', positive: 48, neutral: 24, negative: 18 },
    { month: 'Apr', positive: 62, neutral: 52, negative: 16 },
    { month: 'May', positive: 59, neutral: 26, negative: 15 },
    { month: 'Jun', positive: 63, neutral: 20, negative: 17 },
    { month: 'Jul', positive: 25, neutral: 18, negative: 37 },
    { month: 'Aug', positive: 64, neutral: 20, negative: 16 },
    { month: 'Sep', positive: 60, neutral: 23, negative: 57 },
    { month: 'Oct', positive: 58, neutral: 25, negative: 45 },
    { month: 'Nov', positive: 57, neutral: 27, negative: 16 },
    { month: 'Dec', positive: 61, neutral: 24, negative: 15 }
  ],
  platforms: [
    { platform: 'Facebook', positive: 62, neutral: 22, negative: 16 },
    { platform: 'Instagram', positive: 59, neutral: 24, negative: 17 },
    { platform: 'X', positive: 56, neutral: 26, negative: 18 },
    { platform: 'Google', positive: 65, neutral: 20, negative: 15 },
    { platform: 'YouTube', positive: 60, neutral: 25, negative: 15 }
  ],
  wordCloud: [
    { name: 'Amazing', weight: 25 },
    { name: 'Poor', weight: 20 },
    { name: 'Excellent', weight: 18 },
    { name: 'Bad', weight: 15 },
    { name: 'Satisfied', weight: 14 },
    { name: 'Complaint', weight: 12 },
    { name: 'Helpful', weight: 10 },
    { name: 'Rude', weight: 9 },
    { name: 'Friendly', weight: 8 },
    { name: 'Delay', weight: 7 }
  ],
  sentimentScore: 74
}

// Highcharts default dark styles
Highcharts.setOptions({
  chart: {
    backgroundColor: 'transparent',
    style: { color: '#fff' }
  },
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
  legend: {
    itemStyle: { color: '#fff' },
    itemHoverStyle: { color: '#ffd700' },
    backgroundColor: 'transparent'
  },
  tooltip: {
    backgroundColor: 'rgba(30,30,30,0.98)',
    style: { color: '#fff' }
  },
  plotOptions: {
    series: {
      dataLabels: {
        color: '#fff'
      }
    }
  }
})

// --- ChartCard (typed)
const ChartCard: FC<ChartCardProps> = ({ title, options }) => {
  const [visible, setVisible] = useState(false)
  return (
    <>
      <Card
        title={<span style={{ color: '#fff' }}>{title}</span>}
        extra={
          <Button
            type='text'
            icon={<ExpandOutlined />}
            onClick={() => setVisible(true)}
          />
        }
        style={{ marginBottom: 16, background: '#2a2a2e', color: '#fff' }}
      >
        <HighchartsReact highcharts={Highcharts} options={options} />
      </Card>
      <Modal
        title={title}
        open={visible}
        footer={null}
        width='80%'
        onCancel={() => setVisible(false)}
        centered
      >
        <HighchartsReact highcharts={Highcharts} options={options} />
      </Modal>
    </>
  )
}

// --- Main
const SentimentAnalysis: FC = () => {
  const totalKeywords = sentimentData.wordCloud.reduce(
    (sum, word) => sum + word.weight,
    0
  )

  // Donut chart for overall sentiment
  const donutOptions: Options = {
    chart: {
      type: 'pie',
      events: {
        render (this: Chart) {
          const chart = this
          // Custom label
          let customLabel = (chart as any).customLabel
          if (!customLabel) {
            customLabel = (chart as any).customLabel = chart.renderer
              .label(
                `Total Keywords<br/><strong>${totalKeywords}</strong>`,
                chart.plotWidth / 2,
                chart.plotHeight / 2,
                null,
                0,
                0,
                true
              )
              .css({
                color: '#fff',
                textAlign: 'center'
              })
              .attr({ align: 'center', zIndex: 10 })
              .add()
          }
          const series = chart.series[0]
          if (series) {
            const x = series.center[0] + chart.plotLeft
            const y =
              series.center[1] +
              chart.plotTop -
              customLabel.getBBox().height / 2
            customLabel.attr({ x, y })
            customLabel.css({
              fontSize: `${series.center[2] / 12}px`
            })
          }
        }
      } as any // Chart events type fudge for Highcharts
    },
    title: { text: null },
    accessibility: { point: { valueSuffix: '%' } },
    plotOptions: {
      pie: {
        innerSize: '70%',
        borderRadius: 8,
        dataLabels: {
          enabled: true,
          format: '{point.name}: {point.percentage:.1f}%',
          color: '#fff'
        }
      }
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    series: [
      {
        name: 'Sentiment',
        type: 'pie',
        data: sentimentData.overall
      }
    ],
    credits: { enabled: false }
  }

  // Gauge chart for overall sentiment score
  const gaugeOptions: Options = {
    chart: { type: 'solidgauge' },
    title: null,
    pane: {
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor:
          Highcharts.defaultOptions.legend?.backgroundColor || '#23232e',
        borderRadius: 5,
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    yAxis: {
      min: 0,
      max: 100,
      stops: [
        [0.1, '#F56565'], // red
        [0.5, '#F6E05E'], // yellow
        [0.9, '#48BB78'] // green
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      labels: { y: 16, style: { color: '#fff' } }
    },
    series: [
      {
        name: 'Sentiment Score',
        type: 'solidgauge',
        data: [sentimentData.sentimentScore]
      }
    ]
  }

  // Trends over time (line)
  const lineOptions: Options = {
    title: { text: null },
    chart: { type: 'spline' },
    xAxis: {
      categories: sentimentData.trends.map(d => d.month)
    },
    series: [
      {
        name: 'Positive',
        type: 'spline',
        data: sentimentData.trends.map(d => d.positive),
        color: '#4caf50'
      },
      {
        name: 'Neutral',
        type: 'spline',
        data: sentimentData.trends.map(d => d.neutral),
        color: '#ff9800'
      },
      {
        name: 'Negative',
        type: 'spline',
        data: sentimentData.trends.map(d => d.negative),
        color: '#f44336'
      }
    ]
  }

  // Platform comparison (bar)
  const barOptions: Options = {
    chart: { type: 'column' },
    title: { text: null },
    xAxis: {
      categories: sentimentData.platforms.map(p => p.platform)
    },
    series: [
      {
        name: 'Positive',
        type: 'column',
        data: sentimentData.platforms.map(p => p.positive),
        color: '#4caf50'
      },
      {
        name: 'Neutral',
        type: 'column',
        data: sentimentData.platforms.map(p => p.neutral),
        color: '#ff9800'
      },
      {
        name: 'Negative',
        type: 'column',
        data: sentimentData.platforms.map(p => p.negative),
        color: '#f44336'
      }
    ]
  }

  // Word cloud chart
  const wordCloudOptions: Options = {
    title: { text: null },
    series: [
      {
        name: 'Keywords',
        type: 'wordcloud',
        data: sentimentData.wordCloud
      }
    ]
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <ChartCard title='Overall Sentiment' options={donutOptions} />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard title='Sentiment Score' options={gaugeOptions} />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard title='Sentiment Trends Over Time' options={lineOptions} />
        </Col>
        <Col xs={24} md={12}>
          <ChartCard title='Sentiment by Platform' options={barOptions} />
        </Col>
        <Col xs={24}>
          <ChartCard title='Sentiment Keywords' options={wordCloudOptions} />
        </Col>
      </Row>
    </div>
  )
}

export default SentimentAnalysis
