import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChartStateProps {
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: React.ReactNode;
}

/** 图表容器统一状态：加载骨架 / 错误重试 / 空态 / 正常内容 */
const ChartState: React.FC<ChartStateProps> = ({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}) => {
  if (loading) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-md bg-muted" />
    );
  }
  if (error) {
    return (
      <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>图表数据加载失败</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-1 h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return <>{children}</>;
};

export default ChartState;
