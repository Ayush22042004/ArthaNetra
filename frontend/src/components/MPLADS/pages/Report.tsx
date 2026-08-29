import { FormEvent, useMemo, useState } from 'react'
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiDatabase,
  FiFlag,
  FiHash,
  FiMail,
  FiMapPin,
  FiMessageSquare,
  FiSend,
  FiShield,
  FiSliders,
} from 'react-icons/fi'
import toast from 'react-hot-toast'
import { sanitizeInput, sanitizeEmail } from '../../../utils/inputSanitization'
import { API_BASE_URL } from '../../../utils/constants/api'
import './Report.css'

type ReportMode = 'feedback' | 'data-issue'

type FeedbackForm = {
  type: 'general' | 'bug' | 'feature_request' | 'data_issue'
  title: string
  description: string
  category: 'general' | 'mp' | 'work' | 'expenditure'
  contactEmail: string
  priority: 'low' | 'medium' | 'high'
}

type DataIssueForm = {
  issueType: 'incorrect_data' | 'missing_data' | 'outdated_data'
  description: string
  location: string
  mpName: string
  workId: string
  expectedValue: string
  actualValue: string
  contactEmail: string
}

const initialFeedbackForm: FeedbackForm = {
  type: 'general',
  title: '',
  description: '',
  category: 'general',
  contactEmail: '',
  priority: 'medium',
}

const initialDataIssueForm: DataIssueForm = {
  issueType: 'incorrect_data',
  description: '',
  location: '',
  mpName: '',
  workId: '',
  expectedValue: '',
  actualValue: '',
  contactEmail: '',
}

const intakeCards = [
  {
    icon: <FiDatabase />,
    title: 'Data corrections',
    text: 'Wrong amount, stale status, missing MP, or mismatched constituency.',
  },
  {
    icon: <FiShield />,
    title: 'Risk signals',
    text: 'Flag suspicious progress, utilization gaps, weather impact, or payment anomalies.',
  },
  {
    icon: <FiMessageSquare />,
    title: 'Product feedback',
    text: 'Suggest better filters, charts, exports, AI explanations, or workflows.',
  },
]

const reviewSteps = [
  'Submission is logged with page and browser context.',
  'Team verifies the issue against source data and project records.',
  'Corrected data or product changes are queued for release.',
]

const sharedFormspreeEndpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT?.trim() || ''
const feedbackFormspreeEndpoint =
  import.meta.env.VITE_FORMSPREE_FEEDBACK_ENDPOINT?.trim() || sharedFormspreeEndpoint
const dataIssueFormspreeEndpoint =
  import.meta.env.VITE_FORMSPREE_DATA_ISSUE_ENDPOINT?.trim() || sharedFormspreeEndpoint
const supportEmail = 'ayushssingh208@gmail.com'

const submitToFormspree = async (endpoint: string, payload: Record<string, string>) => {
  const body = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    body.append(key, value)
  })

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errorMessage = result?.errors?.[0]?.message || result?.message || 'Formspree submission failed'
    throw new Error(errorMessage)
  }
}

