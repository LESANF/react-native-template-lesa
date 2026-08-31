export type ExampleTodoVariables = {
  readonly id: number;
};

export type ExampleTodoResponse = {
  readonly userId: number;
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
};

export function parseExampleTodoResponse(value: unknown): ExampleTodoResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Invalid todo response.');
  }

  const userId = Reflect.get(value, 'userId');
  const id = Reflect.get(value, 'id');
  const title = Reflect.get(value, 'title');
  const completed = Reflect.get(value, 'completed');

  if (
    typeof userId !== 'number' ||
    typeof id !== 'number' ||
    typeof title !== 'string' ||
    typeof completed !== 'boolean'
  ) {
    throw new TypeError('Invalid todo response.');
  }

  return { userId, id, title, completed };
}

export type CreateExamplePostRequest = {
  readonly userId: number;
  readonly title: string;
  readonly body: string;
};

export type CreateExamplePostResponse = CreateExamplePostRequest & {
  readonly id: number;
};
