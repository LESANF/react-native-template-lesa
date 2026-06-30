import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { useUniwind } from "uniwind";

import CheckCircleIcon from "@/assets/svg/check-circle.svg";
import {
  Button,
  Dimmed,
  Image,
  Input,
  Pressable,
  ScrollView,
  Text,
  toast,
  View,
  type DimmedVisualProps,
} from "@/components/ui";
import { useNavigationReset } from "@/hooks/use-navigation-reset";
import { COLOR_SCHEMES, useSelectedTheme } from "@/lib/theme/selected-theme";

type DimmedExampleState = DimmedVisualProps;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading-sm">{title}</Text>
      {children}
    </View>
  );
}

export function HomeScreen() {
  const { theme } = useUniwind();
  const { selectedTheme, setSelectedTheme } = useSelectedTheme();
  const resetNavigation = useNavigationReset();
  const [dimmedExample, setDimmedExample] = useState<DimmedExampleState | null>(
    null,
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="bg-background"
        contentContainerClassName="gap-4 p-4"
      >
        <Text variant="display">Components</Text>

        <Section title="Theme">
          <View className="flex-row flex-wrap items-center gap-2">
            {COLOR_SCHEMES.map((scheme) => (
              <Button
                key={scheme}
                variant={selectedTheme === scheme ? "primary" : "secondary"}
                size="sm"
                onPress={() => setSelectedTheme(scheme)}
              >
                {scheme}
              </Button>
            ))}
          </View>
          <Text color="muted">
            selected: {selectedTheme} · current: {theme}
          </Text>
        </Section>

        <Section title="Text">
          <Text variant="display">Display</Text>
          <Text variant="heading-lg">Heading LG</Text>
          <Text variant="heading-sm">Heading SM</Text>
          <Text variant="body-lg">Body LG</Text>
          <Text>Body (기본)</Text>
          <Text variant="label">Label</Text>
          <View className="h-px bg-border" />
          <View className="flex-row flex-wrap gap-3">
            <Text color="muted">muted</Text>
            <Text color="primary">primary</Text>
            <Text className="text-success">success</Text>
            <Text className="text-warning">warning</Text>
            <Text color="destructive">destructive</Text>
          </View>
        </Section>

        <Section title="Button">
          <View className="flex-row flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
          </View>
        </Section>

        <Section title="ButtonDock">
          <Button onPress={() => router.push("/button-dock")}>
            ButtonDock 확인하기
          </Button>
        </Section>

        <Section title="Navigation reset">
          <View className="gap-2">
            <Button
              variant="secondary"
              onPress={() =>
                resetNavigation({
                  pathname: "/navigation-reset-example/[id]",
                  params: {
                    id: "href-101",
                    mode: "href",
                    source: "home",
                    count: "1",
                  },
                })
              }
            >
              Href params reset
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                resetNavigation({
                  tab: "index",
                  stack: ["index"],
                  topRoute: {
                    name: "navigation-reset-example/[id]",
                    params: {
                      id: "top-202",
                      mode: "topRoute",
                      source: "home",
                      count: "2",
                    },
                  },
                })
              }
            >
              topRoute params reset
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                resetNavigation({
                  tab: "menu-4",
                  stack: [
                    "index",
                    {
                      name: "[id]",
                      params: {
                        id: "stack-303",
                        mode: "tab-stack",
                        source: "home",
                        count: "3",
                      },
                    },
                  ],
                })
              }
            >
              tab stack params reset
            </Button>
          </View>
          <Text color="muted">각 버튼은 reset 후 도착 화면에서 params를 직접 출력합니다.</Text>
        </Section>

        <Section title="Data layer">
          <Button variant="secondary" onPress={() => router.push('/api-example')}>
            API example 확인하기
          </Button>
          <Text color="muted">
            regular query, suspense query, mutation을 같은 API concern에서 확인합니다.
          </Text>
        </Section>

        <Section title="Input">
          <Input
            label="이메일"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input label="비밀번호" placeholder="••••••••" secureTextEntry />
          <Input
            label="에러 예시"
            placeholder="입력"
            error="필수 항목입니다."
          />
          <Input label="비활성" placeholder="비활성" disabled />
        </Section>

        <Section title="Pressable">
          <Pressable
            className="rounded-xl border border-border bg-muted p-4"
            onPress={() => console.log("Pressable Click")}
          >
            <Text>탭 타겟 (hitSlop 8 내장)</Text>
          </Pressable>
        </Section>

        <Section title="Image">
          <Image
            source="https://picsum.photos/seed/lesa/600/300"
            className="h-40 w-full rounded-xl"
          />
          <Text color="muted">
            placeholder(blurhash)·transition·cachePolicy 는 옵션
          </Text>
        </Section>

        <Section title="SVG">
          <View className="flex-row items-center gap-3">
            <CheckCircleIcon width={48} height={48} />
            <Text color="muted">SVG icon import</Text>
          </View>
        </Section>

        <Section title="Overlays">
          <View className="flex-row flex-wrap items-center gap-2">
            <Button
              throttleDisabled
              variant="secondary"
              onPress={() =>
                toast.show({ type: "success", text1: "Toast success" })
              }
            >
              Toast
            </Button>
            <Button
              throttleDisabled
              variant="secondary"
              onPress={() => {
                const stamp = Date.now().toString().slice(-4);
                toast.show({ type: "default", text1: `Toast first ${stamp}` });
                setTimeout(() => {
                  toast.show({
                    type: "warning",
                    text1: `Toast replaced ${stamp}`,
                  });
                }, 350);
              }}
            >
              Toast replace
            </Button>
            <Button
              variant="secondary"
              onPress={() => setDimmedExample({ blur: true })}
            >
              Dimmed
            </Button>
            <Button
              variant="secondary"
              onPress={() =>
                setDimmedExample({ color: "#10b981", opacity: 0.35 })
              }
            >
              Dimmed color
            </Button>
          </View>
          <Text color="muted">
            Toast is global; Dimmed is rendered where it is needed
          </Text>
        </Section>
      </ScrollView>
      {dimmedExample && (
        <Dimmed {...dimmedExample} onPress={() => setDimmedExample(null)} />
      )}
    </View>
  );
}
