import { capabilityClient } from '@lark-apaas/client-toolkit';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  AdmissionContentCreationOneInput,
  AdmissionContentCreationOneOutput,
} from '@shared/plugin-types';

export const ADMISSION_CONTENT_CREATION_PLUGIN_ID =
  'admission_content_creation_1';

const ACTION_KEY_TEXT_GENERATE = 'textGenerate';

type AnyRecord = Record<string, unknown>;

export function isAsyncIterable(
  value: unknown,
): value is AsyncIterable<AnyRecord> {
  return (
    !!value &&
    typeof (value as AsyncIterable<AnyRecord>)[Symbol.asyncIterator] ===
      'function'
  );
}

export function normalizeStream(
  resultOrStream: unknown,
): AsyncIterable<AnyRecord> {
  if (isAsyncIterable(resultOrStream)) {
    return resultOrStream;
  }
  if (
    resultOrStream &&
    typeof resultOrStream === 'object' &&
    'output' in (resultOrStream as AnyRecord) &&
    isAsyncIterable((resultOrStream as AnyRecord).output)
  ) {
    return (resultOrStream as AnyRecord).output as AsyncIterable<AnyRecord>;
  }
  throw new Error('Invalid callStream result: cannot find AsyncIterable stream');
}

export interface GenerateMarketingContentOptions {
  input: AdmissionContentCreationOneInput;
  onChunk?: (delta: string, fullText: string) => void;
}

export async function generateMarketingContent(
  options: GenerateMarketingContentOptions,
): Promise<string> {
  const { input, onChunk } = options;
  try {
    const streamResult = capabilityClient
      .load(ADMISSION_CONTENT_CREATION_PLUGIN_ID)
      .callStream<AdmissionContentCreationOneOutput>(
        ACTION_KEY_TEXT_GENERATE,
        { ...input },
      );
    const stream: AsyncIterable<AnyRecord> = normalizeStream(streamResult);

    let fullText = '';
    for await (const chunk of stream) {
      const delta: unknown = chunk.content;
      if (typeof delta === 'string' && delta.length > 0) {
        fullText += delta;
        onChunk?.(delta, fullText);
      }
    }
    return fullText;
  } catch (error) {
    const message: string =
      error instanceof Error ? error.message : 'Unknown error';
    logger.error('ai-text-generate plugin call failed', {
      pluginInstanceId: ADMISSION_CONTENT_CREATION_PLUGIN_ID,
      actionKey: ACTION_KEY_TEXT_GENERATE,
      outputMode: 'stream',
      inputKeys: Object.keys(input),
      error: message,
    });
    throw error;
  }
}
