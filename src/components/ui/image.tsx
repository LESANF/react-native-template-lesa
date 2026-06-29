import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';
import { withUniwind } from 'uniwind';

const StyledImage = withUniwind(ExpoImage);

export type ImageProps = ExpoImageProps & { className?: string };

function ImageBase(props: ImageProps) {
  return <StyledImage {...props} />;
}

export const Image = Object.assign(ImageBase, {
  prefetch: ExpoImage.prefetch,
  clearMemoryCache: ExpoImage.clearMemoryCache,
  clearDiskCache: ExpoImage.clearDiskCache,
});
