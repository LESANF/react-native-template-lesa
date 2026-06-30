import { publicClient } from '@/lib/api/client';

import type {
  CreateExamplePostRequest,
  CreateExamplePostResponse,
  ExampleTodoResponse,
  ExampleTodoVariables,
} from './types';

export function getExampleTodo({ id }: ExampleTodoVariables) {
  return publicClient.get<ExampleTodoResponse>(`/todos/${id}`);
}

export function createExamplePost(data: CreateExamplePostRequest) {
  return publicClient.post<CreateExamplePostResponse, CreateExamplePostRequest>('/posts', data);
}
