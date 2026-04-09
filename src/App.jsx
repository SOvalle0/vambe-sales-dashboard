import { useState } from 'react'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import PipelineIntelligence from './pages/PipelineIntelligence'
import ClientsExplorer from './pages/ClientsExplorer'
import GrowthAnalysis from './pages/GrowthAnalysis'
import RetentionIntelligence from './pages/RetentionIntelligence'
import ConversionAnalysis from './pages/ConversionAnalysis'

export default function App() {
  const [activeView, setActiveView] = useState('overview')

  const pages = {
    overview: <Overview />,
    pipeline: <PipelineIntelligence />,
    clients: <ClientsExplorer />,
    growth: <GrowthAnalysis />,
    retention: <RetentionIntelligence />,
    conversion: <ConversionAnalysis />,
  }

  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {pages[activeView]}
    </Layout>
  )
}
