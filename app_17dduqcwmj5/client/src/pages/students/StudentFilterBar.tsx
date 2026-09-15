import React from 'react';
import { Search } from 'lucide-react';
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
  GRADUATION_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  SOURCE_CHANNEL_OPTIONS,
  STUDY_PROGRESS_OPTIONS,
} from './student.api';

interface StudentFilterBarProps {
  paymentStatus: string;
  channel: string;
  progress: string;
  graduationStatus: string;
  keyword: string;
  onPaymentStatusChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onProgressChange: (value: string) => void;
  onGraduationStatusChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
}

export const StudentFilterBar: React.FC<StudentFilterBarProps> = ({
  paymentStatus,
  channel,
  progress,
  graduationStatus,
  keyword,
  onPaymentStatusChange,
  onChannelChange,
  onProgressChange,
  onGraduationStatusChange,
  onKeywordChange,
}) => {
  return (
    <Card className="rounded-lg p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="搜索学员姓名 / 电话"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </div>
        <Select value={paymentStatus} onValueChange={onPaymentStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="缴费状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部缴费状态</SelectItem>
            {PAYMENT_STATUS_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channel} onValueChange={onChannelChange}>
          <SelectTrigger className="w-full sm:w-40">
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
        <Select value={progress} onValueChange={onProgressChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="学习进度" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部学习进度</SelectItem>
            {STUDY_PROGRESS_OPTIONS.map((option: string) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={graduationStatus}
          onValueChange={onGraduationStatusChange}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="结业状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>全部结业状态</SelectItem>
            {GRADUATION_STATUS_OPTIONS.map(
              (option: { label: string; value: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
};
