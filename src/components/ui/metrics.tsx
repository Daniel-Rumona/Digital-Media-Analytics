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
import { collection, getDocs, addDoc, doc } from 'firebase/firestore'
import dayjs from 'dayjs'

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
}

const CompanyMetricsSetupModal = ({ open, onCancel, userId }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [metricFields, setMetricFields] = useState([])

  // Fetch all companies on open
  useEffect(() => {
    if (!open) return
    ;(async () => {
      setLoading(true)
      const snap = await getDocs(collection(db, 'users', userId, 'companies'))
      const companyArr = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setCompanies(companyArr)
      setLoading(false)
    })()
  }, [open, userId])
  

  // When company changes, update platform dropdown
  const handleFormValuesChange = (changedValues, allValues) => {
    if ('company' in changedValues) {
      const selectedCompany = changedValues.company
      const company = companies.find(c => c.id === selectedCompany)
      setPlatforms(
        Array.isArray(company?.accounts)
          ? company.accounts.map(acc => ({
              label:
                acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1),
              value: acc.platform.toLowerCase() // ensure key matches mapping!
            }))
          : []
      )
      // Reset fields
      form.setFieldsValue({ platform: undefined, metrics: {}, date: undefined })
      setMetricFields([])
    }
    if ('platform' in changedValues) {
      const selectedPlatform = changedValues.platform
      const metrics = PLATFORM_METRICS[selectedPlatform?.toLowerCase?.()] || []
      setMetricFields(metrics)
      // Reset metric values
      const emptyMetrics = {}
      metrics.forEach(m => {
        emptyMetrics[m] = undefined
      })
      form.setFieldsValue({ metrics: emptyMetrics })
    }
  }

  const onFinish = async values => {
    const { company, platform, date, metrics } = values
    try {
      const companyObj = companies.find(c => c.id === company)
      if (!companyObj) throw new Error('Company not found')
      // Save metrics to a subcollection for this company, by month+platform
      await addDoc(
        collection(db, 'users', userId, 'companies', company, 'metrics'),
        {
          platform,
          metrics,
          period: dayjs(date).format('YYYY-MM'), // "2024-06"
          createdAt: new Date()
        }
      )
      message.success('Metrics saved!')
      form.resetFields()
      setMetricFields([])
      onCancel()
    } catch (err) {
      message.error('Error saving metrics: ' + err.message)
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
        <Form
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
                  // Last metric AND odd count? Span both columns.
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
                          { required: true, message: `Please enter ${metric}` }
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
