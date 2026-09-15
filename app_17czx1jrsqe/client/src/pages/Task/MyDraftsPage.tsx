import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Trash2, ArrowRight, RefreshCw, FolderOpen } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  getAllDrafts,
  deleteDraft,
  FORM_TYPE_LABELS,
  FORM_TYPE_ROUTES,
  type DraftMeta,
} from '@/hooks/useFormDraft';

export default function MyDraftsPage() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [deleteItem, setDeleteItem] = useState<DraftMeta | null>(null);

  const userId = user?.id ? String(user.id) : 'current';

  const refresh = useCallback(() => {
    setDrafts(getAllDrafts(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteDraft(deleteItem.formType, userId, deleteItem.businessId);
    toast.success('草稿已删除');
    setDeleteItem(null);
    refresh();
  };

  const handleContinue = (item: DraftMeta) => {
    const route = FORM_TYPE_ROUTES[item.formType];
    if (!route) {
      toast.info('该表单类型暂不支持继续编辑');
      return;
    }
    // 跳转到对应列表页，附带 draft 参数
    navigate(`${route}?draft=${item.formType}:${item.businessId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">我的草稿</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            自动保存的表单草稿，可继续编辑或删除
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="mr-1.5 size-3.5" />
          刷新
        </Button>
      </div>

      {drafts.length === 0 ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="mb-3 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无草稿</p>
            <p className="mt-1 text-xs text-muted-foreground/70">填写表单时系统会自动保存草稿</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drafts.map((item) => {
            const label = FORM_TYPE_LABELS[item.formType] || item.formType;
            const time = format(new Date(item.savedAt), 'yyyy-MM-dd HH:mm');
            return (
              <Card key={`${item.formType}-${item.businessId}`} className="border-border/60 shadow-sm transition hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-medium">{label}</CardTitle>
                        <CardDescription className="text-xs">自动保存于 {time}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">草稿</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[48px]">
                    {item.summary ? (
                      <p className="line-clamp-2 text-sm text-foreground">{item.summary}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">暂无摘要</p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteItem(item)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      删除
                    </Button>
                    <Button size="sm" onClick={() => handleContinue(item)}>
                      继续编辑
                      <ArrowRight className="ml-1 size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除草稿</AlertDialogTitle>
            <AlertDialogDescription>
              删除后草稿将无法恢复，确定要删除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
