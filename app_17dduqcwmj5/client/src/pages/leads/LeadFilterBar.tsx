import React from 'react';
import { Search } from 'lucide-react';
import { UserSelect } from '@client/src/components/business-ui/user-select';
import { Card } from '@client/src/components/ui/card';
import { Input } from '@client/src/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/src/components/ui/select';
import {
  ALL_VALUE,
  CLUE_STATUS_OPTIONS,
  INTENTION_DEGREE_OPTIONS,
  SOURCE_CHANNEL_OPTIONS,
} from './leads.api';

interface LeadFilterBarProps {
  clueStatus: string;
  intentionDegree: string;
  sourceChannel: string;
  personInCharge: string | null;
  keyword: string;
  onClueStatusChange: (value: string) => void;
  onIntentionDegreeChange: (value: string) => void;
  onSourceChannelChange: (value: string) => void;
  onPersonInChargeChange: (value: string | null) => void;
  onKeywordChange: (value: string) => void;
}

export const LeadFilterBar: React.FC<LeadFilterBarProps> = ({
  clueStatus,
  intentionDegree,
  sourceChannel,
  personInCharge,
  keyword,
  onClueStatusChange,
  onIntentionDegreeChange,
  onSourceChannelChange,
  onPersonInChargeChange,
  onKeywordChange,
}) => {
  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索线索姓名 / 手机号"
            value={keyword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onKeywordChange(event.target.value)
            }
          />
        </div>
        <Select value={clueStatus} onValueChange={onClueStatusChange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="线索状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部线索状态</SelectItem>
            {CLUE_STATUS_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={intentionDegree}
          onValueChange={onIntentionDegreeChange}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="意向度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部意向度</SelectItem>
            {INTENTION_DEGREE_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceChannel} onValueChange={onSourceChannelChange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="来源渠道" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部来源渠道</SelectItem>
            {SOURCE_CHANNEL_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-full sm:w-48">
          <UserSelect
            value={personInCharge}
            onChange={onPersonInChargeChange}
            placeholder="全部负责人"
          />
        </div>
      </div>
    </Card>
  );
};
