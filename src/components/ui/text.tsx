import { useTranslation } from 'react-i18next';
import { Text as RNText, type TextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

/**
 * 앱 전역 공통 Text — className 기본 + variant prop 정제 (2-way).
 *
 *   <Text variant="heading-lg" color="brand">제목</Text>      // prop 정제
 *   <Text className="text-body text-text-secondary">본문</Text> // className 직접
 *
 * variant = styles/utilities/typography.css 의 합성 클래스와 1:1.
 * color   = styles/tokens/semantic.css 의 text-* 토큰과 1:1.
 * 문자열 children 은 i18n 키로 통과(단일 언어면 원문 그대로).
 */
const text = tv({
  base: 'text-text-primary',
  variants: {
    variant: {
      display: 'text-display',
      'heading-lg': 'text-heading-lg',
      'heading-sm': 'text-heading-sm',
      'body-lg': 'text-body-lg',
      body: 'text-body',
      label: 'text-label',
    },
    color: {
      primary: 'text-text-primary',
      secondary: 'text-text-secondary',
      tertiary: 'text-text-tertiary',
      brand: 'text-text-brand',
      inverse: 'text-text-inverse',
    },
  },
  defaultVariants: { variant: 'body' },
});

type TextVariants = VariantProps<typeof text>;
type Props = TextProps & TextVariants & { className?: string };

export function Text({ variant, color, className, children, ...props }: Props) {
  const { t } = useTranslation();
  return (
    <RNText className={text({ variant, color, className })} {...props}>
      {typeof children === 'string' ? t(children) : children}
    </RNText>
  );
}
