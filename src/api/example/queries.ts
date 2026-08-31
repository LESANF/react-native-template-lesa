import { createQuery, createSuspenseQuery } from 'react-query-kit';

import type { ApiError } from '@/lib/api/api-error';

import { getExampleTodo } from './requests';
import type { ExampleTodoResponse, ExampleTodoVariables } from './types';

export const useExampleTodoQuery = createQuery<
  ExampleTodoResponse,
  ExampleTodoVariables,
  ApiError
>({
  queryKey: ['example', 'todo', 'detail'],
  fetcher: (variables, { signal }) => getExampleTodo(variables, signal),
});

export const useExampleTodoSuspenseQuery = createSuspenseQuery<
  ExampleTodoResponse,
  ExampleTodoVariables,
  ApiError
>({
  queryKey: ['example', 'todo', 'detail'],
  fetcher: (variables, { signal }) => getExampleTodo(variables, signal),
});
