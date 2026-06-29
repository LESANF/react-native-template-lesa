import type { SvgProps } from 'react-native-svg';
import Svg, { Circle, Path } from 'react-native-svg';

export type TabIconProps = Omit<SvgProps, 'color' | 'width' | 'height'> & {
  readonly active?: boolean;
  readonly color?: string;
  readonly size?: number;
};

export function HomeTabIcon({
  active = false,
  color = 'currentColor',
  size = 24,
  ...props
}: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 10.8 12 4l8 6.8V20h-5v-5.2H9V20H4v-9.2Z"
        fill={active ? color : 'none'}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function Menu2TabIcon({
  active = false,
  color = 'currentColor',
  size = 24,
  ...props
}: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 20.5s-7-4.4-7-10A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 7 3.5c0 5.6-7 10-7 10Z"
        fill={active ? color : 'none'}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function Menu3TabIcon({
  active = false,
  color = 'currentColor',
  size = 24,
  ...props
}: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle
        cx={12}
        cy={8}
        r={3.2}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M5.5 20a6.5 6.5 0 0 1 13 0"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function Menu4TabIcon({
  active = false,
  color = 'currentColor',
  size = 24,
  ...props
}: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle
        cx={10.5}
        cy={10.5}
        r={5.5}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="m15 15 4.5 4.5"
        stroke={color}
        strokeLinecap="round"
        strokeWidth={2}
      />
    </Svg>
  );
}

export function Menu5TabIcon({
  active = false,
  color = 'currentColor',
  size = 24,
  ...props
}: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      <Circle
        cx={12}
        cy={12}
        r={8}
        fill={active ? color : 'none'}
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx={8.5} cy={12} r={1} fill={active ? 'white' : color} />
      <Circle cx={12} cy={12} r={1} fill={active ? 'white' : color} />
      <Circle cx={15.5} cy={12} r={1} fill={active ? 'white' : color} />
    </Svg>
  );
}
