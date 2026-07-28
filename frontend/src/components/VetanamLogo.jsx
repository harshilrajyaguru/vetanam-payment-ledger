export function VetanamLogo({ size = 32, textSize = '1.25rem', showTagline = false }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
      {/* Premium Geometric Shield V-Mark Logo */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="vetanam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <filter id="shadow-v" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4F46E5" floodOpacity="0.25" />
          </filter>
        </defs>
        {/* Rounded Diamond/Shield Background */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          fill="url(#vetanam-gradient)"
        />
        {/* Geometric Precision V Paths */}
        <path
          d="M11 13L20 28L29 13H24L20 21.5L16 13H11Z"
          fill="#FFFFFF"
          filter="url(#shadow-v)"
        />
        <path
          d="M17.5 13L20 17.5L22.5 13H17.5Z"
          fill="rgba(255, 255, 255, 0.4)"
        />
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
            fontWeight: 800,
            fontSize: textSize,
            letterSpacing: '-0.035em',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          Vetanam
        </span>
        {showTagline && (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: 'var(--brand-indigo)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginTop: '0.15rem',
            }}
          >
            Secure. Fast. Accountable.
          </span>
        )}
      </div>
    </div>
  );
}

export default VetanamLogo;
