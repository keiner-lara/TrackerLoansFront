import type { ReactNode, SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

// Iconos lineales (trazo de 2 px) en un solo estilo, decorativos por defecto.
function Svg({ children, ...p }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export const LockIcon = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
)
export const ArrowRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)
export const ChevronRightIcon = (p: P) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)
export const LogOutIcon = (p: P) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Svg>
)
export const BellIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Svg>
)
export const CalendarIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Svg>
)
export const CalendarCheckIcon = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18m-11 6 2 2 4-4" />
  </Svg>
)
export const CheckIcon = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
)
export const CoinsIcon = (p: P) => (
  <Svg {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </Svg>
)
export const TrendingIcon = (p: P) => (
  <Svg {...p}>
    <path d="M4 20v-5M10 20V9M16 20v-8M22 20V4M2 20h20" />
  </Svg>
)
export const PlusIcon = (p: P) => (
  <Svg {...p} strokeWidth="2.2">
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
export const ReceiptIcon = (p: P) => (
  <Svg {...p}>
    <path d="M6 2h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1ZM9 8h6M9 12h6" />
  </Svg>
)
export const UsersIcon = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 4.5a3.5 3.5 0 0 1 0 7M22 21v-1a6 6 0 0 0-4-5.6" />
  </Svg>
)

/** Emblema circular con $ (borde degradado azul → cian → verde). */
export function Emblem({ size = 72 }: { size?: number }) {
  const ring = Math.max(2, Math.round(size * 0.08))
  return (
    <span
      aria-hidden="true"
      className="inline-grid place-items-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        padding: ring,
        background: 'linear-gradient(145deg, #164bff 5%, #2b83ff 58%, #91e65c 100%)',
        boxShadow: '0 0 ' + size * 0.45 + 'px rgba(20, 91, 255, 0.35)',
      }}
    >
      <span
        className="grid place-items-center rounded-full w-full h-full bg-[#071026] text-white font-extrabold"
        style={{ fontSize: size * 0.44 }}
      >
        $
      </span>
    </span>
  )
}

export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className="text-fg">Tracker</span>
      <span className="text-brand-bright">Loans</span>
    </span>
  )
}
