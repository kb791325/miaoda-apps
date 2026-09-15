import { Suspense, lazy, useRef, useState, useEffect, type ComponentProps } from 'react';
import { Skeleton } from '@client/src/components/ui/skeleton';

type ReactEChartsProps = ComponentProps<typeof import('echarts-for-react').default>;

const ReactEChartsLazy = lazy(() => import('echarts-for-react'));

const CHART_SKELETON_STYLE: React.CSSProperties = {
  width: '100%',
  height: 320,
};

export function LazyChart(props: ReactEChartsProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {visible ? (
        <Suspense fallback={<Skeleton style={CHART_SKELETON_STYLE} />}>
          <ReactEChartsLazy {...props} />
        </Suspense>
      ) : (
        <Skeleton style={CHART_SKELETON_STYLE} />
      )}
    </div>
  );
}