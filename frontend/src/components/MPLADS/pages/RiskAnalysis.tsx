import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiGitBranch,
  FiMap,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi'
import apiClient from '../../../services/api/apiClient'
import './RiskAnalysis.css'

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
type SortKey = 'riskScore' | 'utilization' | 'allocated' | 'expenditure'

interface RiskWork {
  workId: number
  name: string
  category: string
  constituency: string
  riskScore: number
  riskLevel: RiskLevel
  utilization: number
  allocated: number
  expenditure: number
  reasons: string[] | string
}

interface RiskSummary {
  totalWorks: number
  highRisk: number
  mediumRisk: number
  lowRisk: number
}

const normalizeReasons = (reasons: RiskWork['reasons']) => {
  if (Array.isArray(reasons)) return reasons.filter(Boolean)
  if (typeof reasons === 'string' && reasons.trim()) {
    return reasons
      .split(/(?=No expenditure|Work is pending|Low utilization|High allocation|Payment)/)
      .map(reason => reason.trim())
      .filter(Boolean)
  }
  return []
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 1,
    notation: 'compact',
  }).format(Number(value) || 0)

const RiskAnalysis = () => {
  const [works, setWorks] = useState<RiskWork[]>([])
  const [summary, setSummary] = useState<RiskSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'ALL' | RiskLevel>('ALL')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('riskScore')

  const fetchRiskData = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await apiClient.get('/ai/risk-analysis')
      const analysis = response?.data?.data || response?.data || response
      const results = Array.isArray(analysis.results) ? analysis.results : []

      setWorks(results)
      setSummary({
        totalWorks: analysis.totalWorks || results.length || 0,
        highRisk: analysis.highRiskCount || 0,
        mediumRisk: analysis.mediumRiskCount || 0,
        lowRisk: analysis.lowRiskCount || 0,
      })
    } catch (err) {
      console.error('Risk Analysis Error:', err)
      setError('Failed to load risk analysis data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRiskData()
  }, [])

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(works.map(work => work.category).filter(Boolean))).sort()],
    [works]
  )

  const filteredWorks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return works
      .filter(work => filter === 'ALL' || work.riskLevel === filter)
      .filter(work => category === 'ALL' || work.category === category)
      .filter(work => {
        if (!normalizedQuery) return true
        return [work.name, work.constituency, work.category]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => Number(b[sortKey] || 0) - Number(a[sortKey] || 0))
  }, [category, filter, query, sortKey, works])

  const visibleWorks = filteredWorks.slice(0, 80)
  const total = summary?.totalWorks || works.length || 1
  const riskExposure = Math.round((((summary?.highRisk || 0) + (summary?.mediumRisk || 0)) / total) * 100)
  const topConstituencies = useMemo(() => {
    const counts = new Map<string, number>()
    works
      .filter(work => work.riskLevel === 'HIGH')
      .forEach(work => counts.set(work.constituency, (counts.get(work.constituency) || 0) + 1))

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
  }, [works])

  if (loading) {
    return (
      <div className="risk-analysis risk-analysis--state">
        <FiRefreshCw className="spin" />
        <h1>Preparing Risk Intelligence Center</h1>
        <p>Reading project utilization, expenditure and status signals.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="risk-analysis risk-analysis--state">
        <FiAlertTriangle />
        <h1>Risk intelligence unavailable</h1>
        <p className="risk-error">{error}</p>
        <button type="button" className="refresh-button" onClick={fetchRiskData}>
          Retry analysis
        </button>
      </div>
    )
  }

  return (
    <div className="risk-analysis">
      <section className="risk-hero">
        <div>
          <span className="intel-kicker">AI-assisted / rule-based risk scoring</span>
          <h1>Risk Intelligence Center</h1>
          <p>
            Prioritize MPLADS works that need field attention using utilization, expenditure and
            completion signals from the live backend.
          </p>
        </div>

        <div className="risk-header-actions">
          <Link to="/mplads/maps" className="risk-link-button">
            <FiMap /> Open Map
          </Link>
          <Link to="/mplads/architecture" className="risk-link-button">
            <FiGitBranch /> AI Core
          </Link>
          <button type="button" onClick={fetchRiskData} className="refresh-button">
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </section>

      <section className="risk-command-grid">
        {[
          ['Total analyzed', summary?.totalWorks || 0, 'total'],
          ['High risk', summary?.highRisk || 0, 'high'],
          ['Medium risk', summary?.mediumRisk || 0, 'medium'],
          ['Low risk', summary?.lowRisk || 0, 'low'],
          ['Risk exposure', `${riskExposure}%`, 'exposure'],
        ].map(([label, value, tone]) => (
          <div className={`risk-card ${tone}`} key={label}>
            <span>{label}</span>
            <h2>{value}</h2>
          </div>
        ))}
      </section>

      <section className="risk-insight-grid">
        <div className="risk-visual-card">
          <div className="risk-section-title">
            <FiActivity />
            <h2>Risk distribution</h2>
          </div>
          {[
            ['High', summary?.highRisk || 0, 'high'],
            ['Medium', summary?.mediumRisk || 0, 'medium'],
            ['Low', summary?.lowRisk || 0, 'low'],
          ].map(([label, value, tone]) => (
            <div className="risk-bar-row" key={label}>
              <span>{label}</span>
              <div>
                <i
                  className={`risk-bar risk-bar--${tone}`}
                  style={{ width: `${Math.max(4, (Number(value) / total) * 100)}%` }}
                />
              </div>
              <b>{value}</b>
            </div>
          ))}
        </div>

        <div className="risk-visual-card">
          <div className="risk-section-title">
            <FiBarChart2 />
            <h2>High-risk constituencies</h2>
          </div>
          {topConstituencies.map(([name, count]) => (
            <button
              type="button"
              className="constituency-chip"
              key={name}
              onClick={() => setQuery(name)}
            >
              <span>{name}</span>
              <b>{count}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="risk-workbench">
        <div className="risk-controls">
          <div>
            <span className="intel-kicker">Project triage</span>
            <h2>Assessment queue</h2>
          </div>

          <label className="risk-search">
            <FiSearch />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search project, constituency or category"
            />
          </label>
        </div>

        <div className="risk-filter-row">
          <div className="risk-filters">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
              <button
                key={level}
                type="button"
                className={filter === level ? 'active' : ''}
                onClick={() => setFilter(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <select value={category} onChange={event => setCategory(event.target.value)}>
            {categories.map(item => (
              <option key={item} value={item}>
                {item === 'ALL' ? 'All categories' : item}
              </option>
            ))}
          </select>

          <select value={sortKey} onChange={event => setSortKey(event.target.value as SortKey)}>
            <option value="riskScore">Sort by risk</option>
            <option value="utilization">Sort by utilization</option>
            <option value="allocated">Sort by allocation</option>
            <option value="expenditure">Sort by expenditure</option>
          </select>
        </div>

        <div className="risk-table-container">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Constituency</th>
                <th>Category</th>
                <th>Financials</th>
                <th>Utilization</th>
                <th>Risk</th>
                <th>Why risky</th>
              </tr>
            </thead>

            <tbody>
              {visibleWorks.map(work => {
                const reasons = normalizeReasons(work.reasons)
                return (
                  <tr key={work.workId} className={`risk-row risk-row--${work.riskLevel.toLowerCase()}`}>
                    <td className="project-name">{work.name}</td>
                    <td>{work.constituency}</td>
                    <td>{work.category || 'Uncategorised'}</td>
                    <td>
                      <strong>{formatCurrency(work.allocated)}</strong>
                      <span>{formatCurrency(work.expenditure)} spent</span>
                    </td>
                    <td>
                      <div className="utilization-meter">
                        <i style={{ width: `${Math.min(100, Math.max(0, work.utilization || 0))}%` }} />
                      </div>
                      <b>{work.utilization || 0}%</b>
                    </td>
                    <td>
                      <span className={`risk-badge ${work.riskLevel.toLowerCase()}`}>
                        {work.riskLevel} - {work.riskScore}
                      </span>
                    </td>
                    <td>
                      {reasons.length ? (
                        <details className="risk-reasons">
                          <summary>{reasons.length} signal{reasons.length === 1 ? '' : 's'}</summary>
                          <ul>
                            {reasons.map(reason => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </details>
                      ) : (
                        <span className="no-risk">No major risk detected</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredWorks.length === 0 && (
            <div className="no-results">No projects match the current risk filters.</div>
          )}
        </div>

        {filteredWorks.length > visibleWorks.length && (
          <p className="risk-result-note">
            Showing first {visibleWorks.length} of {filteredWorks.length} records for performance.
          </p>
        )}
      </section>
    </div>
  )
}

export default RiskAnalysis
