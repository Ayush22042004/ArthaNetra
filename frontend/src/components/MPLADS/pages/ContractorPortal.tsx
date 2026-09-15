import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FiAlertTriangle,
  FiCamera,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
  FiShield,
  FiUploadCloud,
} from 'react-icons/fi'
import {
  ContractorProject,
  WorkUpdate,
  contractorsAPI,
} from '../../../services/api/contractors'
import { CONTRACTOR_SESSION_KEY } from './ContractorLogin'
import './ContractorPortal.css'

const sampleEvidence = [
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=85',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=85',
  'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=1200&q=85',
]

const verificationSteps = [
  'Checking project location',
  'Analyzing site evidence',
  'Checking previous images',
  'Validating progress movement',
  'Generating verification score',
]

const statusClass = (status?: string) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized.includes('verified') || normalized.includes('match') || normalized.includes('unique')) {
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
  const [mediaMessage, setMediaMessage] = useState('Use a site photo or paste an evidence URL.')
  const [form, setForm] = useState({
    photoUrl: sampleEvidence[0],
    mediaType: 'url' as 'image' | 'video' | 'url',
    mediaName: 'sample-site-evidence.jpg',
    latitude: '',
    longitude: '',
    gpsAccuracy: '18',
    progressPercent: '52',
    remarks: 'Road base preparation completed for the next stretch. Site team has started edge compaction.',
  })

  const projects: ContractorProject[] = dashboard?.projects || []
  const contractorId = session?.contractor?.contractorId
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
    } catch (apiError) {
      setError('Contractor intelligence service is unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeline = async (projectId: string) => {
    try {
      const response = await contractorsAPI.getTimeline(projectId)
      setTimeline(response.data?.updates || [])
    } catch {
      setTimeline([])
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
    if (selectedProjectId) loadTimeline(selectedProjectId)
  }, [selectedProjectId])

  useEffect(() => {
    if (!selectedProject) return
    setForm(current => ({
      ...current,
      progressPercent: String(Math.max(selectedProject.progressPercent + 6, selectedProject.expectedProgress)),
    }))
  }, [selectedProject])

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Browser GPS is unavailable. Registered site GPS loaded.')
      useDemoGps()
      return
    }

    setGpsMessage('Requesting browser GPS...')
    navigator.geolocation.getCurrentPosition(
      position => {
        setForm(current => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          gpsAccuracy: String(Math.round(position.coords.accuracy)),
        }))
        setGpsMessage(`GPS captured with ${Math.round(position.coords.accuracy)}m accuracy`)
      },
      () => {
        setGpsMessage('GPS permission blocked. Registered site GPS loaded.')
        useDemoGps()
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const useDemoGps = () => {
    if (!selectedProject) return
    setForm(current => ({
      ...current,
      latitude: String(Number(selectedProject.registeredLatitude) + 0.00035),
      longitude: String(Number(selectedProject.registeredLongitude) + 0.00027),
      gpsAccuracy: '18',
    }))
    setGpsMessage('Registered site GPS loaded for review')
  }

  const handleEvidenceFile = async (file?: File) => {
    if (!file) return

    if (file.type.startsWith('image/')) {
      try {
        setMediaMessage('Compressing image evidence for verification...')
        const compressed = await compressImageFile(file)
        setForm(current => ({
          ...current,
          photoUrl: compressed,
          mediaType: 'image',
          mediaName: file.name,
        }))
        setMediaMessage(`Image evidence ready: ${file.name}`)
      } catch {
        setMediaMessage('Could not process this image. Try another file or use a URL.')
      }
      return
    }

    if (file.type.startsWith('video/')) {
      setForm(current => ({
        ...current,
        photoUrl: `video-evidence://${encodeURIComponent(file.name)}:${file.size}`,
        mediaType: 'video',
        mediaName: file.name,
      }))
      setMediaMessage(`Video reference attached: ${file.name}. Prototype stores metadata for review.`)
      return
    }

    setMediaMessage('Unsupported evidence type. Use image or video.')
  }

  const submitUpdate = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedProject) return
    if (!form.latitude || !form.longitude) {
      setError('GPS is mandatory. Capture GPS before submitting evidence.')
      setGpsMessage('GPS is mandatory. Capture browser GPS or use demo site GPS.')
      return
    }
    if (!form.photoUrl) {
      setError('Evidence media is mandatory. Upload a site image/video or choose a sample.')
      return
    }

    try {
      setError('')
      setSubmitting(true)
      setVerificationStep(0)
      setResult(null)
      for (let index = 0; index < verificationSteps.length; index += 1) {
        setVerificationStep(index)
        await new Promise(resolve => window.setTimeout(resolve, 220))
      }
      const response = await contractorsAPI.submitUpdate(selectedProject.projectId, {
        contractorId,
        photoUrl: form.photoUrl,
        mediaType: form.mediaType,
        mediaName: form.mediaName,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        gpsAccuracy: Number(form.gpsAccuracy),
        progressPercent: Number(form.progressPercent),
        remarks: form.remarks,
        clientCaptureTime: new Date().toISOString(),
      })
      setResult(response.data)
      setTimeline(response.data?.timeline || [])
      await loadDashboard()
    } catch {
      setError('Evidence update failed. Please check backend and MongoDB.')
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
            Submit geo-tagged evidence, get an AI verification score, and keep project
            timelines current for field review.
          </p>
        </div>
        <div className="contractor-session-card">
          <div className="contractor-credit">
            <span>Quality credit</span>
            <strong>{metrics.qualityCredit || 0}</strong>
            <small>/ 100</small>
          </div>
          <Link to="/mplads/contractors">Authority view</Link>
          <button type="button" onClick={logout}>Logout</button>
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
                <span className={`risk-pill ${project.riskLevel.toLowerCase()}`}>{project.riskLevel}</span>
                <strong>{project.title}</strong>
                <small>{project.district}, {project.state}</small>
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
                <em>{project.progressPercent}% complete - expected {project.expectedProgress}%</em>
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
            <select value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)}>
              {projects.map(project => (
                <option value={project.projectId} key={project.projectId}>
                  {project.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Evidence media
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={event => handleEvidenceFile(event.target.files?.[0])}
            />
          </label>

          <label>
            Evidence URL / processed media reference
            <div className="photo-input">
              <FiCamera />
              <input
                value={form.photoUrl}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    photoUrl: event.target.value,
                    mediaType: 'url',
                    mediaName: 'external-evidence-url',
                  }))
                }
                placeholder="Upload media or paste site image URL"
              />
            </div>
          </label>
          <p className="gps-message">{mediaMessage}</p>

          {form.photoUrl && form.mediaType !== 'video' && (
            <div className="evidence-preview">
              <img src={form.photoUrl} alt="Selected site evidence preview" />
              <span>{form.mediaName}</span>
            </div>
          )}

          <div className="sample-evidence">
            {sampleEvidence.map(url => (
              <button
                type="button"
                key={url}
                onClick={() =>
                  setForm(current => ({
                    ...current,
                    photoUrl: url,
                    mediaType: 'url',
                    mediaName: 'sample-site-evidence.jpg',
                  }))
                }
                className={form.photoUrl === url ? 'is-selected' : ''}
              >
                Use sample
              </button>
            ))}
          </div>

          <div className="gps-row">
            <button type="button" onClick={captureGps}>
              <FiNavigation /> Capture GPS
            </button>
            <button type="button" onClick={useDemoGps}>
              <FiMapPin /> Registered site GPS
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
              onChange={event => setForm(current => ({ ...current, progressPercent: event.target.value }))}
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

          <button type="submit" className="submit-evidence" disabled={submitting || !form.latitude || !form.longitude}>
            {submitting ? 'Verifying evidence...' : 'Submit for AI verification'}
          </button>
        </form>
      </section>

      {submitting && (
        <section className="verification-steps">
          {verificationSteps.map((step, index) => (
            <div
              key={step}
              className={index <= verificationStep ? 'is-active' : ''}
            >
              <FiCheckCircle />
              <span>{step}</span>
            </div>
          ))}
        </section>
      )}

      {verification && (
        <section className="verification-panel">
          <div>
            <span>Verification score</span>
            <strong>{verification.score}</strong>
            <small>{verification.status}</small>
          </div>
          {[
            ['Location', verification.geoVerification],
            ['Image match', verification.imageVerification],
            ['Duplicate check', verification.duplicateCheck],
            ['Progress', verification.progressVerification],
          ].map(([label, item]: any) => (
            <article key={label} className={statusClass(item?.status)}>
              <span>{label}</span>
              <strong>{item?.score || 0}/100</strong>
              <small>{item?.summary || item?.status}</small>
            </article>
          ))}
        </section>
      )}

      <section className="timeline-panel">
        <div className="section-heading">
          <span>Project execution timeline</span>
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
                    <span>{update.mediaType === 'video' ? 'Video evidence' : 'Evidence attached'}</span>
                  </div>
                )}
                <div>
                  <span>{formatDate(update.serverUploadTime)}</span>
                  <strong>{update.progressPercent}% progress - {update.overallVerificationScore}/100</strong>
                  <p>{update.remarks || 'No remarks added.'}</p>
                  <div className="timeline-verification-tags">
                    <small className={statusClass(update.verificationStatus)}>{update.verificationStatus}</small>
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
            <p className="empty-timeline">No field evidence has been submitted for this project yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}

export default ContractorPortal
