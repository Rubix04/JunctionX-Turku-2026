import type { ReactNode } from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Stroke icons drawn on a 24 x 24 grid, copied from the mockups.
const paths = {
  home: <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  map: (
    <>
      <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  book: (
    <>
      <Path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
      <Path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20" />
    </>
  ),
  bell: (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  users: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  emergency: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v8M8 12h8" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  chevronRight: <Path d="M9 5l7 7-7 7" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7" />,
  alertCircle: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Path d="M12 8v5M12 16h.01" />
    </>
  ),
  alertTriangle: (
    <>
      <Path d="M12 3 2 20h20z" />
      <Path d="M12 10v4M12 17h.01" />
    </>
  ),
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 8h.01" />
    </>
  ),
  pill: (
    <>
      <Rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" />
      <Path d="M9.5 9.5l5 5" />
    </>
  ),
  leaf: (
    <>
      <Path d="M5 19C5 10 11 5 20 4c0 9-5 15-14 15z" />
      <Path d="M5 19l8-8" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  video: (
    <>
      <Rect x="3" y="6" width="13" height="12" rx="2" />
      <Path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  image: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="2" />
      <Circle cx="9" cy="10" r="2" />
      <Path d="M21 16l-5-5-9 9" />
    </>
  ),
  file: (
    <>
      <Path d="M14 3H6v18h12V7z" />
      <Path d="M14 3v4h4M9 13h6M9 17h6" />
    </>
  ),
  edit: (
    <>
      <Path d="M4 20h4L19 9l-4-4L4 16z" />
      <Path d="M13.5 6.5l4 4" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3.5" y="5" width="17" height="15" rx="2" />
      <Path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  share: (
    <>
      <Circle cx="18" cy="5" r="2.5" />
      <Circle cx="6" cy="12" r="2.5" />
      <Circle cx="18" cy="19" r="2.5" />
      <Path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
    </>
  ),
  phone: (
    <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
  ),
  directions: <Path d="M3 11l18-8-8 18-2-8z" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-4-4" />
    </>
  ),
  mic: (
    <>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="10.5" width="14" height="10" rx="2" />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  shieldCheck: (
    <>
      <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <Path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  bank: <Path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  mobile: (
    <>
      <Rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <Path d="M11 18h2" />
    </>
  ),
  face: (
    <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a3.5 3.5 0 0 0 5 0" />
  ),
  fingerprint: (
    <Path d="M7 11a5 5 0 0 1 10 0v2M12 11v6M9 21c1-2 1-4 1-6M15 20.5c.5-1.5.8-3.4.9-5.5M4.5 15a14 14 0 0 0 .5-4 7 7 0 0 1 12-5" />
  ),
  pin: <Path d="M5 10.5h14v10H5zM8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />,
  list: <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  trafficLight: (
    <>
      <Rect x="7" y="2.5" width="10" height="19" rx="5" />
      <Circle cx="12" cy="7.5" r="1.5" />
      <Circle cx="12" cy="12" r="1.5" />
      <Circle cx="12" cy="16.5" r="1.5" />
    </>
  ),
  droplet: <Path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  scale: (
    <>
      <Rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <Path d="M8 10a5.5 5.5 0 0 1 8 0M12 10l1.5-2" />
    </>
  ),
  clipboard: (
    <>
      <Rect x="5" y="4" width="14" height="17" rx="2" />
      <Path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  chart: <Path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  passport: (
    <>
      <Rect x="4" y="3" width="16" height="18" rx="2" />
      <Circle cx="12" cy="10" r="3" />
      <Path d="M8 17h8" />
    </>
  ),
  bowl: <Path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5" />,
  store: <Path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6" />,
  trash: <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  logout: <Path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  sliders: (
    <>
      <Path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <Circle cx="15" cy="6" r="2" />
      <Circle cx="9" cy="12" r="2" />
      <Circle cx="17" cy="18" r="2" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  snowflake: <Path d="M12 2v20M4 7l16 10M20 7 4 17M9 3.5l3 2 3-2M9 20.5l3-2 3 2" />,
  sprout: <Path d="M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7z" />,
  star: <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  heart: <Path d="M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11z" />,
  heartPulse: (
    <>
      <Path d="M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11z" />
      <Path d="M4 12h4l2-3 3 6 2-3h5" />
    </>
  ),
  play: <Path d="M7 4l13 8-13 8z" />,
  pause: <Path d="M7 4h3v16H7zM14 4h3v16h-3z" />,
  volume: <Path d="M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />,
  apple: (
    <Path d="M12 7c-3-2-7 0-7 5 0 4 3 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-7-7-5zM12 7c0-2 1-3.5 3-4" />
  ),
  link: (
    <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  ),
  receipt: <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4" />,
  bolt: <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  send: <Path d="M21 3 3 10l7 3 3 7z" />,
  thermometer: <Path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 10v7" />,
  wind: <Path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" />,
  flask: <Path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9" />,
  car: <Path d="M5 16v-5l2-5h10l2 5v5M3 11h18v5H3zM6 16v3M18 16v3M7 13.5h.01M17 13.5h.01" />,
  snake: <Path d="M4 18c3 0 3-4 6-4s3 4 6 4 4-2 4-4-2-3-4-3H9a3 3 0 0 1 0-6h8l2 1.5-2 1.5" />,
  paw: (
    <>
      <Path d="M12 13c-3 0-5.5 2.5-5.5 4.5 0 1.6 1.3 2.5 2.8 2.5 1.1 0 1.8-.6 2.7-.6s1.6.6 2.7.6c1.5 0 2.8-.9 2.8-2.5 0-2-2.5-4.5-5.5-4.5z" />
      <Circle cx="6" cy="10.5" r="1.8" />
      <Circle cx="9.5" cy="6.5" r="1.8" />
      <Circle cx="14.5" cy="6.5" r="1.8" />
      <Circle cx="18" cy="10.5" r="1.8" />
    </>
  ),
  qr: (
    <>
      <Rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <Rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <Rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <Path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
};

// Decorative by default: put the accessible label on the button or text next to it.
const Icon = ({ name, size = 24, color = colors.text, strokeWidth = 2 }: IconProps) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    accessible={false}
  >
    {paths[name]}
  </Svg>
);

export default Icon;
