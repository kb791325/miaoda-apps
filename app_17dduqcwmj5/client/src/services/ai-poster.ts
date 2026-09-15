import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdmissionPosterGenerationOneOutput,
  CateringTrainingPosterGenerationOneOutput,
} from '@shared/plugin-types';

type ImageToImageInput = {
  reference_images: Array<string | File>;
  admission_title: string;
  admission_content: string;
};

export interface PosterGenerateParams {
  title: string;
  body: string;
  referenceFiles?: File[];
}

export const generatePosterImages = async (
  params: PosterGenerateParams,
): Promise<string[]> => {
  const bodyExcerpt: string = params.body.slice(0, 500);
  const refs: File[] = (params.referenceFiles ?? []).slice(0, 3);
  try {
    if (refs.length > 0) {
      const input: ImageToImageInput = {
        reference_images: refs,
        admission_title: params.title,
        admission_content: bodyExcerpt,
      };
      const result = await capabilityClient
        .load('admission_poster_generation_1')
        .call<AdmissionPosterGenerationOneOutput>('imageToImage', input);
      return result.images ?? [];
    }
    const result = await capabilityClient
      .load('catering_training_poster_generation_1')
      .call<CateringTrainingPosterGenerationOneOutput>('textToImage', {
        training_content: `${params.title}\n${bodyExcerpt}`,
      });
    return result.images ?? [];
  } catch (error) {
    logger.error('生成宣传图片失败', error);
    throw error;
  }
};
