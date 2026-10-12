import { useObjectUrl } from '../lib/hooks';
import type { Photo } from '../lib/types';

export function PhotoThumb({ photo, full, alt, className }: { photo: Photo; full?: boolean; alt?: string; className?: string }) {
  const url = useObjectUrl(full ? photo.blob : photo.thumb);
  if (!url) return <div className={`photo-placeholder ${className ?? ''}`} />;
  return <img src={url} alt={alt ?? photo.caption ?? ''} className={className} loading="lazy" />;
}
