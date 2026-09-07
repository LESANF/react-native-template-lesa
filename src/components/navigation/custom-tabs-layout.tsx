import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';

import { tabs } from '@/constants/tabs';

import { TabButton } from './tab-button';

const TAB_BAR_HEIGHT = 72;
const TAB_BAR_BORDER_FALLBACK = '#e4e4e7';
const TAB_BAR_BACKGROUND_FALLBACK = '#ffffff';

function resolveColorToken(value: number | string | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function CustomTabsLayout() {
  const insets = useSafeAreaInsets();
  const [backgroundColorToken, borderColorToken] = useCSSVariable([
    '--color-card',
    '--color-border',
  ]);
  const backgroundColor = resolveColorToken(backgroundColorToken, TAB_BAR_BACKGROUND_FALLBACK);
  const borderTopColor = resolveColorToken(borderColorToken, TAB_BAR_BORDER_FALLBACK);

  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor,
            borderTopColor,
            height: TAB_BAR_HEIGHT + insets.bottom,
          },
        ]}>
        <View style={styles.tabBarContent}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const route = tab.route;

            return (
              <TabTrigger key={route.name} name={route.name} asChild>
                <TabButton icon={Icon} label={route.label} />
              </TabTrigger>
            );
          })}
        </View>
      </View>

      <TabList style={styles.hiddenTabList}>
        {tabs.map(tab => {
          const route = tab.route;

          return <TabTrigger key={route.name} href={route.href} name={route.name} />;
        })}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hiddenTabList: {
    display: 'none',
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    borderTopWidth: 1,
    paddingVertical: 12,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
  },
  tabs: {
    flex: 1,
  },
});
