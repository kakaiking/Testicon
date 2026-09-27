/** Decorative IAB phone booth — landing signature */
export function PhoneBooth({ className = "" }: { className?: string }) {
  return (
    <div className={`phone-booth ${className}`} aria-hidden="true">
      <div className="phone-booth-bezel">
        <div className="phone-booth-notch" />
        <div className="iab-chrome phone-booth-chrome">
          <span className="iab-icon-btn phone-booth-chrome-btn" />
          <div className="iab-url-bar">
            <span className="iab-host">Apphub</span>
            <span className="iab-app-name">app.internal</span>
          </div>
          <span className="phone-booth-report">Report</span>
        </div>
        <div className="phone-booth-screen">
          <div className="phone-booth-glitch" />
          <div className="phone-booth-ui">
            <div className="phone-booth-bar phone-booth-bar-wide" />
            <div className="phone-booth-bar" />
            <div className="phone-booth-tiles">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="phone-booth-bar phone-booth-bar-mid" />
          </div>
          <div className="phone-booth-live">
            <span className="phone-booth-live-dot" />
            LIVE
          </div>
        </div>
      </div>
    </div>
  );
}
