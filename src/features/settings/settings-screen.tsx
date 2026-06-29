import { Pressable, ScrollView, Text, View } from '@/components/ui';
import { COLOR_SCHEMES, useSelectedTheme } from '@/lib/theme/selected-theme';

const LABELS: Record<string, string> = {
  light: '라이트 ☀️',
  dark: '다크 🌙',
  system: '시스템 ⚙️',
};

export function SettingsScreen() {
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-3 p-4">
      <Text variant="heading-sm" color="muted">테마</Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        {COLOR_SCHEMES.map((scheme, i) => (
          <View key={scheme}>
            {i > 0 ? <View className="h-px bg-border" /> : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedTheme(scheme)}
              className="flex-row items-center justify-between p-4"
            >
              <Text>{LABELS[scheme]}</Text>
              {selectedTheme === scheme ? <Text color="primary">●</Text> : null}
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
