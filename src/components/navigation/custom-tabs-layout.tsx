import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tabs } from '@/constants/tabs';
import { useColors } from '@/lib/theme/use-colors';

import { TabButton } from './tab-button';

const TAB_BAR_HEIGHT = 72;

export function CustomTabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <Tabs style={styles.tabs}>
      <TabSlot style={styles.slot} />

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
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
