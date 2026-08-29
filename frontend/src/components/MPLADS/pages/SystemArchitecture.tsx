import {
  FiBell,
  FiBox,
  FiCamera,
  FiCheckSquare,
  FiCloudRain,
  FiCode,
  FiCpu,
  FiDatabase,
  FiGitBranch,
  FiGlobe,
  FiGrid,
  FiMap,
  FiShield,
  FiTrendingUp,
  FiZap,
} from 'react-icons/fi'
import './SystemArchitecture.css'

const frontendModules = [
  { icon: FiGrid, title: 'Views & App Shell', detail: 'App.tsx - routes - auth - notify' },
  { icon: FiTrendingUp, title: 'Command Center', detail: 'Overview metrics - top-risk feeds' },
  { icon: FiZap, title: 'Risk Forecaster', detail: 'Risk radar - DNA cards' },
  { icon: FiMap, title: 'GIS Maps', detail: 'Satellite view - heat layers' },
  { icon: FiCheckSquare, title: 'Duplicate Detector', detail: 'Match matrix - scheme diffs' },
  { icon: FiCamera, title: 'Verification', detail: 'Photo upload - GPS checks' },
]

const backendGroups = [
  {
    title: 'core/',
    icon: FiShield,
    modules: [
      { title: 'config.py', detail: 'env - credentials' },
      { title: 'security.py', detail: 'JWT - RBAC' },
      { title: 'database.py', detail: 'Mongo async' },
    ],
  },
  {
    title: 'services/ml',
    icon: FiCpu,
    modules: [
      { title: 'predictive_engine', detail: 'Delay & overrun scoring' },
      { title: 'dna_generator', detail: 'Multi-factor score' },
      { title: 'duplicate_engine', detail: 'FAISS + geo distance' },
      { title: 'anomaly_detector', detail: 'Isolation Forest / rules' },
      { title: 'ml_pipelines/', detail: 'Training - notebooks - vector index', wide: true },
    ],
  },
  {
    title: 'services/external + storage',
    icon: FiCloudRain,
    modules: [
      { title: 'gemini_service', detail: 'Prompt orchestration' },
      { title: 'weather_client', detail: 'Rainfall & climate' },
      { title: 'material_price_client', detail: 'Steel / cement indices' },
      { title: 's3_service', detail: 'Site photo buckets' },
      { title: 'alerts_feed', detail: 'Risk, duplicate and anomaly triggers', wide: true },
    ],
  },
]

const infrastructure = [
  { icon: FiDatabase, title: 'MongoDB', detail: 'Projects - MPs - risks' },
  { icon: FiBox, title: 'Redis cache', detail: 'API cache - queues' },
  { icon: FiCloudRain, title: 'S3 / MinIO', detail: 'Evidence storage' },
  { icon: FiMap, title: 'GIS boundaries', detail: 'District shapes' },
]

const thirdParty = [
  { icon: FiZap, title: 'Gemini API', detail: 'Narrative analysis' },
  { icon: FiCloudRain, title: 'Weather API', detail: 'Climate signal' },
  { icon: FiGlobe, title: 'Price indices', detail: 'Material trends' },
]

const SystemArchitecture = () => (
  <div className="architecture-page">
    <div className="architecture-header">
      <span className="architecture-kicker">Flow chart</span>
      <h1>ArthaNetra - System Architecture</h1>
      <p>
        A complete implementation map for the frontend, FastAPI services, data stores, ML engines,
        and third-party intelligence inputs.
      </p>
    </div>

    <section className="arch-band arch-band-frontend">
      <h2>
        <FiCode /> Frontend - React + Vite
      </h2>
      <div className="frontend-modules">
        {frontendModules.map(({ icon: Icon, title, detail }) => (
          <div className="arch-node" key={title}>
            <Icon />
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </section>

    <div className="arch-connector">
      <span>services/ - Axios API client - hooks - common UI</span>
      <b>HTTPS / JWT</b>
    </div>

    <section className="arch-band arch-band-backend">
      <h2>
        <FiGitBranch /> Backend - FastAPI
      </h2>
      <div className="router-node">
        <FiGitBranch />
        <strong>api/v1/router.py</strong>
        <span>auth - projects - risk_analysis - duplicate_check - geospatial - verification - alerts</span>
      </div>

      <div className="backend-grid">
        {backendGroups.map(({ title, icon: Icon, modules }) => (
          <div className="backend-group" key={title}>
            <h3>
              <Icon /> {title}
            </h3>
            <div className="backend-modules">
              {modules.map(module => (
                <div className={`backend-module ${module.wide ? 'wide' : ''}`} key={module.title}>
                  <strong>{module.title}</strong>
                  <span>{module.detail}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>

    <div className="lower-grid">
      <section className="arch-band arch-band-data">
        <h2>
          <FiDatabase /> Data & Infrastructure - docker-compose.yml
        </h2>
        <div className="infra-grid">
          {infrastructure.map(({ icon: Icon, title, detail }) => (
            <div className="infra-node" key={title}>
              <Icon />
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="arch-band arch-band-third">
        <h2>
          <FiGlobe /> Third-Party APIs
        </h2>
        <div className="infra-grid">
          {thirdParty.map(({ icon: Icon, title, detail }) => (
            <div className="infra-node" key={title}>
              <Icon />
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>
    </div>

    <div className="alert-flow">
      <FiBell />
      <strong>Alerts & Notification Feed</strong>
      <span>Preemptive triggers from risk, duplicate, weather, price and anomaly signals</span>
    </div>
  </div>
)

export default SystemArchitecture
