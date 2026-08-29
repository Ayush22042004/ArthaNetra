import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiBarChart2,
  FiChevronDown,
  FiGrid,
  FiMap,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiSearch,
  FiUsers,
  FiX,
} from 'react-icons/fi'
import ArthaNetraLogo from '../../../common/ArthaNetraLogo'
import { useFilters } from '../../../../contexts/FilterContext'
import { mpladsAPI } from '../../../../services/api/mplads'
import { formatTermOrdinal, normalizeTerms } from '../../../../utils/lsTerm'
import './Navigation.css'

const navItems = [
  { title: 'Overview', path: '/mplads', icon: <FiGrid /> },
  { title: 'Projects', path: '/mplads/track-area', icon: <FiSearch /> },
  { title: 'Map', path: '/mplads/maps', icon: <FiMap /> },
  { title: 'States', path: '/mplads/states', icon: <FiMapPin /> },
  { title: 'MPs', path: '/mplads/mps', icon: <FiUsers /> },
  { title: 'AI Risk', path: '/mplads/risk-analysis', icon: <FiAlertTriangle /> },
  { title: 'Compare', path: '/mplads/compare', icon: <FiBarChart2 /> },
  { title: 'Reports', path: '/mplads/report', icon: <FiMessageSquare /> },
]

const routeLabels: Record<string, string> = {
  '/mplads': 'Overview',
  '/mplads/dashboard': 'Overview',
  '/mplads/track-area': 'Projects',
  '/mplads/map': 'Map',
  '/mplads/maps': 'Map',
  '/mplads/states': 'States',
  '/mplads/mps': 'MPs',
  '/mplads/risk-analysis': 'AI Risk',
  '/mplads/compare': 'Compare',
  '/mplads/report': 'Reports',
  '/mplads/architecture': 'AI Core',
  '/mplads/ai-core': 'AI Core',
  '/mplads/flow-chart': 'AI Core',
}

const immersiveRoutes = new Set([
  '/mplads/map',
  '/mplads/maps',
  '/mplads/architecture',
  '/mplads/ai-core',
  '/mplads/flow-chart',
])

const NavigationSimple = () => {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [availableTerms, setAvailableTerms] = useState([18, 17])
  const [loadingTerms, setLoadingTerms] = useState(false)
  const { filters, updateFilter } = useFilters()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [])

  useEffect(() => {
    let mounted = true
    const loadTerms = async () => {
      try {
        setLoadingTerms(true)
        const cached = localStorage.getItem('mplads_terms')
        if (cached) {
          const normalized = normalizeTerms(JSON.parse(cached))
          if (mounted && normalized.length) setAvailableTerms(normalized)
        }

        const resp = await mpladsAPI.getTerms()
        const normalized = normalizeTerms(resp?.data)
        if (mounted && normalized.length) {
          setAvailableTerms(normalized)
          localStorage.setItem('mplads_terms', JSON.stringify(normalized))
          if (!filters.lsTerm) updateFilter('lsTerm', Number(normalized[0]))
        }
      } catch {
        // Keep local defaults.
      } finally {
        if (mounted) setLoadingTerms(false)
      }
    }

    loadTerms()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pageLabel = useMemo(() => {
    if (location.pathname.startsWith('/mplads/mps/') && location.pathname !== '/mplads/mps') {
      return 'MP Profile'
    }
    if (
      location.pathname.startsWith('/mplads/states/') &&
      location.pathname !== '/mplads/states'
    ) {
      return 'State Intelligence'
    }

    return routeLabels[location.pathname] || 'Workspace'
  }, [location.pathname])

  const shellClassName = immersiveRoutes.has(location.pathname)
    ? 'intel-top-shell intel-top-shell--static'
    : 'intel-top-shell'

  const navList = (
    <div className="intel-nav-list" role="list">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/mplads'}
          className={({ isActive }) => `intel-nav-link${isActive ? ' is-active' : ''}`}
        >
          {item.icon}
          <span>{item.title}</span>
        </NavLink>
      ))}
    </div>
  )

  return (
    <header className={shellClassName}>
      <div className="intel-commandbar">
        <Link to="/mplads" className="intel-brand" aria-label="ArthaNetra home">
          <ArthaNetraLogo compact />
        </Link>

        <nav className="intel-desktop-nav" aria-label="MPLADS navigation">
          {navList}
        </nav>

        <div className="intel-global-controls" aria-label="Global filters">
          <label>
            <span>House</span>
            <select
              value={filters.house || 'Both Houses'}
              onChange={event => updateFilter('house', event.target.value)}
            >
              <option value="Both Houses">Both Houses</option>
              <option value="Lok Sabha">Lok Sabha</option>
              <option value="Rajya Sabha">Rajya Sabha</option>
            </select>
            <FiChevronDown aria-hidden="true" />
          </label>

          <label>
            <span>Term</span>
            <select
              value={filters.lsTerm || availableTerms[0] || 18}
              disabled={loadingTerms}
              onChange={event => updateFilter('lsTerm', Number(event.target.value))}
            >
              {availableTerms.map(term => (
                <option key={term} value={term}>
                  {formatTermOrdinal(term)}
                </option>
              ))}
            </select>
            <FiChevronDown aria-hidden="true" />
          </label>
        </div>

        <button
          type="button"
          className="intel-menu-button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>
      </div>

      {menuOpen && (
        <nav className="intel-mobile-nav" aria-label="Mobile MPLADS navigation">
          {navList}
        </nav>
      )}

      <div className="intel-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/mplads">MPLADS</Link>
        <span>/</span>
        <strong>{pageLabel}</strong>
      </div>
    </header>
  )
}

export default NavigationSimple
