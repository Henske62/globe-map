import { useEffect } from 'react';
import { PhotoThumb } from './PhotoThumb';
import type { Photo } from '../lib/types';
import { formatDate } from '../lib/format';

interface Props {
  photos: Photo[];
  index: number;
  onIndex: (i: number | null) => void;
  stopName?: (id?: string) => string | undefined;
}

export function Lightbox({ photos, index, onIndex, stopName }: Props) {
  const photo = photos[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onIndex(null);
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photos.length, onIndex]);
  if (!photo) return null;
  const meta = [stopName?.(photo.stopId), formatDate(photo.takenAt)].filter(Boolean).join(' · ');
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={() => onIndex(null)}>
      <button className="lightbox-close" aria-label="Schließen" onClick={() => onIndex(null)}>
        ×
      </button>
      {photos.length > 1 && (
        <button
          className="lightbox-nav prev"
          aria-label="Vorheriges Foto"
          onClick={(e) => {
            e.stopPropagation();
            onIndex((index - 1 + photos.length) % photos.length);
          }}
        >
          ‹
        </button>
      )}
      <figure onClick={(e) => e.stopPropagation()}>
        <PhotoThumb photo={photo} full />
        {(photo.caption || meta) && (
          <figcaption>
            {photo.caption}
            {meta && <small>{meta}</small>}
          </figcaption>
        )}
      </figure>
      {photos.length > 1 && (
        <button
          className="lightbox-nav next"
          aria-label="Nächstes Foto"
          onClick={(e) => {
            e.stopPropagation();
            onIndex((index + 1) % photos.length);
          }}
        >
          ›
        </button>
      )}
    </div>
  );
}
