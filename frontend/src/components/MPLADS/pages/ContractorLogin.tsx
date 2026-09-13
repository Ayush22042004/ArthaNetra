import { FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FiArrowLeft, FiBriefcase, FiLock, FiLogIn, FiUser } from 'react-icons/fi'
import {
  ContractorDemoAccount,
  contractorsAPI,
} from '../../../services/api/contractors'
import './ContractorLogin.css'

const SESSION_KEY = 'arthanetra_contractor_session'

const ContractorLogin = () => {
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState<ContractorDemoAccount[]>([])
  const [email, setEmail] = useState('field@abcinfra.in')
  const [password, setPassword] = useState('field123')
  const [loading, setLoading] = useState(false)
  const [accountsLoading, setAccountsLoading] = useState(true)

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await contractorsAPI.getDemoAccounts()
        setAccounts(response.data || [])
      } catch {
        setAccounts([])
      } finally {
        setAccountsLoading(false)
      }
    }

    loadAccounts()
  }, [])

  const login = async (event?: FormEvent) => {
    event?.preventDefault()

    try {
      setLoading(true)
      const response = await contractorsAPI.login({ email, password })
      localStorage.setItem(SESSION_KEY, JSON.stringify(response.data))
      toast.success('Contractor login successful')
      navigate('/mplads/contractor-portal', { replace: true })
    } catch {
      toast.error('Invalid contractor credentials')
    } finally {
      setLoading(false)
    }
  }

  const useAccount = (account: ContractorDemoAccount) => {
    setEmail(account.email)
    setPassword(account.passwordHint)
  }

  return (
    <main className="contractor-login-page">
      <section className="contractor-login-shell">
        <div className="contractor-login-story">
          <Link to="/mplads/contractors">
            <FiArrowLeft /> Authority leaderboard
          </Link>
          <span>Field execution access</span>
          <h1>Contractor login</h1>
          <p>
            Contractors should enter from a separate field portal, see only assigned works,
            submit GPS evidence, and receive verification feedback before the authority
            dashboard updates.
          </p>
          <div className="login-flow-strip">
            <div>
              <strong>Login</strong>
              <span>Contractor enters the field portal with a verified field account.</span>
            </div>
            <div>
              <strong>Assigned works</strong>
              <span>Only projects assigned to that contractor are visible.</span>
            </div>
            <div>
              <strong>Evidence upload</strong>
              <span>Daily progress, site photo, GPS, timestamp, and remarks are submitted.</span>
            </div>
            <div>
              <strong>Verification score</strong>
              <span>The system checks location, freshness, progress, and suspicious evidence.</span>
            </div>
          </div>

        </div>

        <form className="contractor-login-card" onSubmit={login}>
          <div className="login-card-title">
            <FiBriefcase />
            <div>
              <span>Contractor account</span>
              <strong>Sign in to field portal</strong>
            </div>
          </div>

          <label>
            <span><FiUser /> Email</span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span><FiLock /> Password</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            <FiLogIn /> {loading ? 'Signing in...' : 'Enter field portal'}
          </button>

          <div className="demo-account-list" aria-busy={accountsLoading}>
            <span>Field access accounts</span>
            {accounts.map(account => (
              <button type="button" key={account.email} onClick={() => useAccount(account)}>
                <strong>{account.companyName}</strong>
                <small>{account.email} - {account.district}</small>
              </button>
            ))}
          </div>
        </form>
      </section>
    </main>
  )
}

export { SESSION_KEY as CONTRACTOR_SESSION_KEY }
export default ContractorLogin
