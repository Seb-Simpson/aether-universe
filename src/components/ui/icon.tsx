import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "plus"
  | "minus"
  | "reset"
  | "pause"
  | "play"
  | "close"
  | "info"
  | "chevron"
  | "orbit"
  | "external"
  | "expand"
  | "menu"
  | "check";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15M13 5l7 7-7 7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  reset: (
    <>
      <path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" />
    </>
  ),
  pause: (
    <>
      <path d="M8 5v14M16 5v14" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7Z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v.2" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="11" ry="5" transform="rotate(-30 12 12)" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4 10 14M10 4H4v16h16v-6" />
    </>
  ),
  expand: (
    <>
      <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  check: <path d="m5 12 5 5 9-10" />,
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
