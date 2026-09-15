import type {
  MarketingContentStatus,
  MarketingContentType,
} from '@shared/content';

export const CONTENT_TYPE_OPTIONS: MarketingContentType[] = [
  'enrollment_copy',
  'video_script',
  'moments',
  'poster_copy',
];

export const CONTENT_TYPE_LABELS: Record<MarketingContentType, string> = {
  enrollment_copy: '招生文案',
  video_script: '短视频脚本',
  moments: '朋友圈',
  poster_copy: '海报文案',
};

export const CONTENT_TYPE_PLUGIN_LABELS: Record<MarketingContentType, string> =
  {
    enrollment_copy: '招生文案',
    video_script: '短视频脚本',
    moments: '朋友圈文案',
    poster_copy: '海报文案',
  };

export const STATUS_META: Record<
  MarketingContentStatus,
  { label: string; className: string }
> = {
  pending_review: {
    label: '待审核',
    className:
      'border-[hsl(220_70%_58%/0.35)] bg-[hsl(220_70%_58%/0.12)] text-[hsl(220_65%_45%)]',
  },
  available: {
    label: '可用',
    className:
      'border-[hsl(140_60%_45%/0.35)] bg-[hsl(140_60%_45%/0.12)] text-[hsl(140_60%_30%)]',
  },
  used: {
    label: '已使用',
    className: 'border-border bg-muted text-muted-foreground',
  },
  rejected: {
    label: '已驳回',
    className:
      'border-[hsl(5_75%_55%/0.35)] bg-[hsl(5_75%_55%/0.1)] text-[hsl(5_75%_42%)]',
  },
};

export const STATUS_FILTER_OPTIONS: Array<{
  value: MarketingContentStatus;
  label: string;
}> = [
  { value: 'pending_review', label: '待审核' },
  { value: 'available', label: '可用' },
  { value: 'used', label: '已使用' },
  { value: 'rejected', label: '已驳回' },
];
