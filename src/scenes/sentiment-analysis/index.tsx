import React, { useState } from 'react'
import { Row, Col, Card, Modal, Button } from 'antd'
import Highcharts, { chart } from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import wordcloud from 'highcharts/modules/wordcloud'
import solidGauge from 'highcharts/modules/solid-gauge'
import { ExpandOutlined } from '@ant-design/icons'

if (typeof Highcharts === 'function') {
  wordcloud(Highcharts)
  solidGauge(Highcharts)
}

const sentimentData = {
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
    itemHoverStyle: { color: '#ffd700' }, // Optional: highlight on hover
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

const ChartCard = ({ title, options }) => {
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

const SentimentAnalysis = () => {
  const totalKeywords = sentimentData.wordCloud.reduce(
    (sum, word) => sum + word.weight,
    0
  )

  const donutOptions = {
    chart: {
      type: 'pie',
      custom: {},
      events: {
        render () {
          const chart = this,
            series = chart.series[0]

          let customLabel = chart.options.chart.custom.label

          if (!customLabel) {
            customLabel = chart.options.chart.custom.label = chart.renderer
              .label(
                'Total Keywords<br/>' + `<strong>${totalKeywords}</strong>`
              )
              .css({
                color: '#fff',
                textAlign: 'center'
              })
              .attr({
                align: 'center'
              })
              .add()
          }

          const x = series.center[0] + chart.plotLeft,
            y =
              series.center[1] +
              chart.plotTop -
              customLabel.getBBox().height / 2

          customLabel.attr({
            x,
            y
          })

          customLabel.css({
            fontSize: `${series.center[2] / 12}px`
          })
        }
      }
    },
    title: {
      text: null
    },
    accessibility: {
      point: {
        valueSuffix: '%'
      }
    },
    xAxis: {
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      labels: {
        style: { color: '#fff' } // Axis labels
      },
      title: {
        style: { color: '#fff' } // Axis title
      }
    },
    yAxis: {
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      gridLineColor: '#444', // Optional: grid lines (keep darker for subtlety)
      labels: {
        style: { color: '#fff' }
      },
      title: {
        style: { color: '#fff' }
      }
    },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      series: {
        innerSize: '70%',
        borderRadius: 8,
        cursor: 'pointer',
        dataLabels: [
          {
            enabled: true,
            distance: 20,
            format: '{point.name}',
            color: '#fff'
          },
          {
            enabled: true,
            distance: -25,
            format: '{point.percentage:.1f}%',
            style: {
              fontSize: '0.9em',
              textOutline: 'none',
              color: '#fff'
            }
          }
        ]
      }
    },
    series: [
      {
        name: 'Sentiment',
        data: sentimentData.overall
      }
    ],
    credits: { enabled: false }
  }

  const gaugeOptions = {
    chart: { type: 'solidgauge' },
    title: null,
    pane: {
      startAngle: -90,
      endAngle: 90,
      background: {
        backgroundColor:
          Highcharts.defaultOptions.legend.backgroundColor || '#23232e', // use your card bg or transparent
        borderRadius: 5,
        innerRadius: '60%',
        outerRadius: '100%',
        shape: 'arc'
      }
    },
    yAxis: {
      stops: [
        [0.1, '#F56565'], // green
        [0.5, '#F6E05E'], // yellow
        [0.9, '#48BB78'] // red
      ],
      lineWidth: 0,
      tickWidth: 0,
      minorTickInterval: null,
      tickAmount: 2,
      title: { y: -70 },
      labels: { y: 16, style: { color: '#fff' } }
    },
    series: [{ name: 'Sentiment Score', data: [sentimentData.sentimentScore] }]
  }

  const lineOptions = {
    title: { text: null },
    chart: { type: 'spline' },
    legend: {
      itemStyle: {
        color: '#fff', // White legend text
        fontWeight: 'normal' // Optional: keep font clean
      },
      itemHoverStyle: {
        color: '#ffd700' // Optional: gold/yellow on hover for nice contrast
      },
      backgroundColor: 'transparent' // Keeps the legend background clear/dark
    },
    xAxis: {
      categories: sentimentData.trends.map(d => d.date),
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      labels: {
        style: { color: '#fff' } // Axis labels
      },
      title: {
        style: { color: '#fff' } // Axis title
      }
    },
    yAxis: {
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      gridLineColor: '#444', // Optional: grid lines (keep darker for subtlety)
      labels: {
        style: { color: '#fff' }
      },
      title: {
        style: { color: '#fff' }
      }
    },
    series: [
      {
        name: 'Positive',
        data: sentimentData.trends.map(d => d.positive),
        color: '#4caf50'
      },
      {
        name: 'Neutral',
        data: sentimentData.trends.map(d => d.neutral),
        color: '#ff9800'
      },
      {
        name: 'Negative',
        data: sentimentData.trends.map(d => d.negative),
        color: '#f44336'
      }
    ]
  }

  const barOptions = {
    chart: { type: 'column' },
    title: { text: null },
    legend: {
      itemStyle: {
        color: '#fff', // White legend text
        fontWeight: 'normal' // Optional: keep font clean
      },
      itemHoverStyle: {
        color: '#ffd700' // Optional: gold/yellow on hover for nice contrast
      },
      backgroundColor: 'transparent' // Keeps the legend background clear/dark
    },
    xAxis: {
      categories: sentimentData.platforms.map(p => p.platform),
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      labels: {
        style: { color: '#fff' } // Axis labels
      },
      title: {
        style: { color: '#fff' } // Axis title
      }
    },
    yAxis: {
      lineColor: '#fff', // Axis line
      tickColor: '#fff', // Tick marks
      gridLineColor: '#444', // Optional: grid lines (keep darker for subtlety)
      labels: {
        style: { color: '#fff' }
      },
      title: {
        style: { color: '#fff' }
      }
    },
    series: [
      {
        name: 'Positive',
        data: sentimentData.platforms.map(p => p.positive),
        color: '#4caf50'
      },
      {
        name: 'Neutral',
        data: sentimentData.platforms.map(p => p.neutral),
        color: '#ff9800'
      },
      {
        name: 'Negative',
        data: sentimentData.platforms.map(p => p.negative),
        color: '#f44336'
      }
    ]
  }

  const wordCloudOptions = {
    series: [
      { name: 'Keywords', type: 'wordcloud', data: sentimentData.wordCloud }
    ],
    title: { text: null }
  }

  return (
    <div style={{ padding: '24px' }}>
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
