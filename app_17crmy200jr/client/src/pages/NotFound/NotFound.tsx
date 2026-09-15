import { NotFoundRender } from "@lark-apaas/client-toolkit/components/NotFoundRender";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-sm p-12 text-center max-w-lg w-full">
        <div className="text-[80px] font-bold text-foreground mb-2 font-mono">404</div>
        <h1 className="text-xl font-semibold text-foreground mb-2">页面未找到</h1>
        <p className="text-muted-foreground mb-8">您访问的页面不存在或已被移除</p>
        <NotFoundRender />
      </div>
    </div>
  );
};

export default NotFound;
