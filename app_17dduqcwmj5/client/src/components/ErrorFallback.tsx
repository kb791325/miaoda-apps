import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent">
        <AlertCircle className="size-6 text-[hsl(5_75%_55%)]" />
      </div>
      <h2 className="text-lg font-bold text-foreground">页面出错了</h2>
      <p className="max-w-md break-words text-sm text-muted-foreground">
        {error?.message || '页面渲染时发生了未知错误，请重试或返回工作台'}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="size-4" />
          返回工作台
        </Button>
        <Button onClick={resetErrorBoundary}>
          <RefreshCw className="size-4" />
          重试
        </Button>
      </div>
    </div>
  );
};

export default ErrorFallback;
