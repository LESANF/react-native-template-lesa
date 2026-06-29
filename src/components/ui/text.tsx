import { useTranslation } from 'react-i18next';
import { Text as RNText, type TextProps } from 'react-native';
import { tv, type VariantProps } from 'tailwind-variants';

const text = tv({
  base: 'text-foreground',
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
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      primaryForeground: 'text-primary-foreground',
      destructive: 'text-destructive',
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
