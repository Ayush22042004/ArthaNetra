import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiDownload, FiRefreshCw, FiSave, FiArrowLeft } from 'react-icons/fi'
import { useAuth } from '../../../hooks/useAuth'
import { investigationsAPI } from '../../../services/api/investigations'
import './Investigations.css'

const date = (value: any) => (value ? new Date(value).toLocaleString('en-IN') : 'Not recorded')
export default function Investigations() {
  const { caseId } = useParams()
  const { isAdmin: checkAdmin } = useAuth()
  const isAdmin = Boolean(checkAdmin())
  const [cases, setCases] = useState<any[]>([])
  const [record, setRecord] = useState<any>(null)
  const [reviewers, setReviewers] = useState<any[]>([])
  const [status, setStatus] = useState('IN_REVIEW')
  const [assignedTo, setAssignedTo] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = async () => {
    setBusy(true)
    setError('')
    try {
      if (caseId) {
        const response = await investigationsAPI.get(caseId)
        setRecord(response.data)
        setStatus(response.data.status)
        setAssignedTo(response.data.assignedTo || '')
        const accounts = await investigationsAPI.reviewers()
        setReviewers(accounts.data)
      } else {
        const response = await investigationsAPI.list()
        setCases(response.data)
      }
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Cases could not be loaded.')
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    if (isAdmin) {
      setRecord(null)
      void load()
    }
  }, [isAdmin, caseId])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await investigationsAPI.update(caseId!, {
        status,
        assignedTo: assignedTo || null,
        note,
        version: record.version,
      })
      setNote('')
      await load()
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Review could not be saved.')
      setBusy(false)
    }
  }
  const download = async () => {
    setBusy(true)
    try {
      const { exportInvestigationPdf } = await import('../../../utils/exportInvestigationPdf')
      await exportInvestigationPdf(record)
    } catch (exportError) {
      console.error('Investigation PDF export failed:', exportError)
      setError('Report export failed. Please retry.')
    } finally {
      setBusy(false)
    }
  }
  if (!isAdmin)
    return (
      <main className="investigations">
        <h1>Authority Investigations</h1>
        <p>Sign in with an authority account to review works and evidence.</p>
        <Link to="/login" state={{ from: { pathname: window.location.pathname } }}>
          Authority sign in
        </Link>
      </main>
    )
  return (
    <main className="investigations">
      <header>
        <div>
          <Link to={caseId ? '/mplads/investigations' : '/mplads/maps'}>
            <FiArrowLeft /> {caseId ? 'All cases' : 'Intelligence map'}
          </Link>
          <h1>{record ? record.title : 'Investigation Queue'}</h1>
        </div>
        <button disabled={busy} onClick={load} title="Refresh cases">
          <FiRefreshCw />
        </button>
      </header>
      {error && (
        <p role="alert" className="case-error">
          {error}
        </p>
      )}
      {busy && <p role="status">Processing...</p>}
      {!caseId && (
        <section className="case-list">
          {!busy && !cases.length && <p>No investigation cases have been opened.</p>}
          {cases.map(item => (
            <Link key={item.caseId} to={`/mplads/investigations/${item.caseId}`}>
              <strong>{item.title}</strong>
              <span>{item.status}</span>
              <small>{date(item.updatedAt)}</small>
            </Link>
          ))}
        </section>
      )}
      {record && (
        <>
          <div className="case-toolbar">
            <strong>{record.status}</strong>
            <span>Revision {record.version}</span>
            <button onClick={download} disabled={busy}>
              <FiDownload /> Export Case PDF
            </button>
          </div>
          <section>
            <h2>Source Record</h2>
            <dl>
              <div>
                <dt>Reference</dt>
                <dd>
                  {record.sourceType} / {record.sourceId}
                </dd>
              </div>
              <div>
                <dt>District / State</dt>
                <dd>
                  {record.work.district || 'Not recorded'} / {record.work.state || 'Not recorded'}
                </dd>
              </div>
              <div>
                <dt>Latest source refresh</dt>
                <dd>{date(record.dataFreshness)}</dd>
              </div>
              <div>
                <dt>Linked payments</dt>
                <dd>
                  {record.completeness.paymentCount}{' '}
                  {record.completeness.paymentLinkAvailable
                    ? ''
                    : '(No work-level payment link available)'}
                </dd>
              </div>
              <div>
                <dt>Evidence submissions</dt>
                <dd>{record.completeness.evidenceCount}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Authority Review</h2>
            <form onSubmit={save}>
              <label>
                Status
                <select
                  aria-label="Status"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  {['OPEN', 'IN_REVIEW', 'VERIFIED', 'ESCALATED', 'RESOLVED'].map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Assigned reviewer
                <select
                  aria-label="Assigned reviewer"
                  value={assignedTo}
                  onChange={e => setAssignedTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {reviewers.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="case-note">
                Review note
                <textarea
                  aria-label="Review note"
                  required
                  minLength={10}
                  maxLength={2000}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </label>
              <button disabled={busy || note.trim().length < 10}>
                <FiSave /> Save Review
              </button>
            </form>
          </section>
          <section>
            <h2>Field Evidence</h2>
            <p>
              {record.completeness.evidenceIncluded} of {record.completeness.evidenceCount} latest
              submissions shown.
            </p>
            <div className="case-evidence">
              {record.evidence.map((item: any) => (
                <article key={item.updateId}>
                  {/^(data:image|https:\/\/)/.test(item.photoUrl || '') && (
                    <img src={item.photoUrl} alt="Submitted site evidence" />
                  )}
                  <strong>
                    {item.verificationStatus} ·{' '}
                    {item.overallVerificationScore == null
                      ? 'Unassessed'
                      : `${item.overallVerificationScore}/100`}
                  </strong>
                  <small>
                    {date(item.serverUploadTime)} ·{' '}
                    {item.strictVerificationVersion === 3
                      ? 'Vision pipeline v3'
                      : 'Legacy automated checks, not revalidated'}
                  </small>
                  <p>{item.imageVerification?.summary || item.remarks}</p>
                  <p>
                    GPS: {item.geoVerification?.status || 'Unassessed'} · Reused photo:{' '}
                    {item.duplicateCheck?.duplicateDetected ? 'Review required' : 'Not flagged'}
                  </p>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2>Payments</h2>
            {record.financials && (
              <dl>
                <div>
                  <dt>Successful linked payments</dt>
                  <dd>INR {record.financials.successfulPayments.toLocaleString('en-IN')}</dd>
                </div>
                <div>
                  <dt>Sanctioned budget</dt>
                  <dd>
                    {record.financials.sanctionedAmount == null
                      ? 'Not published in source record'
                      : `INR ${record.financials.sanctionedAmount.toLocaleString('en-IN')}`}
                  </dd>
                </div>
                <div>
                  <dt>Amount above recorded sanction</dt>
                  <dd>
                    {record.financials.excessOverSanction == null
                      ? 'Cannot assess without a sanction record'
                      : `INR ${record.financials.excessOverSanction.toLocaleString('en-IN')}`}
                  </dd>
                </div>
                <div>
                  <dt>Malformed or missing ledger amounts</dt>
                  <dd>{record.financials.invalidAmountRecords}</dd>
                </div>
              </dl>
            )}
            <p>
              {record.completeness.paymentsIncluded} of {record.completeness.paymentCount} linked
              records shown.
            </p>
            <div className="case-table">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {record.payments.map((item: any) => (
                    <tr key={item._id}>
                      <td>{item.transactionId || item.expenditureId || item._id}</td>
                      <td>
                        {item.amount ??
                          item.expenditureAmount ??
                          item.paymentAmount ??
                          'Not recorded'}
                      </td>
                      <td>{item.status || item.paymentStatus || 'Not recorded'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>Review History</h2>
            {[...record.events].reverse().map((event: any, index: number) => (
              <article className="case-event" key={index}>
                <strong>
                  {event.action} · {event.actor?.name || event.actor?.email}
                </strong>
                <small>{date(event.at)}</small>
                <p>{event.note}</p>
              </article>
            ))}
          </section>
          <p>{record.governanceNote}</p>
        </>
      )}
    </main>
  )
}
