import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiAward,
  FiBarChart2,
  FiCheckCircle,
  FiFilter,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiTarget,
  FiTrendingUp,
} from 'react-icons/fi'
import {
  Contractor,
  ContractorShortlistItem,
  FieldMonitoring,
  contractorsAPI,
} from '../../../services/api/contractors'
import './ContractorLeaderboard.css'

const componentLabels: Record<string, string> = {
  onTimeCompletion: 'On-time',
  costAdherence: 'Cost adherence',
  verifiedUpdates: 'Verified evidence',
  workQuality: 'Work quality',
  compliance: 'Compliance',
  lowAnomalyRate: 'Low review rate',
}

const filterContractors = (
  rows: Contractor[],
  activeFilters: { district: string; specialization: string }
) =>
  rows.filter(contractor => {
    const matchesDistrict =
      !activeFilters.district ||
      String(contractor.district || '').toLowerCase() === activeFilters.district.toLowerCase()
    const matchesSpecialization =
      !activeFilters.specialization ||
      (contractor.specializations || []).some(
        item => String(item || '').toLowerCase() === activeFilters.specialization.toLowerCase()
      )

    return matchesDistrict && matchesSpecialization
  })

const ContractorLeaderboard = () => {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [allContractors, setAllContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersAppliedAt, setFiltersAppliedAt] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({ district: '', specialization: '' })
  const [error, setError] = useState('')
  const [district, setDistrict] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [monitoring, setMonitoring] = useState<FieldMonitoring | null>(null)
  const [mapFeed, setMapFeed] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('field-road-ward-5')
  const [shortlist, setShortlist] = useState<ContractorShortlistItem[]>([])

  const loadLeaderboard = async (nextFilters = { district, specialization }) => {
    try {
      setError('')
      setLoading(true)
      const [response, monitoringResponse, mapResponse] = await Promise.all([
        contractorsAPI.getLeaderboard(),
        contractorsAPI.getFieldMonitoring(),
        contractorsAPI.getMapProjects(),
      ])
      const rows = response.data || []
      setAllContractors(rows)
      setContractors(filterContractors(rows, nextFilters))
      setMonitoring(monitoringResponse.data)
      setMapFeed(mapResponse.data)
      setAppliedFilters(nextFilters)
      setFiltersAppliedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      if (!selectedProjectId && mapResponse.data?.projects?.[0]) {
        setSelectedProjectId(mapResponse.data.projects[0].projectId)
      }
    } catch {
      setError('Contractor leaderboard is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const loadShortlist = async () => {
      if (!selectedProjectId) return
      try {
        const response = await contractorsAPI.getShortlist(selectedProjectId)
        setShortlist(response.data?.shortlist || [])
      } catch {
        setShortlist([])
      }
    }

    loadShortlist()
  }, [selectedProjectId])

  const topContractor = contractors[0]
  const mapProjects = mapFeed?.projects || []
  const selectedProject = mapProjects.find((project: any) => project.projectId === selectedProjectId)
  const filters = useMemo(() => {
    const source = allContractors.length ? allContractors : contractors
    const districts = Array.from(new Set(source.map(contractor => contractor.district))).sort()
    const specializations = Array.from(
      new Set(source.flatMap(contractor => contractor.specializations || []))
    ).sort()
    return { districts, specializations }
  }, [contractors, allContractors])

  const hasActiveDraftFilters = Boolean(district || specialization)
  const hasPendingFilterChanges =
    district !== appliedFilters.district || specialization !== appliedFilters.specialization

  const handleApplyFilters = () => {
    const nextFilters = { district, specialization }
    setContractors(filterContractors(allContractors, nextFilters))
    setAppliedFilters(nextFilters)
    setFiltersAppliedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  const handleClearFilters = () => {
    setDistrict('')
    setSpecialization('')
    const nextFilters = { district: '', specialization: '' }
    setContractors(allContractors)
    setAppliedFilters(nextFilters)
    setFiltersAppliedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <main className="leaderboard-page">
      <section className="leaderboard-hero">
        <div>
          <span>Contractor intelligence</span>
          <h1>Quality credit leaderboard</h1>
          <p>
            Rank contractors using verified field evidence, completion history, cost discipline,
            and review signals. This is decision support, not automatic procurement selection.
          </p>
        </div>
        <div className="leaderboard-hero-card">
          <FiAward />
          <small>Top performer</small>
          <strong>{topContractor?.companyName || 'Loading...'}</strong>
          <span>{topContractor?.qualityCredit || 0}/100</span>
        </div>
      </section>

      <section className="leaderboard-toolbar">
        <div className="leaderboard-filter-controls">
          <FiFilter />
          <label>
            District
            <select value={district} onChange={event => setDistrict(event.target.value)}>
            <option value="">All districts</option>
            {filters.districts.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
            </select>
          </label>
          <label>
            Specialization
            <select value={specialization} onChange={event => setSpecialization(event.target.value)}>
            <option value="">All specializations</option>
            {filters.specializations.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
            </select>
          </label>
        </div>
        <div className="leaderboard-actions">
          <Link to="/mplads/contractor-login">Contractor login</Link>
          {hasActiveDraftFilters && (
            <button type="button" className="leaderboard-clear-btn" onClick={handleClearFilters}>
              Clear
            </button>
          )}
          <button type="button" onClick={handleApplyFilters} disabled={loading}>
            <FiRefreshCw className={loading ? 'is-spinning' : ''} />{' '}
            {loading ? 'Applying' : 'Apply'}
          </button>
        </div>
        <p className="leaderboard-filter-status" aria-live="polite">
          Showing {contractors.length} contractor{contractors.length === 1 ? '' : 's'}
          {appliedFilters.district ? ` in ${appliedFilters.district}` : ''}
          {appliedFilters.specialization ? ` for ${appliedFilters.specialization}` : ''}
          {filtersAppliedAt ? ` - updated ${filtersAppliedAt}` : ''}
          {hasPendingFilterChanges ? ' - filter changes pending' : ''}
        </p>
      </section>

      {error && <p className="leaderboard-error">{error}</p>}

      <section className="field-command-grid">
        <article className="field-monitoring-panel">
          <div className="leaderboard-section-title">
            <span>Live field monitoring</span>
            <strong>Evidence control room</strong>
          </div>
          <div className="field-monitoring-metrics">
            <div>
              <span>Tracked</span>
              <strong>{monitoring?.projectsTracked || 0}</strong>
            </div>
            <div>
              <span>Updated today</span>
              <strong>{monitoring?.projectsUpdatedToday || 0}</strong>
            </div>
            <div>
              <span>Verified today</span>
              <strong>{monitoring?.verifiedEvidenceToday || 0}</strong>
            </div>
            <div>
              <span>Needs review</span>
              <strong>{monitoring?.requiringReview || 0}</strong>
            </div>
          </div>
          <div className="field-map-counts">
            <span><i className="green" /> Green {mapFeed?.counts?.green || 0}</span>
            <span><i className="yellow" /> Yellow {mapFeed?.counts?.yellow || 0}</span>
            <span><i className="red" /> Red {mapFeed?.counts?.red || 0}</span>
          </div>
        </article>

        <article className="shortlist-panel">
          <div className="leaderboard-section-title">
            <span>Performance shortlist</span>
            <strong>Best fit for proposed work</strong>
          </div>
          <label>
            Project
            <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
              {mapProjects.map((project: any) => (
                <option value={project.projectId} key={project.projectId}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>
          {selectedProject && (
            <p className="selected-project-note">
              <FiMapPin /> {selectedProject.district}, {selectedProject.state} - {selectedProject.category} - {selectedProject.riskLevel} risk
            </p>
          )}
          <div className="shortlist-items">
            {shortlist.slice(0, 3).map(item => (
              <div key={item.contractorId}>
                <span>#{item.rank}</span>
                <strong>{item.companyName}</strong>
                <em>{item.matchScore}/100 match - {item.qualityCredit}/100 credit</em>
                <small>{item.reasons[0]}</small>
              </div>
            ))}
          </div>
          <p className="governance-note">
            <FiTarget /> Decision support only. Final selection remains under procurement rules.
          </p>
        </article>
      </section>

      <section className="leaderboard-summary">
        <article>
          <FiShield />
          <span>Contractors tracked</span>
          <strong>{contractors.length}</strong>
        </article>
        <article>
          <FiCheckCircle />
          <span>Average evidence rate</span>
          <strong>
            {Math.round(
              contractors.reduce((sum, contractor) => sum + contractor.verifiedEvidenceRate, 0) /
                Math.max(contractors.length, 1)
            )}
            %
          </strong>
        </article>
        <article>
          <FiTrendingUp />
          <span>Avg on-time rate</span>
          <strong>
            {Math.round(
              contractors.reduce((sum, contractor) => sum + contractor.onTimeCompletionRate, 0) /
                Math.max(contractors.length, 1)
            )}
            %
          </strong>
        </article>
        <article>
          <FiBarChart2 />
          <span>Evidence profiles</span>
          <strong>{contractors.length}</strong>
        </article>
      </section>

      <section className="leaderboard-list" aria-busy={loading}>
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <article className="leaderboard-row is-loading" key={index} />
          ))
        ) : contractors.length === 0 ? (
          <article className="leaderboard-empty">
            <strong>No contractors match these filters.</strong>
            <span>Clear filters or choose a broader district/specialization.</span>
          </article>
        ) : (
          contractors.map(contractor => (
            <article className="leaderboard-row" key={contractor.contractorId}>
              <div className="rank-block">
                <span>#{contractor.rank}</span>
                <strong>{contractor.qualityCredit}</strong>
                <small>credit</small>
              </div>

              <div className="contractor-profile">
                <strong>{contractor.companyName}</strong>
                <span>{contractor.registrationNumber} - {contractor.district}</span>
                <div>
                  {(contractor.specializations || []).map(item => (
                    <em key={item}>{item}</em>
                  ))}
                </div>
              </div>

              <div className="contractor-stats">
                <span>{contractor.projectsCompleted} completed</span>
                <span>{contractor.onTimeCompletionRate}% on-time</span>
                <span>{contractor.averageCostOverrun}% avg overrun</span>
                <span>{contractor.verifiedEvidenceRate}% verified evidence</span>
              </div>

              <div className="score-components">
                {Object.entries(contractor.scoreComponents || {}).map(([key, value]) => (
                  <div key={key}>
                    <span>{componentLabels[key] || key}</span>
                    <strong>{Math.round(value)}</strong>
                    <div>
                      <i style={{ width: `${Math.min(Number(value), 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

export default ContractorLeaderboard
