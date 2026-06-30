import { Delay } from '@suspensive/react';
import { Suspense, type ReactNode } from 'react';

import { useCreateExamplePostMutation } from '@/api/example/mutations';
import {
  useExampleTodoQuery,
  useExampleTodoSuspenseQuery,
} from '@/api/example/queries';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  Text,
  View,
} from '@/components/ui';

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-4">
      <Text variant="heading-sm">{title}</Text>
      {children}
    </View>
  );
}

function TodoCard({
  completed,
  title,
}: {
  readonly completed: boolean;
  readonly title: string;
}) {
  return (
    <View className="gap-1 rounded-xl bg-muted p-3">
      <Text>{title}</Text>
      <Text color="muted">completed: {completed ? 'true' : 'false'}</Text>
    </View>
  );
}

function QuerySkeleton() {
  return (
    <Delay ms={300} fallback={null}>
      <View className="items-center justify-center rounded-xl bg-muted p-6">
        <ActivityIndicator />
      </View>
    </Delay>
  );
}

function RegularQueryExample() {
  const query = useExampleTodoQuery({ variables: { id: 1 } });

  if (query.isPending) return <QuerySkeleton />;

  if (query.isError) {
    return <Text color="destructive">{query.error.message}</Text>;
  }

  return <TodoCard completed={query.data.completed} title={query.data.title} />;
}

function SuspenseQueryExample() {
  const { data } = useExampleTodoSuspenseQuery({ variables: { id: 2 } });
  return <TodoCard completed={data.completed} title={data.title} />;
}

function MutationExample() {
  const mutation = useCreateExamplePostMutation();

  return (
    <View className="gap-3">
      <Button
        variant="secondary"
        loading={mutation.isPending}
        onPress={() =>
          mutation.mutate({
            body: 'Generated from template API example.',
            title: 'Template mutation',
            userId: 1,
          })
        }>
        Create post
      </Button>
      {mutation.isError && <Text color="destructive">{mutation.error.message}</Text>}
      {mutation.data && <Text color="muted">created id: {mutation.data.id}</Text>}
    </View>
  );
}

export function ApiExampleScreen() {
  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
      <Text variant="display">Data Layer</Text>

      <Section title="Regular query">
        <RegularQueryExample />
      </Section>

      <Section title="Suspense query">
        <Suspense fallback={<QuerySkeleton />}>
          <SuspenseQueryExample />
        </Suspense>
      </Section>

      <Section title="Mutation">
        <MutationExample />
      </Section>
    </ScrollView>
  );
}
