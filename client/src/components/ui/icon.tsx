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
