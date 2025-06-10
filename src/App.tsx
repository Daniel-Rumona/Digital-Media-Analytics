import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './scenes/landing/landing'
import RegistrationPage from './scenes/registration'
import LoginPage from './scenes/login'
import Dashboard from './scenes/dashboard'
import Layout from './components/ui/Layout/Layout'
import ReportDashboard from './scenes/reports'
import PlatformAnalysis from './scenes/platforms'
import SentimentAnalysis from './scenes/sentiment-analysis'
import CompaniesTable from './scenes/companies'
import CompanyMetricsManager from './scenes/metrics'
import PostAnalysis from './scenes/post-analysis'

function App () {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<LandingPage />} />
        <Route path='/register' element={<RegistrationPage />} />
        <Route path='/login' element={<LoginPage />} />
        <Route
          path='/dashboard'
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path='/report'
          element={
            <Layout>
              <ReportDashboard />
            </Layout>
          }
        />
        <Route
          path='/platforms'
          element={
            <Layout>
              <PlatformAnalysis />
            </Layout>
          }
        />
        <Route
          path='/metrics'
          element={
            <Layout>
              <CompanyMetricsManager />
            </Layout>
          }
        />
        <Route
          path='/post-analysis'
          element={
            <Layout>
              <PostAnalysis />
            </Layout>
          }
        />
        <Route
          path='/companies'
          element={
            <Layout>
              <CompaniesTable />
            </Layout>
          }
        />
        <Route
          path='/sentiment-analysis'
          element={
            <Layout>
              <SentimentAnalysis />
            </Layout>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
