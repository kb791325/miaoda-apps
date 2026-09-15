import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  MarketingImageUnderstandingOneOutput,
  MarketingMaterialDocParserOneOutput,
} from '@shared/plugin-types';
import { normalizeStream } from './ai-content';

export const IMAGE_UNDERSTANDING_PLUGIN_ID = 'marketing_image_understanding_1';
export const DOC_PARSER_PLUGIN_ID = 'marketing_material_doc_parser_1';

const IMAGE_QUESTION =
  '请提取这张图片中的关键营销信息，包括产品/服务内容、核心卖点、可见文字、场景氛围与风格特征，用于招生文案创作参考。';

const DOC_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'pptx',
  'xlsx',
  'csv',
  'txt',
  'md',
  'markdown',
  'html',
];

export const MATERIAL_TEXT_LIMIT = 2000;

type FileArrayInput = Array<string | File>;

interface ImageUnderstandingInput {
  image: FileArrayInput;
  question: string;
  [key: string]: unknown;
}

interface DocParserInput {
  file: FileArrayInput;
  [key: string]: unknown;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isDocFile(file: File): boolean {
  const ext: string = file.name.split('.').pop()?.toLowerCase() ?? '';
  return DOC_EXTENSIONS.includes(ext);
}

export async function parseImageMaterial(file: File): Promise<string> {
  const input: ImageUnderstandingInput = { image: [file], question: IMAGE_QUESTION };
  try {
    const streamResult = capabilityClient
      .load(IMAGE_UNDERSTANDING_PLUGIN_ID)
      .callStream<MarketingImageUnderstandingOneOutput>(
        'imageUnderstanding',
        input,
      );
    let text = '';
    for await (const chunk of normalizeStream(streamResult)) {
      const delta: unknown = chunk.content;
      if (typeof delta === 'string' && delta.length > 0) text += delta;
    }
    return text.trim();
  } catch (error) {
    const message: string =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('marketing image understanding failed', {
      pluginInstanceId: IMAGE_UNDERSTANDING_PLUGIN_ID,
      actionKey: 'imageUnderstanding',
      fileName: file.name,
      error: message,
    });
    throw error;
  }
}

export async function parseDocMaterial(file: File): Promise<string> {
  const input: DocParserInput = { file: [file] };
  try {
    const result = await capabilityClient
      .load(DOC_PARSER_PLUGIN_ID)
      .call<MarketingMaterialDocParserOneOutput>(
        'parseDocToMarkdown',
        input,
      );
    return (result.content ?? '').trim();
  } catch (error) {
    const message: string =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('marketing doc parse failed', {
      pluginInstanceId: DOC_PARSER_PLUGIN_ID,
      actionKey: 'parseDocToMarkdown',
      fileName: file.name,
      error: message,
    });
    throw error;
  }
}

export async function parseMaterialFile(file: File): Promise<string> {
  const raw: string = isImageFile(file)
    ? await parseImageMaterial(file)
    : await parseDocMaterial(file);
  return raw.length > MATERIAL_TEXT_LIMIT
    ? raw.slice(0, MATERIAL_TEXT_LIMIT)
    : raw;
}
