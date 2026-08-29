import { FormEvent, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FiArrowUp,
  FiBarChart2,
  FiChevronLeft,
  FiChevronRight,
  FiCpu,
  FiMessageSquare,
  FiMinimize2,
  FiSearch,
  FiX,
} from 'react-icons/fi'
import { assistantAPI } from '../../../../services/api/assistant'
import './AIAssistant.css'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  mode?: string
}

const renderInlineMarkdown = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }

    return part
  })

const AssistantContent = ({ content }: { content: string }) => {
  const blocks = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  return (
    <div className="ai-message-content">
      {blocks.map((line, index) => {
        if (/^-{3,}$/.test(line)) return null

        if (line.startsWith('###')) {
          return <h4 key={`${line}-${index}`}>{renderInlineMarkdown(line.replace(/^#+\s*/, ''))}</h4>
        }

        if (line.startsWith('|')) {
          const cleaned = line
            .split('|')
            .map(cell => cell.trim())
            .filter(Boolean)
            .join(' - ')

          if (!cleaned || /^:?-+:?/.test(cleaned)) return null

          return <p key={`${line}-${index}`} className="ai-table-line">{renderInlineMarkdown(cleaned)}</p>
        }

        if (/^[-*]\s+/.test(line)) {
          return <p key={`${line}-${index}`} className="ai-bullet">{renderInlineMarkdown(line.replace(/^[-*]\s+/, ''))}</p>
        }

        if (/^\d+\.\s+/.test(line)) {
          return <p key={`${line}-${index}`} className="ai-numbered">{renderInlineMarkdown(line)}</p>
        }

        return <p key={`${line}-${index}`}>{renderInlineMarkdown(line)}</p>
      })}
    </div>
  )
}

const starterPrompts = [
  'Explain this page',
  'Which projects are highest risk?',
  'Explain this comparison',
  'What should I notice here?',
  'How does milestone fund release work?',
]

const getNodeText = (node: Element) => node.textContent?.replace(/\s+/g, ' ').trim() || ''

const getVisiblePageContext = () => {
  const dialog = document.querySelector('[role="dialog"]')
  const main = document.querySelector('.mplads-main') || document.querySelector('main')
  const root = dialog || main || document.body
  const chunks: string[] = []

  if (dialog) chunks.push('Active modal/dialog is open. Prioritize this visible dialog.')

  root.querySelectorAll('h1, h2, h3, h4, p, label, button, .metric-card, .kpi-card').forEach(node => {
    const text = getNodeText(node)
    if (text) chunks.push(text)
  })

  root.querySelectorAll('table tr').forEach(row => {
    const cells = Array.from(row.querySelectorAll('th, td'))
      .map(cell => getNodeText(cell))
      .filter(Boolean)

    if (cells.length) chunks.push(cells.join(' | '))
  })

  const rawText = chunks.length ? chunks.join('\n') : root.textContent || ''

  return rawText
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/Ask AI|General AI|ArthaNetra Assistant/gi, '')
    .trim()
    .slice(0, 9000)
}

const AIAssistant = () => {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ask me about MPLADS funds, high-risk works, MPs, states, maps, weather risk, or project monitoring. I answer from the live dashboard data.',
      mode: 'data-grounded',
    },
  ])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const promptsRef = useRef<HTMLDivElement | null>(null)

  const currentRouteLabel = useMemo(() => {
    if (location.pathname.includes('risk')) return 'Risk Intelligence'
    if (location.pathname.includes('map')) return 'GIS Map'
    if (location.pathname.includes('mps')) return 'MP Intelligence'
    if (location.pathname.includes('states')) return 'State Analytics'
    if (location.pathname.includes('compare')) return 'Compare'
    return 'Overview'
  }, [location.pathname])

  const askQuestion = async (prompt = question) => {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    setMessages(previous => [
      ...previous,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      },
    ])
    setQuestion('')
    setLoading(true)

    try {
      const response = await assistantAPI.chat({
        question: trimmed,
        route: location.pathname,
        pageContext: getVisiblePageContext(),
      })

      setMessages(previous => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          mode: response.mode,
        },
      ])
    } catch (error) {
      console.error('Assistant failed:', error)
      setMessages(previous => [
        ...previous,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content:
            'I could not reach the MPLADS assistant service. Please check that the backend and MongoDB are running, then try again.',
          mode: 'offline',
        },
      ])
    } finally {
      setLoading(false)
      window.setTimeout(() => inputRef.current?.focus(), 60)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    askQuestion()
  }

  const scrollPrompts = (direction: 'left' | 'right') => {
    promptsRef.current?.scrollBy({
      left: direction === 'left' ? -180 : 180,
      behavior: 'smooth',
    })
  }

  return (
    <div className={`ai-assistant-shell ${open ? 'open' : ''}`}>
      {open && (
        <section className="ai-assistant-panel" aria-label="MPLADS AI assistant">
          <header className="ai-assistant-header">
            <div>
              <span>
                <FiCpu /> General AI
              </span>
              <h2>ArthaNetra Assistant</h2>
              <p>{currentRouteLabel} context active</p>
            </div>
            <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)}>
              <FiMinimize2 />
            </button>
          </header>

          <div className="ai-assistant-prompts-shell" aria-label="Suggested questions">
            <button
              className="ai-prompt-scroll"
              type="button"
              aria-label="Scroll suggested questions left"
              onClick={() => scrollPrompts('left')}
            >
              <FiChevronLeft />
            </button>
            <div className="ai-assistant-prompts" ref={promptsRef}>
              {starterPrompts.map(prompt => (
                <button key={prompt} type="button" onClick={() => askQuestion(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
            <button
              className="ai-prompt-scroll"
              type="button"
              aria-label="Scroll suggested questions right"
              onClick={() => scrollPrompts('right')}
            >
              <FiChevronRight />
            </button>
          </div>

          <div className="ai-assistant-messages">
            {messages.map(message => (
              <article key={message.id} className={`ai-message ${message.role}`}>
                <span>{message.role === 'assistant' ? <FiBarChart2 /> : <FiMessageSquare />}</span>
                <div>
                  <AssistantContent content={message.content} />
                  {message.mode && <em>{message.mode}</em>}
                </div>
              </article>
            ))}
            {loading && (
              <article className="ai-message assistant thinking">
                <span>
                  <FiSearch />
                </span>
                <div>
                  <p>Reading live MPLADS data...</p>
                </div>
              </article>
            )}
          </div>

          <form className="ai-assistant-input" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={question}
              onChange={event => setQuestion(event.target.value)}
              placeholder="Ask about funds, risks, MPs, states..."
              aria-label="Ask MPLADS assistant"
              maxLength={1000}
            />
            <button type="submit" disabled={loading || !question.trim()} aria-label="Send question">
              <FiArrowUp />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="ai-assistant-launcher"
        aria-label={open ? 'Hide MPLADS assistant' : 'Open MPLADS assistant'}
        onClick={() => setOpen(value => !value)}
      >
        {open ? <FiX /> : <FiCpu />}
        <span>{open ? 'Close' : 'Ask AI'}</span>
      </button>
    </div>
  )
}

export default AIAssistant
