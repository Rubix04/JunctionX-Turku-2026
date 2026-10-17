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
  emergency: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v8M8 12h8" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  back: <Path d="M15 5l-7 7 7 7" />,
  chevronRight: <Path d="M9 5l7 7-7 7" />,
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
  list: <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />,
  trafficLight: (
    <>
      <Rect x="7" y="2.5" width="10" height="19" rx="5" />
      <Circle cx="12" cy="7.5" r="1.5" />
      <Circle cx="12" cy="12" r="1.5" />
      <Circle cx="12" cy="16.5" r="1.5" />
    </>
  ),
  bank: <Path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  globe: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  face: (
    <Path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a3.5 3.5 0 0 0 5 0" />
  ),
  fingerprint: (
    <Path d="M7 11a5 5 0 0 1 10 0v2M12 11v6M9 21c1-2 1-4 1-6M15 20.5c.5-1.5.8-3.4.9-5.5M4.5 15a14 14 0 0 0 .5-4 7 7 0 0 1 12-5" />
  ),
  lock: (
    <>
      <Rect x="5" y="10.5" width="14" height="10" rx="2" />
      <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2" />
    </>
  ),
  backspace: (
    <>
      <Path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z" />
      <Path d="M12 9.5l5 5M17 9.5l-5 5" />
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
