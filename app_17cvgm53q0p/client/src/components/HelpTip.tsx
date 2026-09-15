import React from 'react';
import { CircleHelp } from 'lucide-react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export interface HelpTipProps {
  /** 操作说明文字 */
  content: string;
}

/** 关键操作旁的「?」帮助图标，悬停/点击展示操作说明 */
const HelpTip: React.FC<HelpTipProps> = ({ content }) => {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-label="操作说明"
          className="inline-flex shrink-0 items-center text-muted-foreground transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          <CircleHelp className="size-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        className="w-72 text-base leading-relaxed"
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
};

export default HelpTip;