const Report = () => {
  const [activeTab, setActiveTab] = useState<ReportMode>('feedback')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>(initialFeedbackForm)
  const [dataIssueForm, setDataIssueForm] = useState<DataIssueForm>(initialDataIssueForm)

  const activeMeta = useMemo(
    () =>
      activeTab === 'feedback'
        ? {
            eyebrow: 'Product feedback',
            title: 'Improve ArthaNetra workflows',
            copy:
              'Share what felt confusing, missing, slow, or useful while using the MPLADS intelligence platform.',
          }
        : {
            eyebrow: 'Data issue',
            title: 'Report a problem in MPLADS records',
            copy:
              'Use this when a project, MP, constituency, fund amount, or completion status looks incorrect.',
          },
    [activeTab]
  )

  const submitFeedback = async (formData: FeedbackForm) => {
    if (feedbackFormspreeEndpoint) {
      await submitToFormspree(feedbackFormspreeEndpoint, {
        _subject: `ArthaNetra feedback: ${formData.title}`,
        _replyto: formData.contactEmail || supportEmail,
        name: 'ArthaNetra Reports',
        email: formData.contactEmail || supportEmail,
        message: formData.description,
        report_kind: 'Product feedback',
        feedback_type: formData.type,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      })

      toast.success('Feedback sent through Formspree.')
      setFeedbackForm(initialFeedbackForm)
      return
    }

    const response = await fetch(`${API_BASE_URL}/feedback/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        userAgent: navigator.userAgent,
        url: window.location.href,
      }),
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit feedback')
    }

    toast.success('Feedback logged. Thank you for improving ArthaNetra.')
    setFeedbackForm(initialFeedbackForm)
  }

  const submitDataIssue = async (formData: DataIssueForm) => {
    if (dataIssueFormspreeEndpoint) {
      await submitToFormspree(dataIssueFormspreeEndpoint, {
        _subject: `ArthaNetra data issue: ${formData.issueType.replace(/_/g, ' ')}`,
        _replyto: formData.contactEmail || supportEmail,
        name: 'ArthaNetra Data Issue',
        email: formData.contactEmail || supportEmail,
        message: formData.description,
        report_kind: 'Data issue',
        issue_type: formData.issueType,
        description: formData.description,
        location: formData.location,
        mp_name: formData.mpName,
        work_id: formData.workId,
        expected_value: formData.expectedValue,
        actual_value: formData.actualValue,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      })

      toast.success('Data issue sent through Formspree.')
      setDataIssueForm(initialDataIssueForm)
      return
    }

    const response = await fetch(`${API_BASE_URL}/feedback/report-data-issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to report issue')
    }

    toast.success('Data issue reported. It is now in the verification queue.')
    setDataIssueForm(initialDataIssueForm)
  }

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (feedbackForm.title.trim().length < 5 || feedbackForm.description.trim().length < 10) {
      toast.error('Add a clear title and at least 10 characters of detail.')
      return
    }

    try {
      setIsSubmitting(true)
      await submitFeedback(feedbackForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDataIssueSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (dataIssueForm.description.trim().length < 10) {
      toast.error('Describe the data issue in at least 10 characters.')
      return
    }

    try {
      setIsSubmitting(true)
      await submitDataIssue(dataIssueForm)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to report data issue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="report-page">
      <section className="report-hero">
        <div>
          <span className="report-eyebrow">Reports / Civic Intake</span>
          <h1>Report data issues and product feedback</h1>
          <p>
            Send corrections, field observations, and workflow feedback directly into the
            ArthaNetra review pipeline.
          </p>
        </div>
        <div className="report-hero-panel" aria-label="Report routing summary">
          <FiFlag />
          <strong>
            {feedbackFormspreeEndpoint || dataIssueFormspreeEndpoint
              ? 'Sending through Formspree'
              : 'Saving to ArthaNetra database'}
          </strong>
          <span>
            {feedbackFormspreeEndpoint && dataIssueFormspreeEndpoint
              ? 'Feedback and data issues route to configured Formspree inboxes with page context.'
              : 'Add Formspree endpoints in frontend/.env to route both report types to your inbox.'}
          </span>
        </div>
      </section>

      <section className="report-intake-grid" aria-label="Report intake categories">
        {intakeCards.map(card => (
          <article className="report-intake-card" key={card.title}>
            <span>{card.icon}</span>
            <h2>{card.title}</h2>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <section className="report-workspace">
        <aside className="report-switcher" aria-label="Choose report type">
          <button
            type="button"
            className={activeTab === 'feedback' ? 'is-active' : ''}
            onClick={() => setActiveTab('feedback')}
          >
            <FiMessageSquare />
            <span>
              <strong>Feedback</strong>
              <small>Ideas, bugs, UX issues</small>
            </span>
          </button>
          <button
            type="button"
            className={activeTab === 'data-issue' ? 'is-active' : ''}
            onClick={() => setActiveTab('data-issue')}
          >
            <FiAlertTriangle />
            <span>
              <strong>Data issue</strong>
              <small>Wrong, stale, missing data</small>
            </span>
          </button>
        </aside>

        <div className="report-form-shell">
          <div className="report-form-heading">
            <span className="report-eyebrow">{activeMeta.eyebrow}</span>
            <h2>{activeMeta.title}</h2>
            <p>{activeMeta.copy}</p>
          </div>

          {activeTab === 'feedback' ? (
            <form className="report-form" onSubmit={handleFeedbackSubmit}>
              <div className="report-form-row">
                <label>
                  <span>Feedback type</span>
                  <select
                    value={feedbackForm.type}
                    onChange={event =>
                      setFeedbackForm({
                        ...feedbackForm,
                        type: event.target.value as FeedbackForm['type'],
                      })
                    }
                  >
                    <option value="general">General feedback</option>
                    <option value="bug">Bug report</option>
                    <option value="feature_request">Feature request</option>
                    <option value="data_issue">Data issue</option>
                  </select>
                </label>
                <label>
                  <span>Area</span>
                  <select
                    value={feedbackForm.category}
                    onChange={event =>
                      setFeedbackForm({
                        ...feedbackForm,
                        category: event.target.value as FeedbackForm['category'],
                      })
                    }
                  >
                    <option value="general">General platform</option>
                    <option value="mp">MP information</option>
                    <option value="work">Works and projects</option>
                    <option value="expenditure">Expenditure data</option>
                  </select>
                </label>
              </div>

              <label>
                <span>Title</span>
                <input
                  value={feedbackForm.title}
                  onChange={event =>
                    setFeedbackForm({
                      ...feedbackForm,
                      title: sanitizeInput(event.target.value, { maxLength: 100 }),
                    })
                  }
                  placeholder="Short, specific summary"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                <span>
                  Details <small>{feedbackForm.description.length}/1000</small>
                </span>
                <textarea
                  value={feedbackForm.description}
                  onChange={event =>
                    setFeedbackForm({
                      ...feedbackForm,
                      description: sanitizeInput(event.target.value, { maxLength: 1000 }),
                    })
                  }
                  placeholder="Tell us what happened, which page you were on, and what should improve."
                  maxLength={1000}
                  rows={6}
                  required
                />
              </label>

              <div className="report-form-row">
                <label>
                  <span>Priority</span>
                  <select
                    value={feedbackForm.priority}
                    onChange={event =>
                      setFeedbackForm({
                        ...feedbackForm,
                        priority: event.target.value as FeedbackForm['priority'],
                      })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label>
                  <span>Contact email</span>
                  <div className="report-input-with-icon">
                    <FiMail />
                    <input
                      type="email"
                      value={feedbackForm.contactEmail}
                      onChange={event =>
                        setFeedbackForm({
                          ...feedbackForm,
                          contactEmail: sanitizeEmail(event.target.value),
                        })
                      }
                      placeholder="xyz@gmail.com "
                    />
                  </div>
                </label>
              </div>

              <button className="report-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit feedback'}
                <FiSend />
              </button>
            </form>
          ) : (
            <form className="report-form" onSubmit={handleDataIssueSubmit}>
              <label>
                <span>Issue type</span>
                <select
                  value={dataIssueForm.issueType}
                  onChange={event =>
                    setDataIssueForm({
                      ...dataIssueForm,
                      issueType: event.target.value as DataIssueForm['issueType'],
                    })
                  }
                >
                  <option value="incorrect_data">Incorrect data</option>
                  <option value="missing_data">Missing data</option>
                  <option value="outdated_data">Outdated data</option>
                </select>
              </label>

              <label>
                <span>
                  What is wrong? <small>{dataIssueForm.description.length}/1000</small>
                </span>
                <textarea
                  value={dataIssueForm.description}
                  onChange={event =>
                    setDataIssueForm({
                      ...dataIssueForm,
                      description: sanitizeInput(event.target.value, { maxLength: 1000 }),
                    })
                  }
                  placeholder="Example: the completion status shown for this work does not match the payment timeline."
                  maxLength={1000}
                  rows={6}
                  required
                />
              </label>

              <div className="report-form-row">
                <label>
                  <span>State / constituency</span>
                  <div className="report-input-with-icon">
                    <FiMapPin />
                    <input
                      value={dataIssueForm.location}
                      onChange={event =>
                        setDataIssueForm({
                          ...dataIssueForm,
                          location: sanitizeInput(event.target.value),
                        })
                      }
                      placeholder="e.g. Hooghly, West Bengal"
                    />
                  </div>
                </label>
                <label>
                  <span>MP name</span>
                  <input
                    value={dataIssueForm.mpName}
                    onChange={event =>
                      setDataIssueForm({
                        ...dataIssueForm,
                        mpName: sanitizeInput(event.target.value),
                      })
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label>
                <span>Work / project ID</span>
                <div className="report-input-with-icon">
                  <FiHash />
                  <input
                    value={dataIssueForm.workId}
                    onChange={event =>
                      setDataIssueForm({
                        ...dataIssueForm,
                        workId: sanitizeInput(event.target.value),
                      })
                    }
                    placeholder="Optional project reference"
                  />
                </div>
              </label>

              <div className="report-form-row">
                <label>
                  <span>Correct value</span>
                  <input
                    value={dataIssueForm.expectedValue}
                    onChange={event =>
                      setDataIssueForm({
                        ...dataIssueForm,
                        expectedValue: sanitizeInput(event.target.value),
                      })
                    }
                    placeholder="What should be shown"
                  />
                </label>
                <label>
                  <span>Current value</span>
                  <input
                    value={dataIssueForm.actualValue}
                    onChange={event =>
                      setDataIssueForm({
                        ...dataIssueForm,
                        actualValue: sanitizeInput(event.target.value),
                      })
                    }
                    placeholder="What the platform shows now"
                  />
                </label>
              </div>

              <label>
                <span>Contact email</span>
                <div className="report-input-with-icon">
                  <FiMail />
                  <input
                    type="email"
                    value={dataIssueForm.contactEmail}
                    onChange={event =>
                      setDataIssueForm({
                        ...dataIssueForm,
                        contactEmail: sanitizeEmail(event.target.value),
                      })
                    }
                    placeholder=" xyz@gmail.com"
                  />
                </div>
              </label>

              <button
                className="report-submit report-submit--danger"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Reporting...' : 'Report data issue'}
                <FiAlertTriangle />
              </button>
            </form>
          )}
        </div>

        <aside className="report-process-card">
          <span className="report-eyebrow">Review pipeline</span>
          <h2>What happens next</h2>
          <ol>
            {reviewSteps.map(step => (
              <li key={step}>
                <FiCheck />
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="report-support-box">
            <FiSliders />
            <div>
              <strong>Best reports include evidence</strong>
              <p>Attach exact MP, state, work ID, amount, or screenshot details when available.</p>
            </div>
          </div>
          <a href={`mailto:${supportEmail}`} className="report-mail-link">
            Email support <FiArrowRight />
          </a>
        </aside>
      </section>
    </main>
  )
}

export default Report
