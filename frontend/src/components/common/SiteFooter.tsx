import { Link } from 'react-router-dom'
import { Github, Mail, Heart } from 'lucide-react'
import ArthaNetraLogo from './ArthaNetraLogo'
import './SiteFooter.css'

interface SiteFooterProps {
  extraInfo?: string
  className?: string
  showFaq?: boolean
}

const SiteFooter = ({ extraInfo, className = '', showFaq = true }: SiteFooterProps) => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={`site-footer ${className}`.trim()}>
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <ArthaNetraLogo />
            </Link>
            <p className="footer-tagline">
              Making government data accessible, understandable, and actionable for every citizen.
            </p>
            <div className="footer-social">
              <a
                href="https://github.com/arthanetra"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="mailto:ayushssingh208@gmail.com"
                className="social-link"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-links-group">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-links">
              <li>
                <Link to="/mplads">ArthaNetra MPLADS Platform</Link>
              </li>
              <li>
                <Link to="/mplads/states">Browse States</Link>
              </li>
              <li>
                <Link to="/mplads/mps">Browse MPs</Link>
              </li>
              <li>
                <Link to="/mplads/compare">Compare MPs</Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="footer-links-group">
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li>
                <Link to="/about-us">About Us</Link>
              </li>
              {showFaq && (
                <li>
                  <Link to="/faq">FAQ</Link>
                </li>
              )}
              <li>
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms-of-service">Terms of Service</Link>
              </li>
            </ul>
          </div>
        </div>

        {extraInfo && <p className="footer-extra">{extraInfo}</p>}

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} ArthaNetra. All rights reserved.
          </p>
          <p className="footer-made-with">
            Made with <Heart size={14} className="heart-icon" /> for India
          </p>
        </div>
      </div>
    </footer>
  )
}

export default SiteFooter
