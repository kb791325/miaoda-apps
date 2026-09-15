import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDateTime } from '@/lib/format';

export interface TaskComment {
  id: number;
  task_id: number;
  author: string;
  content: string;
  created_at: string;
}

export default function CollabTaskCommentList({
  comments,
  loading,
  emptyText,
}: {
  comments: TaskComment[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> 评论加载中...
      </div>
    );
  }
  if (comments.length === 0) {
    return <div className="py-3 text-xs text-muted-foreground">{emptyText}</div>;
  }
  return (
    <div className="space-y-3">
      {comments.map((c: TaskComment) => (
        <div key={c.id} className="flex items-start gap-2.5">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {(c.author || '?').slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 rounded-md bg-muted/40 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium">{c.author}</span>
              <span className="text-[10px] text-muted-foreground">{formatDateTime(c.created_at)}</span>
            </div>
            <p className="mt-0.5 break-words text-xs leading-relaxed">{c.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
