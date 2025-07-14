import React, { useEffect, useState, useMemo } from 'react'
import {
  Modal,
  Form,
  Select,
  Spin,
  message,
  DatePicker,
  InputNumber,
  Col,
  Row,
  Table,
  Button,
  Tag,
  Flex
} from 'antd'
import { db } from '@/firebase/firebase'
import {
  collection,
  getDocs,
  doc,
  setDoc,
  addDoc,
  query,
  where
} from 'firebase/firestore'
import dayjs, { Dayjs } from 'dayjs'
import { useCompanyData } from '@/context/company-data-context'
import { Box } from '@chakra-ui/react'

type PlatformKey = keyof typeof PLATFORM_METRICS

const PLATFORM_METRICS = {
  google: [
    'rating',
    'reviews',
    'search hits',
    'views',
    'directions',
    'website clicks',
    'chat clicks',
    'calls',
    'booking clicks'
  ],
  facebook: [
    'posts',
    'views',
    'reach',
    'content interactions',
    'link clicks',
    'visits',
    'new follows'
  ],
  instagram: [
    'posts',
    'views',
    'reach',
    'content interactions',
    'link clicks',
    'visits',
    'new follows'
  ],
  linkedin: [
    'impressions',
    'reactions',
    'comments',
    'page views',
    'new follows',
    'searches'
  ],
  tiktok: [
    'posts',
    'new follows',
    'post views',
    'profile views',
    'likes',
    'comments',
    'shares'
  ],
  x: ['new follows', 'posts', 'views', 'likes', 'shares']
} as const

interface MetricDoc {
  platform: string
  period: string // "YYYY-MM"
  metrics?: Record<string, number>
  id?: string // for edit
}

interface MetricsFormShape {
  platform: PlatformKey | ''
  date: Dayjs | null
  metrics: { [metric: string]: number | undefined }
}

