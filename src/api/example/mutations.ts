import { createMutation } from 'react-query-kit';

import type { ApiError } from '@/lib/api/api-error';

import { createExamplePost } from './controller';
import type { CreateExamplePostRequest, CreateExamplePostResponse } from './types';

export const useCreateExamplePostMutation = createMutation<
  CreateExamplePostResponse,
  CreateExamplePostRequest,
  ApiError
>({
  mutationKey: ['example', 'post', 'create'],
  mutationFn: createExamplePost,
});
