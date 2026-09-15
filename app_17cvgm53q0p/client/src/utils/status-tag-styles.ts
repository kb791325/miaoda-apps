/** 状态标签语义配色（订单/配送共用，遵循 AGENTS.md 语义色规范：边框/背景/文字） */
export const STATUS_TAG_CLASS: Record<string, string> = {
  待出库:
    'border-[hsl(38_90%_50%)] bg-[hsl(38_90%_95%)] text-[hsl(38_90%_35%)]',
  运输中:
    'border-[hsl(217_91%_60%)] bg-[hsl(217_91%_95%)] text-[hsl(217_91%_40%)]',
  在安装:
    'border-[hsl(245_55%_55%)] bg-[hsl(245_55%_96%)] text-[hsl(245_55%_40%)]',
  已完成:
    'border-[hsl(152_65%_45%)] bg-[hsl(152_65%_95%)] text-[hsl(152_65%_30%)]',
  已取消:
    'border-[hsl(220_10%_70%)] bg-[hsl(220_10%_96%)] text-[hsl(220_10%_50%)]',
};
