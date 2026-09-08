import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { CustomTabsLayout } from '@/components/navigation/custom-tabs-layout';
import { TAB_BAR_COLORS } from '@/constants/tab-bar';
import { tabs } from '@/constants/tabs';

// iOS 26: 비선택 라벨·아이콘 색은 OS 강제라 지정 불가(expo/expo#44029). selected 만 가능.
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

// NativeTabs 는 꺼 둔다 — 전 플랫폼이 JS CustomTabsLayout.
// 켜려면 `isLiquidGlassAvailable()`(expo-glass-effect) 로 되돌린다.
const USE_LIQUID_GLASS_TABS = false;

export default function TabsLayout() {
  return USE_LIQUID_GLASS_TABS ? <LiquidGlassTabsLayout /> : <CustomTabsLayout />;
}
