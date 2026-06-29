import { useLocalSearchParams } from 'expo-router';

import { Button, ScrollView, Text, View } from '@/components/ui';
import { useNavigationReset } from '@/hooks/use-navigation-reset';

type NavigationResetExampleParams = {
  readonly id: string;
  readonly mode?: string;
  readonly source?: string;
  readonly count?: string;
};

export function NavigationResetExampleScreen() {
  const { id, mode, source, count } = useLocalSearchParams<NavigationResetExampleParams>();
  const resetNavigation = useNavigationReset();

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => resetNavigation({ tab: 'index', stack: ['index'] })}>
          홈으로 reset
        </Button>

        <View className="gap-2">
          <Text variant="display">Reset Params</Text>
          <Text color="muted">useNavigationReset으로 받은 params를 화면에 그대로 출력합니다.</Text>
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text variant="heading-sm">Received params</Text>
          <Text>id: {id}</Text>
          <Text>mode: {mode ?? '-'}</Text>
          <Text>source: {source ?? '-'}</Text>
          <Text>count: {count ?? '-'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
