import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@client/src/components/ui/alert-dialog';
import { Button } from '@client/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@client/src/components/ui/dialog';
import { Input } from '@client/src/components/ui/input';
import type { CourseCategory } from '@shared/course';
import {
  createCourseCategory,
  deleteCourseCategory,
  fetchCourseCategories,
} from './course.api';
import { extractErrorMessage } from './course-form';

interface CategoryManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export const CategoryManageDialog: React.FC<CategoryManageDialogProps> = ({
  open,
  onOpenChange,
  onChanged,
}) => {
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [nameInput, setNameInput] = useState<string>('');
  const [adding, setAdding] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<CourseCategory | null>(
    null,
  );
  const [removing, setRemoving] = useState<boolean>(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCourseCategories();
      setCategories(result.items);
    } catch {
      toast.error('课程类别加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadCategories();
  }, [open, loadCategories]);

  const handleAdd = async () => {
    const name: string = nameInput.trim();
    if (!name) {
      toast.error('请输入类别名称');
      return;
    }
    setAdding(true);
    try {
      await createCourseCategory({ name });
      toast.success('类别已添加');
      setNameInput('');
      await loadCategories();
      onChanged();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setRemoving(true);
    try {
      await deleteCourseCategory(pendingDelete.id);
      toast.success('类别已删除');
      setPendingDelete(null);
      await loadCategories();
      onChanged();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>课程类别管理</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={nameInput}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setNameInput(event.target.value)
              }
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter' && !adding) handleAdd();
              }}
              placeholder="输入新类别名称"
              maxLength={255}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={adding}>
              {adding ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              添加
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              暂无类别，请在上方添加
            </p>
          ) : (
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {categories.map((item: CourseCategory) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="truncate text-sm text-foreground">
                    {item.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(nextOpen: boolean) => {
          if (!nextOpen && !removing) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除类别</AlertDialogTitle>
            <AlertDialogDescription>
              确定删除类别「{pendingDelete?.name}」吗？删除后新建课程将无法再选择该类别。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>取消</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={removing}
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              确认删除
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
