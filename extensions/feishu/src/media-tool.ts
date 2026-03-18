import { Type } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { listEnabledFeishuAccounts } from "./accounts.js";
import {
  createFeishuToolClient,
  resolveAnyEnabledFeishuToolsConfig,
} from "./tool-account.js";
import { downloadImageFeishu, downloadMessageResourceFeishu } from "./media.js";
import type { FeishuToolsConfig } from "./types.js";

// ============ Schema ============

export const FeishuMediaSchema = Type.Union([
  // Download image using image_key
  Type.Object({
    action: Type.Literal("download"),
    imageKey: Type.String({ description: "Image key (img_xxx) from Feishu message" }),
    accountId: Type.Optional(
      Type.String({ description: "Feishu account ID (optional, uses default if not provided)" }),
    ),
  }),
  // Download file using message_id and file_key
  Type.Object({
    action: Type.Literal("download"),
    messageId: Type.String({ description: "Message ID (om_xxx) containing the file" }),
    fileKey: Type.String({ description: "File key (file_xxx) from Feishu message" }),
    type: Type.Union([
      Type.Literal("image"),
      Type.Literal("file"),
    ], { description: "Type of the file to download" }),
    accountId: Type.Optional(
      Type.String({ description: "Feishu account ID (optional, uses default if not provided)" }),
    ),
  }),
]);

type FeishuMediaParams = {
  action: "download";
  imageKey?: string;
  messageId?: string;
  fileKey?: string;
  type?: "image" | "file";
  accountId?: string;
};

// ============ Tool Registration ============

export function registerFeishuMediaTools(api: OpenClawPluginApi) {
  if (!api.config) {
    api.logger.debug?.("feishu_media: No config available, skipping media tools");
    return;
  }

  // Check if any account is configured
  const accounts = listEnabledFeishuAccounts(api.config);
  if (accounts.length === 0) {
    api.logger.debug?.("feishu_media: No Feishu accounts configured, skipping media tools");
    return;
  }

  // Register if enabled on any account
  const toolsCfg = resolveAnyEnabledFeishuToolsConfig(accounts);

  if (!toolsCfg.media) {
    api.logger.debug?.("feishu_media: Media tools disabled in config");
    return;
  }

  api.registerTool(
    (ctx) => {
      const defaultAccountId = ctx.agentAccountId;
      return {
        name: "feishu_media",
        label: "Feishu Media",
        description:
          "Download media (images/files) from Feishu messages. Use imageKey for images, or messageId+fileKey+type for files.",
        parameters: FeishuMediaSchema,
        async execute(_toolCallId, params) {
          const p = params as FeishuMediaParams;
          try {
            const client = createFeishuToolClient({
              api,
              executeParams: p,
              defaultAccountId,
            });

            // Determine download type: imageKey takes priority, otherwise use messageId+fileKey+type
            if (p.imageKey) {
              const result = await downloadImageFeishu({
                cfg: api.config!,
                imageKey: p.imageKey,
                accountId: p.accountId,
              });
              return {
                content: [
                  {
                    type: "blob" as const,
                    blob: result.buffer,
                    mimeType: result.contentType || "image/jpeg",
                  },
                ],
                details: {
                  success: true,
                  type: "image",
                  size: result.buffer.length,
                  contentType: result.contentType,
                },
              };
            } else if (p.messageId && p.fileKey && p.type) {
              const result = await downloadMessageResourceFeishu({
                cfg: api.config!,
                messageId: p.messageId,
                fileKey: p.fileKey,
                type: p.type,
                accountId: p.accountId,
              });
              return {
                content: [
                  {
                    type: "blob" as const,
                    blob: result.buffer,
                    mimeType: result.contentType || (p.type === "image" ? "image/jpeg" : "application/octet-stream"),
                    filename: result.fileName,
                  },
                ],
                details: {
                  success: true,
                  type: p.type,
                  size: result.buffer.length,
                  contentType: result.contentType,
                  fileName: result.fileName,
                },
              };
            } else {
              return {
                content: [],
                details: {
                  error: "Invalid parameters: provide either imageKey, or messageId+fileKey+type",
                },
              };
            }
          } catch (err) {
            return {
              content: [],
              details: {
                error: err instanceof Error ? err.message : String(err),
              },
            };
          }
        },
      };
    },
    { name: "feishu_media" },
  );

  api.logger.info?.("feishu_media: Registered feishu_media tool");
}
