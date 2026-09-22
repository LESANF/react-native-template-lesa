import dayjs from 'dayjs';
import 'dayjs/locale/ko'; // DEFAULT_LANGUAGE 를 바꾸면 이 import 도 같이 바꾼다.

import { DEFAULT_LANGUAGE } from '@/lib/i18n';

// 로케일은 여기서 한 번 건다. 호출부는 'dayjs' 패키지가 아니라 이 모듈을 가져온다.
dayjs.locale(DEFAULT_LANGUAGE);

export { dayjs };
