import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Search, Loader2, Check, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@lark-apaas/client-toolkit/logger';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@client/src/components/ui/popover';
import { Button } from '@client/src/components/ui/button';
import { Input } from '@client/src/components/ui/input';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@client/src/components/ui/avatar';
import { cn } from '@client/src/lib/utils';

import { searchUsers } from '@client/src/api/users';
import type { UserSearchItem } from '@shared/api.interface';

export interface UserSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedUserName?: string;
  selectedUserAvatar?: string;
  fallbackUsers?: Array<{ id: string; name: string; avatar?: string; department?: string }>;
}

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export const UserSearchSelect: React.FC<UserSearchSelectProps> = ({
  value,
  onChange,
  placeholder = '搜索并选择用户',
  disabled = false,
  selectedUserName,
  selectedUserAvatar,
  fallbackUsers = [],
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserSearchItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当外部 value 变化时，同步 selectedUser 显示
  useEffect(() => {
    if (!value) {
      setSelectedUser(null);
      return;
    }
    // 如果 items 中有匹配的，直接用
    const matched = items.find((u) => u.id === value);
    if (matched) {
      setSelectedUser(matched);
    } else if (selectedUserName) {
      setSelectedUser({
        id: value,
        name: selectedUserName,
        avatar: selectedUserAvatar,
      });
    }
  }, [value, items, selectedUserName, selectedUserAvatar]);

  const doSearch = useCallback(
    async (kw: string) => {
      if (!kw.trim()) {
        setItems([]);
        setLoading(false);
        return;
      }
      const q = kw.trim().toLowerCase();
      setLoading(true);
      try {
        const result = await searchUsers(q, PAGE_SIZE);
        setItems(result);
      } catch (err: unknown) {
        logger.error('搜索用户失败，使用本地回退列表', err);
        const fallback = fallbackUsers.filter(
          (u) => u.name?.toLowerCase().includes(q),
        );
        const anyErr = err as Record<string, unknown>;
        const respData = anyErr.response as Record<string, unknown> | undefined;
        const errorData = respData?.data as Record<string, unknown> | undefined;
        const errorObj = errorData?.error as Record<string, unknown> | undefined;
        const errMsg =
          (errorObj?.message as string | undefined) ||
          (anyErr.message as string | undefined) ||
          '搜索服务暂时不可用';
        toast.warning(`全量搜索不可用：${errMsg}`);
        setItems(fallback);
      } finally {
        setLoading(false);
      }
    },
    [fallbackUsers],
  );

  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setKeyword(val);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void doSearch(val);
      }, DEBOUNCE_MS);
    },
    [doSearch],
  );

  const handleSelect = useCallback(
    (user: UserSearchItem) => {
      onChange(user.id);
      setSelectedUser(user);
      setOpen(false);
      setKeyword('');
      setItems([]);
    },
    [onChange],
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (disabled) return;
      setOpen(nextOpen);
      if (nextOpen) {
        // 打开后聚焦输入框
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        setKeyword('');
        setItems([]);
      }
    },
    [disabled],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSelectedUser(null);
    },
    [onChange],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal h-9 rounded-sm',
            !selectedUser && 'text-muted-foreground',
          )}
        >
          {selectedUser ? (
            <span className="flex items-center gap-2 truncate">
              <Avatar className="size-5">
                {selectedUser.avatar ? (
                  <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                ) : null}
                <AvatarFallback className="text-xs">
                  {selectedUser.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUser.name}</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          {selectedUser ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="ml-2 text-muted-foreground hover:text-foreground text-xs"
            >
              清除
            </span>
          ) : (
            <Search className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0 rounded-sm"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={keyword}
            onChange={handleKeywordChange}
            placeholder="输入姓名搜索..."
            className="h-8 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
          />
          {loading && (
            <Loader2 className="size-4 shrink-0 animate-spin opacity-50" />
          )}
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              搜索中...
            </div>
          ) : !keyword.trim() ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              输入关键词开始搜索
            </div>
          ) : items.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              没有匹配结果，换个关键词试试吧
            </div>
          ) : (
            <ul className="py-1">
              {items.map((user) => {
                const isSelected = user.id === value;
                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(user)}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-sm',
                        'hover:bg-accent transition-colors',
                        isSelected && 'bg-accent/50',
                      )}
                    >
                      <Avatar className="size-7">
                        {user.avatar ? (
                          <AvatarImage src={user.avatar} alt={user.name} />
                        ) : null}
                        <AvatarFallback className="text-xs">
                          {user.name?.charAt(0) || <UserIcon className="size-3" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="truncate font-medium">{user.name}</div>
                        {user.department && (
                          <div className="truncate text-xs text-muted-foreground">
                            {user.department}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="size-4 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserSearchSelect;
