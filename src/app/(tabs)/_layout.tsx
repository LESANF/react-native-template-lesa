import { isLiquidGlassAvailable } from "expo-glass-effect";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { CustomTabsLayout } from "@/components/navigation/custom-tabs-layout";
import { tabs } from "@/constants/tabs";

// Liquid Glass가 가능한 iOS는 NativeTabs, 그 외(iOS 구버전/Android)는 JS Tabs를 사용한다.
function LiquidGlassTabsLayout() {
  return (
    <NativeTabs>
      {tabs.map((tab) => {
        const icon = tab.nativeIcon;
        const route = tab.route;

        return (
          <NativeTabs.Trigger key={route.name} name={route.name}>
            <NativeTabs.Trigger.Icon
              sf={icon.sfSymbolName}
              md={icon.materialIconName}
            />
            <NativeTabs.Trigger.Label>{route.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}

export default function TabsLayout() {
  return isLiquidGlassAvailable() ? (
    <LiquidGlassTabsLayout />
  ) : (
    <CustomTabsLayout />
  );
}
