/**
 * Stylised "smart farm" illustration, drawn inline as SVG so it stays crisp,
 * theme-consistent and dependency-free. Contains the elements the brief calls
 * for: crop fields, a farmer, sun + clouds, an irrigation sprinkler, a soil
 * sensor with signal waves and crop-growth rows.
 */
export function FarmScene({ className }) {
  return (
    <svg
      viewBox="0 0 520 400"
      role="img"
      aria-label="Illustration of a smart farm with crop fields, a farmer, weather and soil sensors"
      className={className}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eafaf0" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="field2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9713f" />
          <stop offset="1" stopColor="#74472c" />
        </linearGradient>
      </defs>

      {/* sky */}
      <rect width="520" height="400" rx="24" fill="url(#sky)" />

      {/* sun */}
      <circle cx="430" cy="78" r="30" fill="#fcd34d" />
      <circle cx="430" cy="78" r="44" fill="#fcd34d" opacity="0.25" />

      {/* clouds */}
      <g fill="#ffffff">
        <ellipse cx="120" cy="70" rx="34" ry="18" />
        <ellipse cx="150" cy="76" rx="26" ry="15" />
        <ellipse cx="92" cy="78" rx="22" ry="13" />
        <ellipse cx="320" cy="46" rx="26" ry="14" />
        <ellipse cx="342" cy="50" rx="20" ry="11" />
      </g>

      {/* rolling fields */}
      <path d="M0 250 Q140 205 300 245 T520 235 V400 H0 Z" fill="url(#field2)" />
      <path d="M0 292 Q160 250 340 288 T520 280 V400 H0 Z" fill="url(#field)" />

      {/* crop rows on the near field */}
      <g stroke="#0f7a37" strokeWidth="3" strokeLinecap="round" opacity="0.55">
        <path d="M40 330 Q260 300 490 322" />
        <path d="M30 352 Q260 322 500 344" />
        <path d="M24 374 Q260 344 508 366" />
      </g>

      {/* sprouts */}
      <g stroke="#14532d" strokeWidth="3" strokeLinecap="round" fill="#22c55e">
        {[70, 130, 190, 250, 310, 370, 430].map((x, i) => (
          <g key={x} transform={`translate(${x} ${318 + (i % 3) * 6})`}>
            <path d="M0 14 V0" />
            <path d="M0 5 C -7 0 -9 -8 -2 -11 C 0 -6 2 -2 0 5 Z" fill="#4ade80" stroke="none" />
            <path d="M0 3 C 7 -2 9 -10 2 -13 C 0 -8 -2 -4 0 3 Z" fill="#22c55e" stroke="none" />
          </g>
        ))}
      </g>

      {/* soil sensor pole with signal waves */}
      <g>
        <rect x="86" y="196" width="6" height="70" rx="3" fill="#5f3b28" />
        <rect x="74" y="188" width="30" height="18" rx="4" fill="#166534" />
        <circle cx="89" cy="197" r="3.4" fill="#bbf7d0" />
        <g stroke="#16a34a" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M108 190 a16 16 0 0 1 0 22" opacity="0.9" />
          <path d="M116 184 a26 26 0 0 1 0 34" opacity="0.55" />
          <path d="M124 178 a36 36 0 0 1 0 46" opacity="0.3" />
        </g>
      </g>

      {/* irrigation sprinkler + water arcs */}
      <g>
        <rect x="356" y="214" width="6" height="52" rx="3" fill="#4b5563" />
        <circle cx="359" cy="212" r="6" fill="#0ea5e9" />
        <g stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8">
          <path d="M362 210 q26 -6 44 16" />
          <path d="M362 214 q30 4 40 30" />
          <path d="M356 210 q-26 -6 -44 16" />
        </g>
        <g fill="#7dd3fc">
          <circle cx="408" cy="228" r="2.6" />
          <circle cx="402" cy="246" r="2.6" />
          <circle cx="312" cy="228" r="2.6" />
        </g>
      </g>

      {/* farmer */}
      <g transform="translate(214 214)">
        <ellipse cx="6" cy="70" rx="20" ry="5" fill="#0f5132" opacity="0.25" />
        <path d="M-8 24 h28 l-3 -12 a11 11 0 0 0 -22 0 Z" fill="#f59e0b" />
        <circle cx="6" cy="4" r="9" fill="#e8b98a" />
        <path d="M-4 -3 h20 l-4 -6 a8 8 0 0 0 -12 0 Z" fill="#8f5a33" />
        <rect x="-4" y="22" width="8" height="26" rx="4" fill="#166534" />
        <rect x="8" y="22" width="8" height="26" rx="4" fill="#166534" />
        <rect x="-9" y="22" width="30" height="16" rx="5" fill="#22c55e" />
        <path d="M20 26 l16 -18" stroke="#5f3b28" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* growth indicator ticks bottom-left */}
      <g transform="translate(28 300)">
        <rect x="0" y="20" width="8" height="10" rx="2" fill="#bbf7d0" />
        <rect x="12" y="12" width="8" height="18" rx="2" fill="#4ade80" />
        <rect x="24" y="4" width="8" height="26" rx="2" fill="#16a34a" />
      </g>
    </svg>
  )
}
