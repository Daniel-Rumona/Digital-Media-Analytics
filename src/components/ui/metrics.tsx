import React, { useEffect, useState } from 'react'
import {
  Modal,
  Form,
  Select,
  Spin,
  message,
  DatePicker,
  InputNumber,
  Col,
  Row
} from 'antd'
import { db } from '@/firebase/firebase'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import dayjs, { Dayjs } from 'dayjs'

type PlatformKey = keyof typeof PLATFORM_METRICS

type PlatformMetric = {
  [key in PlatformKey]: string[]
}

// Define metrics per platform
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

interface Company {
  id: string
  companyName: string
  accounts?: { platform: string }[]
}

interface CompanyMetricsSetupModalProps {
  open: boolean
  onCancel: () => void
  userId: string
}

// Form value shapes
interface MetricsFormShape {
  [metric: string]: number | undefined
}

interface FormValues {
  company: string
  platform: string
  date: Dayjs
  metrics: MetricsFormShape
}

const CompanyMetricsSetupModal: React.FC<CompanyMetricsSetupModalProps> = ({
  open,
  onCancel,
  userId
}) => {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState<boolean>(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [platforms, setPlatforms] = useState<
    { label: string; value: string }[]
  >([])
  const [metricFields, setMetricFields] = useState<string[]>([])

  // Fetch all companies on open
  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      const snap = await getDocs(collection(db, 'users', userId, 'companies'))
      const companyArr = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Company, 'id'>)
      }))
      setCompanies(companyArr)
      setLoading(false)
    })()
  }, [open, userId])

  // When company changes, update platform dropdown
  const handleFormValuesChange = (
    changedValues: Partial<FormValues>,
    allValues: FormValues
  ) => {
    if ('company' in changedValues) {
      const selectedCompany = changedValues.company
      const company = companies.find(c => c.id === selectedCompany)
      setPlatforms(
        Array.isArray(company?.accounts)
          ? company.accounts.map(acc => ({
              label:
                acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1),
              value: acc.platform.toLowerCase()
            }))
          : []
      )
      // Reset fields
      form.setFieldsValue({
        platform: undefined,
        metrics: {},
        date: undefined
      } as any)
      setMetricFields([])
    }
    if ('platform' in changedValues) {
      const selectedPlatform = changedValues.platform
      // Only set metrics if valid
      const metrics =
        selectedPlatform && PLATFORM_METRICS[selectedPlatform as PlatformKey]
          ? PLATFORM_METRICS[selectedPlatform as PlatformKey]
          : []
      setMetricFields(metrics)
      // Reset metric values
      const emptyMetrics: MetricsFormShape = {}
      metrics.forEach(m => {
        emptyMetrics[m] = undefined
      })
      form.setFieldsValue({ metrics: emptyMetrics } as any)
    }
  }

  const onFinish = async (values: FormValues) => {
    const { company, platform, date, metrics } = values
    try {
      const companyObj = companies.find(c => c.id === company)
      if (!companyObj) throw new Error('Company not found')
      await addDoc(
        collection(db, 'users', userId, 'companies', company, 'metrics'),
        {
          platform,
          metrics,
          period: dayjs(date).format('YYYY-MM'),
          createdAt: new Date()
        }
      )
      message.success('Metrics saved!')
      form.resetFields()
      setMetricFields([])
      onCancel()
    } catch (err: any) {
      message.error(
        'Error saving metrics: ' + (err?.message ?? 'Unknown error')
      )
    }
  }

  return (
    <Modal
      open={open}
      title='Setup Platform Metrics to Track'
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText='Save'
      destroyOnClose
    >
      {loading ? (
        <Spin />
      ) : (
        <Form<FormValues>
          form={form}
          layout='vertical'
          onFinish={onFinish}
          onValuesChange={handleFormValuesChange}
        >
          <Form.Item
            label='Company'
            name='company'
            rules={[{ required: true, message: 'Select company' }]}
          >
            <Select
              options={companies.map(c => ({
                value: c.id,
                label: c.companyName
              }))}
              placeholder='Select company'
              showSearch
              optionFilterProp='label'
            />
          </Form.Item>
          <Form.Item
            label='Platform'
            name='platform'
            rules={[{ required: true, message: 'Select platform' }]}
          >
            <Select
              disabled={!platforms.length}
              options={platforms}
              placeholder='Select platform'
              showSearch
              optionFilterProp='label'
            />
          </Form.Item>
          <Form.Item
            label='Date'
            name='date'
            rules={[{ required: true, message: 'Select month' }]}
          >
            <DatePicker picker='month' style={{ width: '100%' }} />
          </Form.Item>
          {metricFields.length > 0 && (
            <Form.Item label='Enter Metrics'>
              <Row gutter={16}>
                {metricFields.map((metric, idx) => {
                  const isLast = idx === metricFields.length - 1
                  const isOdd = metricFields.length % 2 === 1
                  const spanProps =
                    isLast && isOdd ? { span: 24 } : { span: 12 }
                  return (
                    <Col {...spanProps} key={metric}>
                      <Form.Item
                        name={['metrics', metric]}
                        label={metric.charAt(0).toUpperCase() + metric.slice(1)}
                        rules={[
                          {
                            required: true,
                            message: `Please enter ${metric}`
                          }
                        ]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          placeholder={metric}
                        />
                      </Form.Item>
                    </Col>
                  )
                })}
              </Row>
            </Form.Item>
          )}
        </Form>
      )}
    </Modal>
  )
}

export default CompanyMetricsSetupModal
