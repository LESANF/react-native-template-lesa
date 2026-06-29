import { router } from 'expo-router';

import { Button, ButtonDock, ScrollView, Text, View } from '@/components/ui';

export function ButtonDockExampleScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4 pb-40">
        <Button variant="ghost" size="sm" onPress={() => router.back()}>
          뒤로
        </Button>

        <View className="gap-2">
          <Text variant="display">Product Detail</Text>
          <Text color="muted">Lightweight technical jacket</Text>
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text variant="heading-sm">₩128,000</Text>
          <Text color="muted">방풍 쉘, 투웨이 스트레치, 생활 발수 마감.</Text>
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-card p-4">
          <Text variant="heading-sm">Size</Text>
          <View className="flex-row gap-2">
            <Button variant="secondary" size="sm">
              M
            </Button>
            <Button variant="secondary" size="sm">
              L
            </Button>
            <Button variant="secondary" size="sm">
              XL
            </Button>
          </View>
        </View>
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0" pointerEvents="box-none">
        <ButtonDock className="rounded-t-2xl" shadow>
          <View className="flex-row gap-2">
            <Button variant="secondary" className="flex-1">
              장바구니
            </Button>
            <Button className="flex-1">구매하기</Button>
          </View>
        </ButtonDock>
      </View>
    </View>
  );
}
