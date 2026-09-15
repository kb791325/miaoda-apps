import {
  sceneryCoverImg1,
  sceneryCoverImg2,
  sceneryCoverImg3,
  sceneryCoverImg4,
  sceneryCoverImg5,
  sceneryCoverImg6,
} from '@client/src/utils/img-resources/cover-placeholders';

const FALLBACK_COVERS: string[] = [
  sceneryCoverImg1,
  sceneryCoverImg2,
  sceneryCoverImg3,
  sceneryCoverImg4,
  sceneryCoverImg5,
  sceneryCoverImg6,
];

export const getCourseFallbackCover = (courseId: string): string => {
  let hash: number = 0;
  for (let i: number = 0; i < courseId.length; i += 1) {
    hash = (hash + courseId.charCodeAt(i)) % FALLBACK_COVERS.length;
  }
  return FALLBACK_COVERS[hash] ?? sceneryCoverImg1;
};
