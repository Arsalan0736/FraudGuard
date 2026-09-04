// Inline SVG icon set. No external icon library dependency.
// Each icon accepts {className, size}. Stroke width follows global 1.75 convention.

const make = (paths, viewBox = '0 0 24 24') =>
  // eslint-disable-next-line react-refresh/only-export-components
  function Icon({ className = '', size = 16 }) {
    return (
      <svg
        width={size} height={size} viewBox={viewBox}
        fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round"
        className={className} aria-hidden="true"
      >
        {paths}
      </svg>
    )
  }

export const IconShield     = make(<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />)
export const IconAlert      = make(<><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.86l-7.95 13.77A2 2 0 0 0 4.13 21h15.74a2 2 0 0 0 1.78-3.37L13.7 3.86a2 2 0 0 0-3.4 0z" /></>)
export const IconList       = make(<><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><circle cx="3.5" cy="6"  r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></>)
export const IconTrend      = make(<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>)
export const IconCash       = make(<><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4" /></>)
export const IconBell       = make(<><path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" /><path d="M10 21a2 2 0 0 0 4 0" /></>)
export const IconLogout     = make(<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></>)
export const IconSearch     = make(<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>)
export const IconCheck      = make(<path d="M5 12.5l4.5 4.5L20 7" />)
export const IconClose      = make(<><path d="M6 6l12 12" /><path d="M18 6l-12 12" /></>)
export const IconArrowLeft  = make(<><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></>)
export const IconArrowRight = make(<><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></>)
export const IconLock       = make(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 1 1 8 0v3" /></>)
export const IconUser       = make(<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></>)
export const IconSparkle    = make(<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M5.6 18.4l2.8-2.8" /><path d="M15.6 8.4l2.8-2.8" /></>)
export const IconMap        = make(<><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></>)
export const IconClock      = make(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)
export const IconLayers     = make(<><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>)
