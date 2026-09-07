import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { CustomTabsLayout } from '@/components/navigation/custom-tabs-layout';
import { TAB_BAR_COLORS } from '@/constants/tab-bar';
import { tabs } from '@/constants/tabs';

// Liquid Glass가 가능한 iOS는 NativeTabs, 그 외(iOS 구버전/Android)는 JS Tabs를 사용한다.
// iOS 26 제약: 비선택 라벨/아이콘 색은 OS가 강제하므로 지정 불가(expo/expo#44029). selected 색만 조정 가능.
function LiquidGlassTabsLayout() {
  return (
    <NativeTabs>
      {tabs.map(tab => {
        const route = tab.route;

        return (
          <NativeTabs.Trigger key={route.name} name={route.name}>
            <NativeTabs.Trigger.Icon renderingMode="original" src={tab.nativeIcon} />
            <NativeTabs.Trigger.Label selectedStyle={{ color: TAB_BAR_COLORS.selected }}>
              {route.label}
            </NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}

// ── iOS 26 Liquid Glass NativeTabs 는 하드코딩으로 꺼 둔다 (2026-09-04 사용자 결정) ──
// 지금은 모든 플랫폼이 JS CustomTabsLayout 을 쓴다.
// 활성화하려면: 이 하드코딩을 지우고 `import { isLiquidGlassAvailable } from "expo-glass-effect"` 를 되살린 뒤
//   const USE_LIQUID_GLASS_TABS = isLiquidGlassAvailable();
// 로 바꾸면 iOS 26(Liquid Glass 가능)에서만 NativeTabs, 그 외(iOS 구버전/Android)는 JS Tabs 로 갈린다.
const USE_LIQUID_GLASS_TABS = false;

export default function TabsLayout() {
  return USE_LIQUID_GLASS_TABS ? <LiquidGlassTabsLayout /> : <CustomTabsLayout />;
}
