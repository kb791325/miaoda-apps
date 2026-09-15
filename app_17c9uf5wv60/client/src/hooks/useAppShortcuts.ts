import { useEffect, useRef } from 'react';

export const SHORTCUT_EVENTS = {
  new: 'app-shortcut:new',
  export: 'app-shortcut:export',
  save: 'app-shortcut:save',
} as const;

export interface ShortcutList {
  keys: string;
  description: string;
}

export const SHORTCUT_LIST: ShortcutList[] = [
  { keys: 'Ctrl / Cmd + N', description: '新建（商品 / 订单 / 入库，取决于当前页面）' },
  { keys: 'Ctrl / Cmd + F', description: '聚焦全局搜索' },
  { keys: 'Ctrl / Cmd + E', description: '导出当前列表' },
  { keys: 'Ctrl / Cmd + S', description: '保存当前表单' },
  { keys: 'Esc', description: '关闭弹窗 / 取消编辑' },
];

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === 'n') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.new));
      } else if (key === 'f') {
        event.preventDefault();
        const el = document.getElementById('global-search-input');
        el?.focus();
      } else if (key === 'e') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.export));
      } else if (key === 's') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENTS.save));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

interface PageShortcutHandlers {
  onNew?: () => void;
  onExport?: () => void;
  onSave?: () => void;
}

export function usePageShortcuts(handlers: PageShortcutHandlers): void {
  const handlersRef = useRef<PageShortcutHandlers>(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const onNew = () => handlersRef.current.onNew?.();
    const onExport = () => handlersRef.current.onExport?.();
    const onSave = () => handlersRef.current.onSave?.();
    window.addEventListener(SHORTCUT_EVENTS.new, onNew);
    window.addEventListener(SHORTCUT_EVENTS.export, onExport);
    window.addEventListener(SHORTCUT_EVENTS.save, onSave);
    return () => {
      window.removeEventListener(SHORTCUT_EVENTS.new, onNew);
      window.removeEventListener(SHORTCUT_EVENTS.export, onExport);
      window.removeEventListener(SHORTCUT_EVENTS.save, onSave);
    };
  }, []);
}
