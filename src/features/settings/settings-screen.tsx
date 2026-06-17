import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui';
import { COLOR_SCHEMES, useSelectedTheme } from '@/lib/theme/selected-theme';

const LABELS: Record<string, string> = {
  light: '라이트 ☀️',
  dark: '다크 🌙',
  system: '시스템 ⚙️',
};

// profile 탭의 중첩 스택에서 푸시되는 화면. 테마 선택의 실제 거처.
export function SettingsScreen() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();

  return (
    <ScrollView className="bg-bg-primary" contentContainerClassName="gap-3 p-4">
      <Text variant="heading-sm" color="secondary">테마</Text>
      <View className="overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated">
        {COLOR_SCHEMES.map((scheme, i) => (
          <View key={scheme}>
            {i > 0 ? <View className="h-px bg-border-primary" /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedTheme(scheme)}
              className="flex-row items-center justify-between p-4"
            >
              <Text>{LABELS[scheme]}</Text>
              {selectedTheme === scheme ? <Text color="brand">●</Text> : null}
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