const CompanyMetricsManager: React.FC = () => {
  const { companyData, user } = useCompanyData()
  const [metrics, setMetrics] = useState<MetricDoc[]>([])
  const [platformFilter, setPlatformFilter] = useState<string | undefined>()
  const [monthFilter, setMonthFilter] = useState<Dayjs | undefined>()
  const [loading, setLoading] = useState(false)

  // MODAL STATE
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEditDoc, setModalEditDoc] = useState<MetricDoc | null>(null)
  const [form] = Form.useForm<MetricsFormShape>()
  const [metricFields, setMetricFields] = useState<string[]>([])

  // Only platforms this company has connected
  const connectedPlatforms = useMemo(() => {
    if (!companyData?.accounts) return []
    return companyData.accounts
      .map(acc => acc.platform.toLowerCase())
      .filter((p, i, arr) => p && arr.indexOf(p) === i && PLATFORM_METRICS[p])
  }, [companyData])

  // All periods in data
  const periods = useMemo(
    () => Array.from(new Set(metrics.map(m => m.period))).sort(),
    [metrics]
  )

  // Fetch all metrics for this company
  useEffect(() => {
    if (!user || !companyData?.id) return
    setLoading(true)
    getDocs(
      collection(db, 'users', user.uid, 'companies', companyData.id, 'metrics')
    ).then(snap => {
      setMetrics(
        snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MetricDoc))
      )
      setLoading(false)
    })
  }, [user, companyData, modalOpen])

  // Filtered table data
  const filtered = useMemo(
    () =>
      metrics.filter(
        m =>
          (!platformFilter || m.platform === platformFilter) &&
          (!monthFilter || m.period === monthFilter.format('YYYY-MM'))
      ),
    [metrics, platformFilter, monthFilter]
  )

  // Find missing rows (platform/month combos with no data)
  const missingRows = useMemo(() => {
    if (!connectedPlatforms.length || !periods.length) return []
    const exists = new Set(metrics.map(m => m.platform + '-' + m.period))
    return periods.flatMap(period =>
      connectedPlatforms
        .filter(
          p =>
            // Only show missing for active filter!
            (!platformFilter || p === platformFilter) &&
            (!monthFilter || period === monthFilter.format('YYYY-MM')) &&
            !exists.has(p + '-' + period)
        )
        .map(p => ({ platform: p, period }))
    )
  }, [metrics, periods, connectedPlatforms, platformFilter, monthFilter])

  // ---- Modal logic ----
  const openAddModal = (platform?: string, period?: string) => {
    setModalEditDoc(null)
    setMetricFields(
      platform ? PLATFORM_METRICS[platform as PlatformKey] || [] : []
    )
    form.resetFields()
    form.setFieldsValue({
      platform: platform || '',
      date: period ? dayjs(period, 'YYYY-MM') : null,
      metrics: {}
    })
    setModalOpen(true)
  }

  const openEditModal = (doc: MetricDoc) => {
    setModalEditDoc(doc)
    setMetricFields(PLATFORM_METRICS[doc.platform as PlatformKey] || [])
    form.setFieldsValue({
      platform: doc.platform,
      date: dayjs(doc.period, 'YYYY-MM'),
      metrics: doc.metrics || {}
    })
    setModalOpen(true)
  }

  // Dynamically update metric fields in modal
  const handleFormValuesChange = (
    changed: Partial<MetricsFormShape>,
    all: MetricsFormShape
  ) => {
    if ('platform' in changed) {
      const selectedPlatform = changed.platform as PlatformKey
      setMetricFields(
        selectedPlatform ? PLATFORM_METRICS[selectedPlatform] ?? [] : []
      )
      // Reset metrics fields
      const emptyMetrics: Record<string, number | undefined> = {}(
        PLATFORM_METRICS[selectedPlatform] || []
      ).forEach(m => {
        emptyMetrics[m] = undefined
      })
      form.setFieldsValue({ metrics: emptyMetrics })
    }
  }

  // Add or Edit
  const handleFinish = async (values: MetricsFormShape) => {
    if (!user?.uid || !companyData?.id) return
    setLoading(true)
    const metricsRef = collection(
      db,
      'users',
      user.uid,
      'companies',
      companyData.id,
      'metrics'
    )
    const period = dayjs(values.date).format('YYYY-MM')
    // Prevent duplicate for platform+month
    const q = query(
      metricsRef,
      where('platform', '==', values.platform),
      where('period', '==', period)
    )
    const existing = await getDocs(q)
    if (
      existing.size &&
      (!modalEditDoc || existing.docs[0].id !== modalEditDoc.id)
    ) {
      setLoading(false)
      message.error('Metrics for this platform and month already exist.')
      return
    }
    try {
      if (modalEditDoc) {
        await setDoc(doc(metricsRef, modalEditDoc.id!), {
          platform: values.platform,
          metrics: values.metrics,
          period,
          updatedAt: new Date()
        })
      } else {
        await addDoc(metricsRef, {
          platform: values.platform,
          metrics: values.metrics,
          period,
          createdAt: new Date()
        })
      }
      message.success('Metrics saved!')
      setModalOpen(false)
      form.resetFields()
    } catch (err: any) {
      message.error(err.message)
    }
    setLoading(false)
  }

  // ---- Table columns ----
  const columns = [
    {
      title: 'Platform',
      dataIndex: 'platform',
      render: (platform: string) =>
        platform.charAt(0).toUpperCase() + platform.slice(1)
    },
    { title: 'Month', dataIndex: 'period' },
    {
      title: 'Status',
      key: 'status',
      render: (rec: MetricDoc) => {
        const allMetrics = PLATFORM_METRICS[rec.platform as PlatformKey] || []
        const filled = Object.entries(rec.metrics || {}).filter(
          ([_, v]) => v !== undefined && v !== null
        ).length
        return (
          <span>
            {filled} / {allMetrics.length} filled{' '}
            {filled === allMetrics.length ? (
              <Tag color='green' style={{ marginLeft: 8 }}>
                Complete
              </Tag>
            ) : (
              <Tag color='orange' style={{ marginLeft: 8 }}>
                Incomplete
              </Tag>
            )}
          </span>
        )
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, rec: any) => (
        <Button
          onClick={() =>
            rec.metrics
              ? openEditModal(rec)
              : openAddModal(rec.platform, rec.period)
          }
        >
          {rec.metrics ? 'Edit' : 'Add'}
        </Button>
      )
    }
  ]

  // Merge filled + missing rows for table
  const tableData = [
    ...filtered,
    ...missingRows.map(r => ({
      platform: r.platform,
      period: r.period,
      metrics: undefined
    }))
  ].sort((a, b) =>
    a.platform === b.platform
      ? a.period.localeCompare(b.period)
      : a.platform.localeCompare(b.platform)
  )

  return (
    <Box p={8}>
      <Flex
        justify='flex-start'
        align='center'
        style={{ marginBottom: 10 }}
        gap={16}
      >
        <Select
          value={platformFilter}
          onChange={setPlatformFilter}
          allowClear
          style={{ width: 160 }}
          placeholder='Platform'
        >
          {connectedPlatforms.map(p => (
            <Select.Option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Select.Option>
          ))}
        </Select>
        <DatePicker
          picker='month'
          value={monthFilter}
          onChange={setMonthFilter}
          style={{ width: 140 }}
        />
        <Button type='primary' onClick={() => openAddModal()}>
          Add New
        </Button>
      </Flex>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={tableData}
          rowKey={r => `${r.platform}_${r.period}`}
          expandable={{
            expandedRowRender: rec => {
              const allMetrics =
                PLATFORM_METRICS[rec.platform as PlatformKey] || []
              return (
                <Row gutter={8}>
                  {allMetrics.map(metric => {
                    const val = rec.metrics?.[metric]
                    return (
                      <Col span={8} key={metric} style={{ marginBottom: 8 }}>
                        <b>
                          {metric.charAt(0).toUpperCase() + metric.slice(1)}:
                        </b>{' '}
                        {val !== undefined && val !== null ? (
                          <span style={{ color: '#52c41a' }}>{val}</span>
                        ) : (
                          <Tag color='red'>Missing</Tag>
                        )}
                      </Col>
                    )
                  })}
                </Row>
              )
            }
          }}
        />
      </Spin>
      <Modal
        open={modalOpen}
        title={modalEditDoc ? 'Edit Platform Metrics' : 'Add Platform Metrics'}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText='Save'
        destroyOnClose
        confirmLoading={loading}
      >
        <Form<MetricsFormShape>
          form={form}
          layout='vertical'
          onFinish={handleFinish}
          onValuesChange={handleFormValuesChange}
        >
          <Form.Item
            label='Platform'
            name='platform'
            rules={[{ required: true, message: 'Select platform' }]}
          >
            <Select
              options={connectedPlatforms.map(p => ({
                value: p,
                label: p.charAt(0).toUpperCase() + p.slice(1)
              }))}
              placeholder='Select platform'
              disabled={!!modalEditDoc}
              showSearch
            />
          </Form.Item>
          <Form.Item
            label='Month'
            name='date'
            rules={[{ required: true, message: 'Select month' }]}
          >
            <DatePicker
              picker='month'
              style={{ width: '100%' }}
              disabled={!!modalEditDoc}
            />
          </Form.Item>
          {metricFields.length > 0 && (
            <Form.Item label='Metrics'>
              <Row gutter={16}>
                {metricFields.map((metric, idx) => (
                  <Col span={12} key={metric}>
                    <Form.Item
                      name={['metrics', metric]}
                      label={metric.charAt(0).toUpperCase() + metric.slice(1)}
                      rules={[{ required: true, message: `Enter ${metric}` }]}
                    >
                      <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Box>
  )
}

export default CompanyMetricsManager
