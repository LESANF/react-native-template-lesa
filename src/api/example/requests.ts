import { client } from '@/lib/api/client';

import type {
  CreateExamplePostRequest,
  CreateExamplePostResponse,
  ExampleTodoResponse,
  ExampleTodoVariables,
} from './types';
import { parseExampleTodoResponse } from './types';

export function getExampleTodo(
  { id }: ExampleTodoVariables,
  signal?: AbortSignal,
): Promise<ExampleTodoResponse> {
  return client.get(`/todos/${id}`, {
    auth: 'none',
    parse: parseExampleTodoResponse,
    signal,
  });
}

export function createExamplePost(
  data: CreateExamplePostRequest,
): Promise<CreateExamplePostResponse> {
  return client.post('/posts', data, { auth: 'none' });
}
