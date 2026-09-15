export const APP_ROLES = {
  principal: 'principal',
  recruitmentTeacher: 'recruitment_teacher',
  teachingTeacher: 'teaching_teacher',
  student: 'student',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const ALL_ROLES: AppRole[] = [
  APP_ROLES.principal,
  APP_ROLES.recruitmentTeacher,
  APP_ROLES.teachingTeacher,
  APP_ROLES.student,
];

export const PAGE_ROLE_MAP: Record<string, AppRole[]> = {
  '/': [
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ],
  '/reports': [
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ],
  '/content-center': [APP_ROLES.principal, APP_ROLES.recruitmentTeacher],
  '/leads': [
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ],
  '/consultation': ALL_ROLES,
  '/courses': ALL_ROLES,
  '/courses/:id': ALL_ROLES,
  '/students': [
    APP_ROLES.principal,
    APP_ROLES.recruitmentTeacher,
    APP_ROLES.teachingTeacher,
  ],
  '/schedules': ALL_ROLES,
  '/permissions': [APP_ROLES.principal],
};
