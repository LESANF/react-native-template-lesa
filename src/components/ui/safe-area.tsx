import type { Edge, Edges } from 'react-native-safe-area-context';
import type { ViewProps } from 'react-native';

import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ALL_EDGES = ['top', 'right', 'bottom', 'left'] as const;

type EdgeInsetValues = Partial<Record<Edge, number>>;

export type SafeAreaProps = ViewProps & {
  /** 적용할 변. 배열이나 `{ top: 'additive' }` 레코드 둘 다 받는다. 기본은 네 변 전부. */
  readonly edges?: Edges;
  /** 여백을 padding 이 아니라 margin 으로 줄 때. */
  readonly mode?: 'padding' | 'margin';
  /** 변별 최소값 — inset 이 이보다 작으면 이 값을 쓴다(`Math.max`). */
  readonly minInsets?: EdgeInsetValues;
  readonly className?: string;
};

type EdgeModes = Partial<Record<Edge, 'off' | 'additive' | 'maximum'>>;

function toEdgeRecord(edges: Edges): EdgeModes {
  // `Array.isArray` 는 readonly 배열을 좁혀주지 않아 음성 분기가 never 로 가지 않는다.
  return Array.isArray(edges)
    ? Object.fromEntries((edges as readonly Edge[]).map(edge => [edge, 'additive']))
    : (edges as EdgeModes);
}

/**
 * safe area 를 **일반 View 의 스타일로** 적용한다. 네이티브 `SafeAreaView` 는 화면이
 * 애니메이션하는 동안 영역을 다시 재서 탭 전환·빠른 재시작에서 덜컹거린다 — 사유는
 * `docs/ui.md` "safe area".
 *
 * 탭 안의 화면은 `edges={['top']}` 만 쓴다. 하단 inset 은 탭바가 이미 먹는다.
 */
export function SafeArea({
  className,
  edges = ALL_EDGES,
  minInsets,
  mode = 'padding',
  style,
  ...props
}: SafeAreaProps) {
  const insets = useSafeAreaInsets();
  const edgeModes = toEdgeRecord(edges);
  const prefix = mode === 'margin' ? 'margin' : 'padding';

  const insetStyle: Record<string, number> = {};
  for (const edge of ALL_EDGES) {
    const edgeMode = edgeModes[edge] ?? 'off';
    if (edgeMode === 'off') continue;

    const minimum = minInsets?.[edge] ?? 0;
    const value = edgeMode === 'maximum' ? Math.max(insets[edge], minimum) : insets[edge] + minimum;
    if (value > 0) insetStyle[`${prefix}${edge[0].toUpperCase()}${edge.slice(1)}`] = value;
  }

  return <View className={className} style={[insetStyle, style]} {...props} />;
}
