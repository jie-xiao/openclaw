import fs from "node:fs";
import type {
  IStorageProvider,
  ICryptoStorageProvider,
  MatrixClient,
} from "@vector-im/matrix-bot-sdk";
import http from "node:http";
import https from "node:https";
import { ensureMatrixCryptoRuntime } from "../deps.js";
import { loadMatrixSdk } from "../sdk-runtime.js";
import { ensureMatrixSdkLoggingConfigured } from "./logging.js";
import {
  maybeMigrateLegacyStorage,
  resolveMatrixStoragePaths,
  writeStorageMeta,
} from "./storage.js";

// Optimized HTTP agents for keep-alive connections
// These settings are tuned for better performance in Windows environments
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

const keepAliveHttpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
});

// Flag to track if we've configured the request function
let requestFunctionConfigured = false;

function configureOptimizedRequestFn() {
  if (requestFunctionConfigured) {
    return;
  }

  try {
    const req = require("request");

    // Create a wrapped request function with optimized agent settings
    const optimizedRequest = req.defaults({
      agent: (_parsedURL: any) => {
        // Use HTTPS agent for https:// URLs, HTTP agent otherwise
        return _parsedURL.protocol === "https:" ? keepAliveHttpsAgent : keepAliveAgent;
      },
      forever: true,
      pool: {
        maxSockets: 50,
      },
    });

    // Set the optimized request function in the Matrix SDK
    const { setRequestFn, LogService } = loadMatrixSdk();
    setRequestFn(optimizedRequest);
    requestFunctionConfigured = true;

    LogService.info("MatrixClientLite", "Optimized HTTP Agent keepAlive configured");
  } catch (err) {
    const { LogService } = loadMatrixSdk();
    LogService.warn("MatrixClientLite", "Failed to configure optimized HTTP Agent:", err);
  }
}

function sanitizeUserIdList(input: unknown, label: string): string[] {
  const LogService = loadMatrixSdk().LogService;
  if (input == null) {
    return [];
  }
  if (!Array.isArray(input)) {
    LogService.warn(
      "MatrixClientLite",
      `Expected ${label} list to be an array, got ${typeof input}`,
    );
    return [];
  }
  const filtered = input.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
  if (filtered.length !== input.length) {
    LogService.warn(
      "MatrixClientLite",
      `Dropping ${input.length - filtered.length} invalid ${label} entries from sync payload`,
    );
  }
  return filtered;
}

export async function createMatrixClient(params: {
  homeserver: string;
  userId: string;
  accessToken: string;
  encryption?: boolean;
  localTimeoutMs?: number;
  accountId?: string | null;
}): Promise<MatrixClient> {
  await ensureMatrixCryptoRuntime();

  // Configure optimized HTTP agent before loading SDK
  configureOptimizedRequestFn();

  const { MatrixClient, SimpleFsStorageProvider, RustSdkCryptoStorageProvider, LogService } =
    loadMatrixSdk();
  ensureMatrixSdkLoggingConfigured();
  const env = process.env;

  // Create storage provider
  const storagePaths = resolveMatrixStoragePaths({
    homeserver: params.homeserver,
    userId: params.userId,
    accessToken: params.accessToken,
    accountId: params.accountId,
    env,
  });
  maybeMigrateLegacyStorage({ storagePaths, env });
  fs.mkdirSync(storagePaths.rootDir, { recursive: true });
  const storage: IStorageProvider = new SimpleFsStorageProvider(storagePaths.storagePath);

  // Create crypto storage if encryption is enabled
  let cryptoStorage: ICryptoStorageProvider | undefined;
  if (params.encryption) {
    fs.mkdirSync(storagePaths.cryptoPath, { recursive: true });

    try {
      const { StoreType } = await import("@matrix-org/matrix-sdk-crypto-nodejs");
      cryptoStorage = new RustSdkCryptoStorageProvider(storagePaths.cryptoPath, StoreType.Sqlite);
    } catch (err) {
      LogService.warn(
        "MatrixClientLite",
        "Failed to initialize crypto storage, E2EE disabled:",
        err,
      );
    }
  }

  writeStorageMeta({
    storagePaths,
    homeserver: params.homeserver,
    userId: params.userId,
    accountId: params.accountId,
  });

  const client = new MatrixClient(params.homeserver, params.accessToken, storage, cryptoStorage);

  if (client.crypto) {
    const originalUpdateSyncData = client.crypto.updateSyncData.bind(client.crypto);
    client.crypto.updateSyncData = async (
      toDeviceMessages,
      otkCounts,
      unusedFallbackKeyAlgs,
      changedDeviceLists,
      leftDeviceLists,
    ) => {
      const safeChanged = sanitizeUserIdList(changedDeviceLists, "changed device list");
      const safeLeft = sanitizeUserIdList(leftDeviceLists, "left device list");
      try {
        return await originalUpdateSyncData(
          toDeviceMessages,
          otkCounts,
          unusedFallbackKeyAlgs,
          safeChanged,
          safeLeft,
        );
      } catch (err) {
        const message = typeof err === "string" ? err : err instanceof Error ? err.message : "";
        if (message.includes("Expect value to be String")) {
          LogService.warn(
            "MatrixClientLite",
            "Ignoring malformed device list entries during crypto sync",
            message,
          );
          return;
        }
        throw err;
      }
    };
  }

  return client;
}
