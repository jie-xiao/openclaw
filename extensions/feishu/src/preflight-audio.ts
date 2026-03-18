/**
 * Feishu audio preflight transcription.
 * Transcribes voice notes before mention checking, allowing voice messages to trigger bot responses in group chats.
 */

import type { OpenClawConfig } from "../../../src/config/config.js";
import { logVerbose, shouldLogVerbose } from "../../../src/globals.js";
import { transcribeFirstAudio } from "../../../src/media-understanding/audio-preflight.js";

type FeishuAudioAttachment = {
  path: string;
  contentType?: string;
};

/**
 * Check if media list contains audio attachments
 */
function hasAudioAttachment(mediaList: FeishuAudioAttachment[] | undefined): boolean {
  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return false;
  }
  return mediaList.some(
    (att) => att.contentType?.startsWith("audio/") || att.contentType?.startsWith("voice/"),
  );
}

/**
 * Collect audio attachments from media list
 */
function collectAudioAttachments(
  mediaList: FeishuAudioAttachment[] | undefined,
): FeishuAudioAttachment[] {
  if (!Array.isArray(mediaList)) {
    return [];
  }
  return mediaList.filter(
    (att) => att.contentType?.startsWith("audio/") || att.contentType?.startsWith("voice/"),
  );
}

/**
 * Resolve Feishu preflight audio transcription for mention checking.
 * This allows voice notes in group chats with requireMention: true to trigger bot responses.
 *
 * @param params - Parameters containing message info and config
 * @returns Object with hasAudioAttachment, hasTypedText, and optional transcript
 */
export async function resolveFeishuPreflightAudioMentionContext(params: {
  /** The text content of the message */
  messageText?: string;
  /** Whether this is a direct message (no mention required) */
  isDirectMessage: boolean;
  /** Whether mention is required for this chat */
  shouldRequireMention: boolean;
  /** Number of mention regexes (indicates if @mention patterns exist) */
  mentionRegexCount: number;
  /** Media list from Feishu message */
  mediaList?: FeishuAudioAttachment[];
  /** OpenClaw configuration */
  cfg: OpenClawConfig;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}): Promise<{
  hasAudioAttachment: boolean;
  hasTypedText: boolean;
  transcript?: string;
}> {
  const {
    messageText,
    isDirectMessage,
    shouldRequireMention,
    mentionRegexCount,
    mediaList,
    cfg,
    abortSignal,
  } = params;

  const audioAttachments = collectAudioAttachments(mediaList);
  const hasAudioAttachment = audioAttachments.length > 0;
  const hasTypedText = Boolean(messageText?.trim());

  // Need preflight transcription when:
  // - Not a direct message (group chat)
  // - Mention is required
  // - Has audio attachment
  // - No typed text (relying on voice)
  // - Mention regex patterns exist
  const needsPreflightTranscription =
    !isDirectMessage &&
    shouldRequireMention &&
    hasAudioAttachment &&
    !hasTypedText &&
    mentionRegexCount > 0;

  let transcript: string | undefined;

  if (needsPreflightTranscription) {
    if (abortSignal?.aborted) {
      return { hasAudioAttachment, hasTypedText };
    }

    try {
      // Get audio file paths
      const audioPaths = audioAttachments
        .map((att) => att.path)
        .filter((path): path is string => typeof path === "string" && path.length > 0);

      if (audioPaths.length > 0) {
        if (shouldLogVerbose()) {
          logVerbose(`feishu: preflight transcribing ${audioPaths.length} audio attachment(s)`);
        }

        transcript = await transcribeFirstAudio({
          ctx: {
            MediaPaths: audioPaths,
            MediaTypes: audioAttachments.map((att) => att.contentType).filter((t): t is string => Boolean(t)),
          },
          cfg,
          agentDir: undefined,
        });

        if (abortSignal?.aborted) {
          transcript = undefined;
        }

        if (transcript && shouldLogVerbose()) {
          logVerbose(
            `feishu: preflight transcription complete, got ${transcript.length} chars`,
          );
        }
      }
    } catch (err) {
      logVerbose(`feishu: audio preflight transcription failed: ${String(err)}`);
    }
  }

  return {
    hasAudioAttachment,
    hasTypedText,
    transcript,
  };
}
