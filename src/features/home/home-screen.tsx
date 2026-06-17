import { Pressable, ScrollView, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { Text } from '@/components/ui';
import { useSelectedTheme } from '@/lib/theme/selected-theme';

/**
 * 다크모드 실무 사용 패턴 데모.
 *
 * 규칙: 화면은 semantic 토큰(역할 이름)만 쓴다. light/dark 실제 색은
 * styles/tokens/semantic.css 한 곳에서 갈린다. 여기엔 `dark:` 가 하나도 없다.
 *
 * 요소 → 토큰 매핑:
 *   페이지 배경            bg-bg-primary
 *   카드/표면              bg-bg-elevated  + border-border-primary
 *   아바타/칩 배경         bg-layer-secondary
 *   기본 텍스트            (Text 기본) text-text-primary
 *   부제                   color="secondary"  → text-text-secondary
 *   캡션/메타              color="tertiary"   → text-text-tertiary
 *   기본 버튼(CTA)         bg-layer-brand   + color="inverse"
 *   보조 버튼              bg-bg-elevated   + border-border-primary + 기본 텍스트
 *   브랜드 강조 배너        bg-layer-brand-subtle   + color="brand"
 *   성공 배너              bg-layer-success-subtle + text-system-success
 *   구분선                 border-border-primary (border-t)
 */
export function HomeScreen() {
  const { theme } = useUniwind();
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      className="bg-bg-primary"
      contentContainerClassName="gap-4 p-4"
    >
      {/* 테마 토글 (스크린샷 테스트용) — 기본 버튼 패턴 */}
      <Pressable
        accessibilityRole="button"
        onPress={() => setSelectedTheme(next)}
        className="rounded-2xl bg-layer-brand px-5 py-4"
      >
        <Text variant="heading-sm" color="inverse">
          {next === 'dark' ? '다크로 전환' : '라이트로 전환'}
        </Text>
        <Text color="inverse">selected: {selectedTheme} · current: {theme}</Text>
      </Pressable>

      {/* 1. 프로필 헤더 카드 — 표면 + 텍스트 위계 + 아바타 */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-border-primary bg-bg-elevated p-4">
        <View className="size-14 items-center justify-center rounded-full bg-layer-secondary">
          <Text variant="heading-sm">L</Text>
        </View>
        <View className="flex-1">
          <Text variant="heading-sm">이산</Text>
          <Text color="tertiary">@lesa · 프로덕트 엔지니어</Text>
        </View>
      </View>

      {/* 2. 버튼 2종 — 기본(brand) / 보조(테두리) */}
      <View className="flex-row gap-3">
        <Pressable className="flex-1 items-center rounded-xl bg-layer-brand py-3">
          <Text variant="heading-sm" color="inverse">팔로우</Text>
        </Pressable>
        <Pressable className="flex-1 items-center rounded-xl border border-border-primary bg-bg-elevated py-3">
          <Text variant="heading-sm">메시지</Text>
        </Pressable>
      </View>

      {/* 3. 브랜드 강조 배너 — 새로 등재한 layer-brand-subtle (틴트 배경 + text-brand) */}
      <View className="gap-1 rounded-2xl bg-layer-brand-subtle p-4">
        <Text variant="heading-sm" color="brand">프로 멤버십</Text>
        <Text color="secondary">
          은은한 브랜드 배경. 이 역할이 사전에 없어서 semantic.css에 1회 등재했다.
        </Text>
      </View>

      {/* 4. 성공 배너 — 새 layer-success-subtle 배경 + 기존 text-system-success */}
      <View className="flex-row items-center gap-2 rounded-2xl bg-layer-success-subtle p-4">
        <Text variant="heading-sm" className="text-system-success">✓</Text>
        <Text className="flex-1 text-system-success">결제가 완료되었습니다.</Text>
      </View>

      {/* 5. 설정 리스트 — 행 사이 구분선 + 제목/부제/쉐브론 위계 */}
      <View className="overflow-hidden rounded-2xl border border-border-primary bg-bg-elevated">
        {['알림', '개인정보', '약관'].map((label, i) => (
          <View key={label}>
            {i > 0 ? <View className="h-px bg-border-primary" /> : null}
            <View className="flex-row items-center justify-between p-4">
              <View>
                <Text>{label}</Text>
                <Text color="tertiary">설명 텍스트</Text>
              </View>
              <Text color="tertiary">›</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 6. 시스템 상태 텍스트 */}
      <View className="gap-1 rounded-2xl border border-border-primary p-4">
        <Text className="text-system-success">success</Text>
        <Text className="text-system-warning">warning</Text>
        <Text className="text-system-error">error</Text>
      </View>
    </ScrollView>
  );
}
