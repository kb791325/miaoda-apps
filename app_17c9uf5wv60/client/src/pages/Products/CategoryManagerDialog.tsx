import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { categories as categoriesApi } from '@client/src/api';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type { Category } from '@shared/api.interface';

const categorySchema = z.object({
  name: z.string().min(1, '请输入品类名称').max(50, '名称最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').default(''),
  sortOrder: z.coerce.number().int('排序必须为整数').min(0, '排序不能为负'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function CategoryManagerDialog({
  open,
  onOpenChange,
  onChanged,
}: CategoryManagerDialogProps) {
  const [items, setItems] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', description: '', sortOrder: 0 },
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await categoriesApi.getCategories();
      setItems(res.items);
    } catch (err: unknown) {
      logger.error('获取品类列表失败:', String(err));
      toast.error('获取品类列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const handleAdd = () => {
    setEditingId(null);
    form.reset({ name: '', description: '', sortOrder: items.length + 1 });
    setEditOpen(true);
  };

  const handleEdit = (item: Category) => {
    setEditingId(item.id);
    form.reset({
      name: item.name,
      description: item.description,
      sortOrder: item.sortOrder,
    });
    setEditOpen(true);
  };

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      if (editingId) {
        await categoriesApi.updateCategory(editingId, data);
        toast.success('品类已更新');
      } else {
        await categoriesApi.createCategory({
          name: data.name,
          description: data.description,
          sortOrder: data.sortOrder,
        });
        toast.success('品类已创建');
      }
      setEditOpen(false);
      loadData();
      onChanged();
    } catch (err: unknown) {
      logger.error(editingId ? '更新品类失败:' : '创建品类失败:', String(err));
      toast.error(editingId ? '更新品类失败，请重试' : '创建品类失败，请重试');
    }
  };

  const handleDeleteClick = (item: Category) => {
    setDeletingId(item.id);
    setDeletingName(item.name);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await categoriesApi.deleteCategory(deletingId);
      toast.success('品类已删除');
      setDeleteOpen(false);
      loadData();
      onChanged();
    } catch (err: unknown) {
      logger.error('删除品类失败:', String(err));
      toast.error('删除品类失败，请重试');
    }
  };

  return (
    <>
      <Dialog open={open && !editOpen && !deleteOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-sm bg-primary/10">
                  <Tag className="size-3.5 text-primary" />
                </div>
                <DialogTitle className="text-base font-medium">
                  品类管理
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    共 {items.length} 个
                  </span>
                </DialogTitle>
              </div>
              <Button size="sm" onClick={handleAdd} className="mr-8">
                <Plus className="size-3.5" />
                新增
              </Button>
            </div>
          </DialogHeader>
          <div className="py-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                加载中...
              </div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                暂无品类
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs w-12">
                      排序
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                      品类名称
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">
                      描述
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-24">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {item.sortOrder}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground text-xs">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-sm bg-primary" />
                          {item.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">
                        {item.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(item)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="pt-3 border-t border-border -mx-6 px-6 -mb-6 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="pb-3 border-b border-border">
            <DialogTitle className="text-sm font-medium">
              {editingId ? '编辑品类' : '新增品类'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-3 py-1"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground font-normal">
                      品类名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入品类名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground font-normal">
                      描述
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入品类描述（选填）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground font-normal">
                      排序
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm">
                  {editingId ? '保存' : '新增'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            确定要删除品类「
            <span className="text-foreground font-medium">{deletingName}</span>
            」吗？删除后无法恢复。
          </p>
          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
