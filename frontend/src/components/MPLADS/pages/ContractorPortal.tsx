import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiNavigation,
  FiRefreshCw,
  FiShield,
  FiUploadCloud,
} from 'react-icons/fi'
import { ContractorProject, WorkUpdate, contractorsAPI } from '../../../services/api/contractors'
import { CONTRACTOR_SESSION_KEY } from './ContractorLogin'
import './ContractorPortal.css'
import VisionAssessment from '../components/Common/VisionAssessment'
import { verificationOutcome } from '../../../utils/verificationOutcome'
import FieldTestingAccess from '../components/Common/FieldTestingAccess'

const verificationSteps = ['Processing uploaded evidence']

const statusClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('mismatch') || normalized.includes('suspicious')) return 'is-danger'
  if (
    normalized.includes('verified') ||
    normalized.includes('match') ||
    normalized.includes('unique')
  ) {
    return 'is-good'
  }
  if (normalized.includes('mismatch') || normalized.includes('suspicious')) return 'is-danger'
  return 'is-review'
}

const formatDate = (value?: string | null) => {
  if (!value) return 'No update yet'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const isRenderableImage = (value?: string) =>
  Boolean(value && (value.startsWith('http') || value.startsWith('data:image')))

const compressImageFile = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read image evidence.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Unable to load image evidence.'))
      image.onload = () => {
        const maxSide = 960
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Unable to process image evidence.'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      image.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })

const ContractorPortal = () => {
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('field-road-ward-5')
  const [timeline, setTimeline] = useState<WorkUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [verificationStep, setVerificationStep] = useState(-1)
  const [error, setError] = useState('')
  const [result, setResult] = useState<any>(null)
  const [gpsMessage, setGpsMessage] = useState('GPS not captured yet')
  const [mediaMessage, setMediaMessage] = useState('')
  const [gpsCapturedAt, setGpsCapturedAt] = useState('')
  const [clientCaptureTime, setClientCaptureTime] = useState('')
  const [testToken, setTestToken] = useState('')
  const [testExpiresAt, setTestExpiresAt] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const [testAccessError, setTestAccessError] = useState('')
  const [testingBusy, setTestingBusy] = useState(false)
  const [visionStatus, setVisionStatus] = useState<any>(null)
  const activeContext = useRef({ testToken, selectedProjectId })
  activeContext.current = { testToken, selectedProjectId }

  useEffect(() => {
    if (!testToken) return
    const timer = window.setTimeout(
      () => setTestToken(''),
      Math.max(0, Date.parse(testExpiresAt) - Date.now())
    )
    return () => window.clearTimeout(timer)
  }, [testToken, testExpiresAt])
  const [form, setForm] = useState({
    photoUrl: '',
    mediaType: 'image' as 'image' | 'video' | 'url',
    mediaName: '',
    latitude: '',
    longitude: '',
    gpsAccuracy: '',
    progressPercent: '52',
    remarks: '',
  })

  const projects: ContractorProject[] = dashboard?.projects || []
  const contractorId = session?.contractor?.contractorId
  useEffect(() => {
    let current = true
    if (contractorId)
      contractorsAPI
        .getVisionStatus()
        .then((response: any) => {
          if (current) setVisionStatus(response.data)
        })
        .catch(() => {
          if (current) setVisionStatus(null)
        })
    return () => {
      current = false
    }
  }, [contractorId, result?.update?.updateId])
  const selectedProject = useMemo(
    () => projects.find(project => project.projectId === selectedProjectId) || projects[0],
    [projects, selectedProjectId]
  )

  const loadDashboard = async () => {
    if (!contractorId) return

    try {
      setError('')
      setLoading(true)
      const response = await contractorsAPI.getDashboard(contractorId)
      setDashboard(response.data)
      const firstProject = response.data?.projects?.[0]
      if (!selectedProjectId && firstProject) setSelectedProjectId(firstProject.projectId)
    } catch (apiError: any) {
      if (apiError.response?.status === 401) {
        localStorage.removeItem(CONTRACTOR_SESSION_KEY)
        navigate('/mplads/contractor-login', { replace: true })
      }
      setError('Contractor intelligence service is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const rawSession = localStorage.getItem(CONTRACTOR_SESSION_KEY)
    if (!rawSession) {
      navigate('/mplads/contractor-login', { replace: true })
      return
    }

    try {
      const parsed = JSON.parse(rawSession)
      if (!parsed?.contractor?.contractorId) {
        navigate('/mplads/contractor-login', { replace: true })
        return
      }
      setSession(parsed)
      setSelectedProjectId('')
    } catch {
      localStorage.removeItem(CONTRACTOR_SESSION_KEY)
      navigate('/mplads/contractor-login', { replace: true })
    }
  }, [])

  useEffect(() => {
    if (contractorId) loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorId])

  useEffect(() => {
    let current = true
    setTimeline([])
    setResult(null)
    setGpsCapturedAt('')
    setClientCaptureTime('')
    setForm(value => ({
      ...value,
      photoUrl: '',
      mediaName: '',
      latitude: '',
      longitude: '',
      gpsAccuracy: '',
    }))
    setGpsMessage('GPS not captured yet')
    if (selectedProjectId)
      (testToken
        ? contractorsAPI.getTestingTimeline(selectedProjectId, testToken)
        : contractorsAPI.getTimeline(selectedProjectId)
      )
        .then((response: any) => {
          if (current) setTimeline(response.data?.updates || [])
        })
        .catch(() => {
          if (current) setTimeline([])
        })
    return () => {
      current = false
    }
  }, [selectedProjectId, testToken])

  useEffect(() => {
    if (!selectedProject) return
    setForm(current => ({
      ...current,
      progressPercent: String(Math.min(100, selectedProject.progressPercent || 0)),
    }))
  }, [selectedProject])

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage(
        'GPS is unavailable in this browser. Use a GPS-enabled device over HTTPS or localhost.'
      )
      return
    }

    setGpsMessage('Requesting browser GPS...')
    navigator.geolocation.getCurrentPosition(
      position => {
        setGpsCapturedAt(new Date(position.timestamp).toISOString())
        setForm(current => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          gpsAccuracy: String(Math.round(position.coords.accuracy)),
        }))
        setGpsMessage(`GPS captured with ${Math.round(position.coords.accuracy)}m accuracy`)
      },
      () => {
        setGpsCapturedAt('')
        setForm(current => ({ ...current, latitude: '', longitude: '', gpsAccuracy: '' }))
        setGpsMessage('GPS could not be captured. Allow location access and retry.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const unlockTesting = async () => {
    if (!testPassword || testingBusy || submitting) return
    setTestingBusy(true)
    setTestAccessError('')
    setError('')
    try {
      const response = await contractorsAPI.unlockTesting(testPassword)
      setTestExpiresAt(response.data.expiresAt)
      setTestToken(response.data.token)
    } catch (apiError: any) {
      setTestAccessError(apiError.response?.data?.error || 'Testing mode could not be unlocked.')
    } finally {
      setTestPassword('')
      setTestingBusy(false)
    }
  }

  const loadTestSample = async (kind: string) => {
    if (!selectedProject || !testToken) return
    setTestingBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await contractorsAPI.getTestingSample(
        selectedProject.projectId,
        testToken,
        kind
      )
      if (
        activeContext.current.testToken !== testToken ||
        activeContext.current.selectedProjectId !== selectedProject.projectId
      )
        return
      const sample = response.data
      if (kind === 'gps')
        setForm(current => ({
          ...current,
          latitude: String(sample.latitude),
          longitude: String(sample.longitude),
          gpsAccuracy: String(sample.gpsAccuracy),
        }))
      else
        setForm({
          photoUrl: sample.photoUrl,
          mediaType: 'image',
          mediaName: sample.mediaName,
          latitude: String(sample.latitude),
          longitude: String(sample.longitude),
          gpsAccuracy: String(sample.gpsAccuracy),
          progressPercent: String(sample.progressPercent),
          remarks: sample.remarks,
        })
      setGpsCapturedAt(sample.gpsCapturedAt)
      if (kind !== 'gps') setClientCaptureTime(sample.clientCaptureTime)
      setGpsMessage('TEST ONLY: simulated site GPS, not device location')
      if (kind !== 'gps') setMediaMessage(sample.sampleSource)
    } catch (apiError: any) {
      setError(apiError.response?.data?.error || 'Sample could not be loaded.')
      if (apiError.response?.status === 403) setTestToken('')
    } finally {
      setTestingBusy(false)
    }
  }

  const handleEvidenceFile = async (file?: File) => {
    if (!file) return
    setForm(current => ({ ...current, photoUrl: '', mediaName: '' }))
    setClientCaptureTime('')
    setResult(null)

    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5000000) {
      try {
        setMediaMessage('Compressing image evidence for verification...')
        const compressed = await compressImageFile(file)
        setClientCaptureTime(new Date(file.lastModified).toISOString())
        setForm(current => ({
          ...current,
          photoUrl: compressed,
          mediaType: 'image',
          mediaName: file.name,
        }))
        setMediaMessage(`Image evidence ready: ${file.name}`)
      } catch {
        setMediaMessage('Could not process this image. Try another photograph.')
      }
      return
    }

    setForm(current => ({ ...current, photoUrl: '', mediaName: '' }))
    setMediaMessage(
      'Use a JPEG, PNG or WebP photograph smaller than 5 MB. Video verification is not supported.'
    )
  }

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedProject) return
    if (!form.latitude || !form.longitude) {
      setError('GPS is mandatory. Capture GPS before submitting evidence.')
      setGpsMessage('GPS is mandatory. Capture browser GPS.')
      return
    }
    if (!form.photoUrl) {
      setError('Upload a site photograph before submitting.')
      return
    }

    try {
      setError('')
      setSubmitting(true)
      setVerificationStep(0)
      setResult(null)
      const payload = {
        contractorId,
        photoUrl: form.photoUrl,
        mediaType: form.mediaType,
        mediaName: form.mediaName,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        gpsAccuracy: Number(form.gpsAccuracy),
        progressPercent: Number(form.progressPercent),
        remarks: form.remarks,
        clientCaptureTime,
        gpsCapturedAt,
      }
      const response = testToken
        ? await contractorsAPI.submitTestingUpdate(selectedProject.projectId, payload, testToken)
        : await contractorsAPI.submitUpdate(selectedProject.projectId, payload)
      if (
        activeContext.current.testToken !== testToken ||
        activeContext.current.selectedProjectId !== selectedProject.projectId
      )
        return
      setResult(response.data)
      setTimeline(response.data?.timeline || [])
      if (!testToken) await loadDashboard()
    } catch (apiError: any) {
      if (testToken && apiError.response?.status === 403) setTestToken('')
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          'Evidence update failed. Try again.'
      )
    } finally {
      setVerificationStep(-1)
      setSubmitting(false)
    }
  }

  const logout = () => {
    localStorage.removeItem(CONTRACTOR_SESSION_KEY)
    navigate('/mplads/contractor-login', { replace: true })
  }

  if (loading) {
    return (
      <main className="contractor-portal">
        <div className="contractor-shell is-loading" />
      </main>
    )
  }

  if (error && !dashboard) {
    return (
      <main className="contractor-portal">
        <section className="contractor-shell">
          <div className="contractor-empty">
            <FiAlertTriangle />
            <h1>Contractor portal unavailable</h1>
            <p>{error}</p>
            <button type="button" onClick={loadDashboard}>
              <FiRefreshCw /> Retry
            </button>
          </div>
        </section>
      </main>
    )
  }

  const metrics = dashboard?.metrics || {}
  const contractor = dashboard?.contractor || {}
  const verification = result?.verification

  return (
    <main className="contractor-portal">
      <section className="contractor-hero">
        <div>
          <span className="contractor-kicker">Contractor field portal</span>
          <h1>Good morning, {contractor.companyName || 'ABC Infra'}</h1>
          <p>
            Submit geo-tagged evidence, get an AI verification score, and keep project timelines
            current for field review.
          </p>
        </div>
        <div className="contractor-session-card">
          <div className="contractor-credit">
            <span>Quality credit</span>
            <strong>{metrics.qualityCredit || 0}</strong>
            <small>/ 100</small>
          </div>
          <Link to="/mplads/contractors">Authority view</Link>
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </section>

      <section className="contractor-metrics" aria-label="Contractor metrics">
        <article>
          <FiShield />
          <span>Assigned projects</span>
          <strong>{metrics.assignedProjects || 0}</strong>
        </article>
        <article>
          <FiClock />
          <span>Updates due today</span>
          <strong>{metrics.updatesDueToday || 0}</strong>
        </article>
        <article>
          <FiCheckCircle />
          <span>Verified updates</span>
          <strong>{metrics.verifiedUpdates || 0}</strong>
        </article>
        <article>
          <FiUploadCloud />
          <span>Submitted today</span>
          <strong>{metrics.updatesToday || 0}</strong>
        </article>
      </section>

      <section className="contractor-grid">
        <div className="contractor-panel">
          <div className="section-heading">
            <span>Assigned works</span>
            <button type="button" onClick={loadDashboard} aria-label="Refresh contractor dashboard">
              <FiRefreshCw />
            </button>
          </div>
          <div className="assigned-list">
            {projects.map(project => (
              <button
                type="button"
                key={project.projectId}
                className={`assigned-card${project.projectId === selectedProject?.projectId ? ' is-active' : ''}`}
                onClick={() => setSelectedProjectId(project.projectId)}
              >
                <span className={`risk-pill ${project.riskLevel.toLowerCase()}`}>
                  {project.riskLevel}
                </span>
                <strong>{project.title}</strong>
                <small>
                  {project.district}, {project.state}
                </small>
                {project.source === 'official_mplads_work' && (
                  <small className="official-source-badge">
                    Official MPLADS {project.sourceCollection?.replace('works_', '')} work
                    {project.sourceWorkId ? ` #${project.sourceWorkId}` : ''}
                  </small>
                )}
                {project.coordinateSource === 'state_centroid_fallback_not_official_site_gps' && (
                  <small className="coordinate-source-note">
                    Exact site GPS not published by MPLADS; map uses state-level fallback.
                  </small>
                )}
                <div className="progress-track">
                  <span style={{ width: `${Math.min(project.progressPercent, 100)}%` }} />
                </div>
                <em>
                  {project.progressPercent}% complete - expected {project.expectedProgress}%
                </em>
              </button>
            ))}
          </div>
        </div>

        <form className="contractor-panel evidence-form" onSubmit={submitUpdate}>
          <div className="section-heading">
            <span>Daily work update</span>
            <small>{selectedProject?.title}</small>
          </div>

          <label>
            Project
            <select
              value={selectedProjectId}
              onChange={event => setSelectedProjectId(event.target.value)}
            >
              {projects.map(project => (
                <option value={project.projectId} key={project.projectId}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          {visionStatus && (
            <p className="vision-provider-state" role="status">
              <FiCamera /> Image analysis: {visionStatus.state.replace(/_/g, ' ')}
            </p>
          )}
          <FieldTestingAccess
            unlocked={Boolean(testToken)}
            expiresAt={testExpiresAt}
            password={testPassword}
            error={testAccessError}
            busy={testingBusy}
            submitting={submitting}
            onPasswordChange={value => {
              setTestPassword(value)
              setTestAccessError('')
            }}
            onUnlock={unlockTesting}
            onLock={() => {
              setTestToken('')
              setTestAccessError('')
            }}
            onSample={loadTestSample}
          />

          <label>
            Evidence media
            <input
              type="file"
              key={`${selectedProjectId}:${Boolean(testToken)}`}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={event => handleEvidenceFile(event.target.files?.[0])}
            />
          </label>

          <p className="gps-message">{mediaMessage}</p>

          {form.photoUrl && form.mediaType !== 'video' && (
            <div className="evidence-preview">
              <img src={form.photoUrl} alt="Selected site evidence preview" />
              <span>{form.mediaName}</span>
            </div>
          )}

          <div className="gps-row">
            <button type="button" onClick={captureGps}>
              <FiNavigation /> Capture GPS
            </button>
          </div>
          <p className="gps-message">{gpsMessage}</p>

          <div className="coordinate-grid">
            <label>
              Latitude
              <input value={form.latitude} readOnly required />
            </label>
            <label>
              Longitude
              <input value={form.longitude} readOnly required />
            </label>
            <label>
              Accuracy metres
              <input value={form.gpsAccuracy} readOnly required />
            </label>
          </div>

          <label>
            Progress percentage
            <input
              type="number"
              min="0"
              max="100"
              value={form.progressPercent}
              onChange={event =>
                setForm(current => ({ ...current, progressPercent: event.target.value }))
              }
            />
          </label>

          <label>
            Remarks
            <textarea
              rows={4}
              value={form.remarks}
              onChange={event => setForm(current => ({ ...current, remarks: event.target.value }))}
            />
          </label>

          {error && <p className="form-alert">{error}</p>}

          <button
            type="submit"
            className="submit-evidence"
            disabled={submitting || !form.latitude || !form.longitude}
          >
            {submitting
              ? 'Verifying evidence...'
              : testToken
                ? 'Run isolated test verification'
                : 'Submit for AI verification'}
          </button>
        </form>
      </section>

      {submitting && (
        <section className="verification-steps">
          {verificationSteps.map((step, index) => (
            <div key={step} className={index <= verificationStep ? 'is-active' : ''}>
              <FiCheckCircle />
              <span>{step}</span>
            </div>
          ))}
        </section>
      )}

      {verification?.imageVerification && (
        <VisionAssessment assessment={verification.imageVerification} />
      )}
      {verification && (
        <section className="verification-panel">
          <div className="verification-outcome">
            <span>
              {result?.testing ? 'TEST ONLY - Verification outcome' : 'Verification outcome'}
            </span>
            <strong>{verificationOutcome(verification.score, verification.status)}</strong>
            <small>
              {verification.status.replace(/_/g, ' ')}
              {verification.score == null
                ? ' - Overall score unavailable until remaining checks are assessed.'
                : ` - Composite score ${verification.score}/100`}
            </small>
          </div>
          {[
            [result?.testing ? 'Test location' : 'Location', verification.geoVerification],
            ['Image match', verification.imageVerification],
            ['Duplicate check', verification.duplicateCheck],
            ['Progress', verification.progressVerification],
          ].map(([label, item]: any) => (
            <article key={label} className={statusClass(item?.status)}>
              <span>{label}</span>
              <strong>{item?.score == null ? 'Unassessed' : `${item.score}/100`}</strong>
              <small>{item?.summary || item?.status}</small>
            </article>
          ))}
        </section>
      )}

      <section className="timeline-panel">
        <div className="section-heading">
          <span>{testToken ? 'Isolated test timeline' : 'Project execution timeline'}</span>
          <small>{timeline.length} evidence events</small>
        </div>
        <div className="timeline-list">
          {timeline.length ? (
            timeline.map(update => (
              <article key={update.updateId} className="timeline-item">
                {isRenderableImage(update.photoUrl) ? (
                  <img src={update.photoUrl} alt="Latest site evidence" />
                ) : (
                  <div className="timeline-media-placeholder">
                    <FiCamera />
                    <span>
                      {update.mediaType === 'video' ? 'Video evidence' : 'Evidence attached'}
                    </span>
                  </div>
                )}
                <div>
                  <span>{formatDate(update.serverUploadTime)}</span>
                  <strong>
                    {update.progressPercent}% declared progress -{' '}
                    {update.overallVerificationScore == null
                      ? 'Unassessed'
                      : `${update.overallVerificationScore}/100`}
                  </strong>
                  {update.strictVerificationVersion !== 3 && (
                    <small>Legacy automated result, not revalidated by vision analysis</small>
                  )}
                  <p>{update.remarks || 'No remarks added.'}</p>
                  <div className="timeline-verification-tags">
                    <small className={statusClass(update.verificationStatus)}>
                      {update.verificationStatus}
                    </small>
                    <small className={statusClass(update.imageVerification?.status)}>
                      Image {update.imageVerification?.score || 0}
                    </small>
                    <small className={statusClass(update.geoVerification?.status)}>
                      GPS {update.geoVerification?.score || 0}
                    </small>
                    <small className={statusClass(update.duplicateCheck?.status)}>
                      Duplicate {update.duplicateCheck?.score || 0}
                    </small>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="empty-timeline">
              No field evidence has been submitted for this project yet.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}

export default ContractorPortal
