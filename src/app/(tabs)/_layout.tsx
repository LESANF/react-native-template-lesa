import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { tabs } from "@/constants/tabs";

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

function StandardTabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {tabs.map((tab) => {
        const Icon = tab.standardIcon;
        const route = tab.route;

        return (
          <Tabs.Screen
            key={route.name}
            name={route.name}
            options={{
              title: route.label,
              tabBarLabel: route.label,
              tabBarIcon: ({ color, focused, size }) => (
                <Icon
                  active={focused}
                  color={color}
                  size={size}
                  pointerEvents="none"
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

export default function TabsLayout() {
  return isLiquidGlassAvailable() ? (
    <LiquidGlassTabsLayout />
  ) : (
    <StandardTabsLayout />
  );
}
