import { useLocalSearchParams } from 'expo-router';

import { Button, Text, View } from '@/components/ui';
import { useNavigationReset } from '@/hooks/use-navigation-reset';

type Menu4DetailParams = {
  readonly id: string;
  readonly mode?: string;
  readonly source?: string;
  readonly count?: string;
};

export function Menu4DetailScreen() {
  const { id, mode, source, count } = useLocalSearchParams<Menu4DetailParams>();
  const resetNavigation = useNavigationReset();

  return (
    <View className="flex-1 gap-3 bg-background p-4">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => resetNavigation({ tab: 'index', stack: ['index'] })}>
        홈으로 reset
      </Button>
      <Text variant="heading-lg">상세 #{id}</Text>
      <Text color="muted">menu-4/[id] 동적 라우트가 params를 받아 렌더했습니다.</Text>
      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text>id: {id}</Text>
        <Text>mode: {mode ?? '-'}</Text>
        <Text>source: {source ?? '-'}</Text>
        <Text>count: {count ?? '-'}</Text>
      </View>
    </View>
  );
}
