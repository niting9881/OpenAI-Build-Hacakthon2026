import "server-only";
import type { ReasoningProvider } from "./provider";
import { DeterministicReasoningProvider } from "./deterministic-provider";

export async function createReasoningProvider(): Promise<ReasoningProvider> {
  const mode = process.env.OPSPILOT_REASONING_MODE ?? "deterministic";
  if (mode === "deterministic") return new DeterministicReasoningProvider();
  if (mode !== "live") throw new Error(`Unsupported OPSPILOT_REASONING_MODE: ${mode}`);
  const { LiveOpenAIReasoningProvider } = await import("./live-openai-provider");
  return new LiveOpenAIReasoningProvider();
}
