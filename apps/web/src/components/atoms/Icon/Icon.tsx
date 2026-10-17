import type { ReactNode } from 'react';
import styles from './Icon.module.css';

interface Shape {
  viewBox: string;
  strokeWidth: number;
  paths: ReactNode;
}

const SHAPES = {
  plus: { viewBox: '0 0 16 16', strokeWidth: 1.6, paths: <path d="M8 3v10M3 8h10" /> },
  folder: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: (
      <path d="M2 4.5a1 1 0 0 1 1-1h3l1.5 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
    ),
  },
  grid: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: (
      <>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </>
    ),
  },
  download: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />,
  },
  search: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: (
      <>
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" />
      </>
    ),
  },
  pencil: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: <path d="M10.5 2.5 13.5 5.5 5.5 13.5H2.5V10.5z" />,
  },
  trash: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: <path d="M2.5 4.5h11M6 4.5v-2h4v2M4 4.5l.6 9h6.8l.6-9" />,
  },
  check: { viewBox: '0 0 12 12', strokeWidth: 1.8, paths: <path d="m2.5 6.5 2.3 2.3 4.7-5.3" /> },
  alert: { viewBox: '0 0 12 12', strokeWidth: 1.8, paths: <path d="M6 2.5v4M6 9.3v.2" /> },
  close: { viewBox: '0 0 12 12', strokeWidth: 1.6, paths: <path d="m3 3 6 6M9 3 3 9" /> },
  question: {
    viewBox: '0 0 12 12',
    strokeWidth: 1.6,
    paths: <path d="M4.3 4.4a1.8 1.8 0 1 1 2.5 1.7c-.5.2-.8.6-.8 1.1v.4M6 9.3v.2" />,
  },
  sparkle: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: <path d="M8 2.5 9.3 6.7 13.5 8 9.3 9.3 8 13.5 6.7 9.3 2.5 8 6.7 6.7z" />,
  },
  undo: {
    viewBox: '0 0 16 16',
    strokeWidth: 1.5,
    paths: <path d="M5.5 3.5 2.5 6.5l3 3M2.5 6.5h7a3.5 3.5 0 0 1 0 7H7" />,
  },
  progress: {
    viewBox: '0 0 12 12',
    strokeWidth: 1.8,
    paths: <path d="M6 1.5a4.5 4.5 0 1 0 4.5 4.5" />,
  },
} satisfies Record<string, Shape>;

export type IconName = keyof typeof SHAPES;

interface IconProps {
  name: IconName;
  /** Lado del icono, en píxeles. */
  size?: number;
}

/** Icono de trazo. Siempre es decorativo: el texto que lo acompaña es el que informa. */
export function Icon({ name, size = 16 }: IconProps) {
  const shape: Shape = SHAPES[name];

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox={shape.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={shape.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={styles.icon}
    >
      {shape.paths}
    </svg>
  );
}
