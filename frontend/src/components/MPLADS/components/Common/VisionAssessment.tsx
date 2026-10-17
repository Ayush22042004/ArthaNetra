type VisionResult = {
  provider?: string
  model?: string
  projectMatch?: boolean | null
  progressPlausible?: boolean | null
  confidence?: number
  score?: number | null
  detectedWorkType?: string
  detectedStage?: string
  visibleFeatures?: string[]
  issues?: string[]
  summary?: string
  errorCode?: string | null
  analyzedAt?: string
}

export default function VisionAssessment({ assessment }: { assessment: VisionResult }) {
  const match =
    assessment.projectMatch === true
      ? 'Matches project'
      : assessment.projectMatch === false
        ? 'Does not match project'
        : 'Unable to assess'
  return (
    <section className="vision-assessment" aria-label="Vision model assessment">
      <header>
        <h2>Image Analysis</h2>
      </header>
      <dl>
        <div>
          <dt>Image relevance</dt>
          <dd>{match}</dd>
        </div>
        <div>
          <dt>Evidence relevance score</dt>
          <dd>{assessment.score == null ? 'Unassessed' : `${assessment.score}/100`}</dd>
        </div>
        <div>
          <dt title="Confidence in the classification, not a project quality or verification score">
            Assessment confidence
          </dt>
          <dd>{assessment.confidence == null ? 'Unavailable' : `${assessment.confidence}%`}</dd>
        </div>
        <div>
          <dt>Visible work</dt>
          <dd>{assessment.detectedWorkType || 'Not determined'}</dd>
        </div>
        <div>
          <dt>Visible stage</dt>
          <dd>{assessment.detectedStage || 'Not determined'}</dd>
        </div>
        <div>
          <dt>Declared progress</dt>
          <dd>
            {assessment.progressPlausible === true
              ? 'Broadly plausible'
              : assessment.progressPlausible === false
                ? 'Requires review'
                : 'Cannot establish from this image'}
          </dd>
        </div>
      </dl>
      <p>{assessment.summary}</p>
      {assessment.errorCode && (
        <p role="status">Service status: {assessment.errorCode.replace(/_/g, ' ')}</p>
      )}
      {Boolean(assessment.visibleFeatures?.length) && (
        <>
          <h3>Visible Evidence</h3>
          <ul>
            {assessment.visibleFeatures!.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
      {Boolean(assessment.issues?.length) && (
        <>
          <h3>Review Signals</h3>
          <ul>
            {assessment.issues!.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
