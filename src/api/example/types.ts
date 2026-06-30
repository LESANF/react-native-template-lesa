export type ExampleTodoVariables = {
  readonly id: number;
};

export type ExampleTodoResponse = {
  readonly userId: number;
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
};

export type CreateExamplePostRequest = {
  readonly userId: number;
  readonly title: string;
  readonly body: string;
};

export type CreateExamplePostResponse = CreateExamplePostRequest & {
  readonly id: number;
};
