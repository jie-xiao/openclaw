import { wrapFetchWithAbortSignal } from "openclaw/plugin-sdk/infra-runtime";
import { danger } from "openclaw/plugin-sdk/runtime-env";
import type { RuntimeEnv } from "openclaw/plugin-sdk/runtime-env";
import { EnvHttpProxyAgent, ProxyAgent, fetch as undiciFetch, setGlobalDispatcher } from "undici";

/**
 * Built-in default domains to bypass the Discord proxy.
 * These are common API providers that should not be routed through the proxy.
 * This ensures memory plugins (LanceDB with OpenAI/GLM embeddings) work correctly.
 */
const BUILTIN_PROXY_BYPASS = [
  // OpenAI
  "api.openai.com",
  // Anthropic
  "api.anthropic.com",
  // Azure OpenAI
  "openai.azure.com",
  // Cohere
  "api.cohere.ai",
  // Mistral
  "api.mistral.ai",
  // Perplexity
  "api.perplexity.ai",
  // Zhipu AI (GLM)
  "open.bigmodel.cn",
  "zig-api.bigmodel.cn",
  "aipipe.org",
];

/**
 * Build the complete bypass list from config and environment.
 */
function buildNoProxyValue(configBypass?: string): string {
  const existingNoProxy = process.env.NO_PROXY ?? process.env.no_proxy ?? "";
  const builtinBypass = BUILTIN_PROXY_BYPASS.join(",");

  let bypassList: string[];
  if (configBypass?.trim()) {
    const configList = configBypass.split(",").map((s) => s.trim()).filter(Boolean);
    bypassList = [...new Set([...configList, ...BUILTIN_PROXY_BYPASS])];
  } else {
    bypassList = BUILTIN_PROXY_BYPASS;
  }

  const bypassValue = bypassList.join(",");

  return existingNoProxy ? `${existingNoProxy},${bypassValue}` : bypassValue;
}

let globalProxyApplied = false;

/**
 * Apply global proxy dispatcher for undici.
 * This ensures all fetch requests (including @buape/carbon's internal REST client)
 * use the configured proxy.
 *
 * Uses EnvHttpProxyAgent to support NO_PROXY bypass for common API providers.
 *
 * @param proxyUrl - The proxy URL to use
 * @param runtime - Runtime environment for logging
 * @param proxyBypass - Optional comma-separated list of domains to bypass (from config)
 */
export function applyDiscordGlobalProxy(
  proxyUrl: string | undefined,
  runtime: RuntimeEnv,
  proxyBypass?: string,
): void {
  const proxy = proxyUrl?.trim();
  if (!proxy) {
    return;
  }
  if (globalProxyApplied) {
    return;
  }
  try {
    const noProxyValue = buildNoProxyValue(proxyBypass);

    const agent = new EnvHttpProxyAgent({
      httpProxy: proxy,
      httpsProxy: proxy,
      noProxy: noProxyValue,
    });
    setGlobalDispatcher(agent);
    globalProxyApplied = true;
    runtime.log?.(`discord: global rest proxy enabled (bypass: ${noProxyValue})`);
  } catch (err) {
    runtime.error?.(danger(`discord: failed to set global proxy: ${String(err)}`));
  }
}

export function resolveDiscordRestFetch(
  proxyUrl: string | undefined,
  runtime: RuntimeEnv,
  proxyBypass?: string,
): typeof fetch {
  const proxy = proxyUrl?.trim();
  if (!proxy) {
    return fetch;
  }
  try {
    const noProxyValue = buildNoProxyValue(proxyBypass);

    const agent = new EnvHttpProxyAgent({
      httpProxy: proxy,
      httpsProxy: proxy,
      noProxy: noProxyValue,
    });
    const fetcher = ((input: RequestInfo | URL, init?: RequestInit) =>
      undiciFetch(input as string | URL, {
        ...(init as Record<string, unknown>),
        dispatcher: agent,
      }) as unknown as Promise<Response>) as typeof fetch;
    runtime.log?.("discord: rest proxy enabled");
    return wrapFetchWithAbortSignal(fetcher);
  } catch (err) {
    runtime.error?.(danger(`discord: invalid rest proxy: ${String(err)}`));
    return fetch;
  }
}
