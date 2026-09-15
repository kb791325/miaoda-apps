import { z } from 'zod';
import type { CourseDetail } from '@shared/course';

export const courseFormSchema = z.object({
  courseName: z.string().trim().min(1, '课程名称不能为空'),
  courseCategory: z.string(),
  difficultyLevel: z.string(),
  studyDuration: z.string(),
  tuitionFee: z
    .string()
    .refine(
      (value: string) =>
        value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      '学费需为非负数字',
    ),
  status: z.string(),
  productImageUrl: z.string(),
  courseIntro: z.string(),
});

export type CourseFormData = z.infer<typeof courseFormSchema>;

export const buildCourseFormDefaults = (
  detail: CourseDetail | null,
): CourseFormData => ({
  courseName: detail?.courseName ?? '',
  courseCategory: detail?.courseCategory ?? '',
  difficultyLevel: detail?.difficultyLevel ?? '',
  studyDuration: detail?.studyDuration ?? '',
  tuitionFee:
    detail && detail.tuitionFee !== null ? String(detail.tuitionFee) : '',
  status: detail?.status ?? '',
  productImageUrl: (detail?.productImage ?? [])[0] ?? '',
  courseIntro: detail?.courseIntro ?? '',
});

export { extractErrorMessage } from '@client/src/utils/error-message';
