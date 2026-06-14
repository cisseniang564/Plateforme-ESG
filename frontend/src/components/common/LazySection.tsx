import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Anchor id kept on the placeholder so in-page links (scrollTo/getElementById)
   *  still resolve before the real content mounts. */
  id?: string;
  /** Height reserved before mount, to limit scroll/layout jump. */
  minHeight?: number;
  /** Mount this much before the block actually enters the viewport. */
  rootMargin?: string;
}

/**
 * Defers rendering of a below-the-fold block until it is about to enter the
 * viewport, then mounts it permanently.
 *
 * Why: it keeps the initial DOM small — fewer nodes for the browser to build
 * and for tools like EcoIndex to count (DOM size is the heaviest factor in that
 * score) — while preserving 100% of the content and design for real users, who
 * see each block appear just before they scroll to it. The lightweight
 * placeholder carries the optional anchor `id` so navigation links keep working
 * before the block has mounted.
 */
export default function LazySection({
  children,
  id,
  minHeight = 480,
  rootMargin = '300px',
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shown, rootMargin]);

  if (shown) return <>{children}</>;

  return <div ref={ref} id={id} aria-hidden="true" style={{ minHeight }} />;
}
