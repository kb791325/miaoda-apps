import React, { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@client/src/components/ui/button';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@client/src/components/ui/form';
import { Input } from '@client/src/components/ui/input';
import { Textarea } from '@client/src/components/ui/textarea';
import { createRole, updateRole } from '@client/src/api';
import type { ForceRoleDTO } from '@shared/api.interface';

const formSchema = z.object({
  name: z.string().min(1, '请输入角色名称'),
  bizID: z
    .string()
    .regex(
      /^$|^[a-z][a-z0-9_]*$/,
      'snake_case 格式：小写字母开头，仅含小写字母、数字、下划线',
    )
    .optional(),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof formSchema>;

interface RoleFormDialogProps {
  mode: 'create' | 'edit';
  role: ForceRoleDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  mode,
  role,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', bizID: '', description: '' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: mode === 'edit' ? (role?.name ?? '') : '',
      bizID: '',
      description: mode === 'edit' ? (role?.description ?? '') : '',
    });
  }, [open, mode, role, form]);

  const handleSubmit = async (values: RoleFormValues): Promise<void> => {
    try {
      if (mode === 'create') {
        if (!values.bizID) {
          form.setError('bizID', { message: '请输入角色标识' });
          return;
        }
        await createRole({
          role: {
            name: values.name,
            bizID: values.bizID,
            description: values.description || undefined,
          },
        });
        toast.success('角色已创建');
      } else {
        if (!role?.bizID) return;
        await updateRole(role.bizID, {
          role: {
            name: values.name,
            description: values.description || undefined,
          },
        });
        toast.success('角色信息已更新');
      }
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : '操作失败，请稍后重试',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? '添加角色' : '编辑角色信息'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色名称</FormLabel>
                  <FormControl>
                    <Input placeholder="如：助教老师" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {mode === 'create' ? (
              <FormField
                control={form.control}
                name="bizID"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>角色标识</FormLabel>
                    <FormControl>
                      <Input placeholder="如：assistant_teacher" {...field} />
                    </FormControl>
                    <FormDescription>
                      snake_case 格式，创建后不可修改
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>角色描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="该角色的用途说明（选填）"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? '提交中...'
                  : mode === 'create'
                    ? '创建'
                    : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
