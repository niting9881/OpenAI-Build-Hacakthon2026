import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30_000,
  maxRetries: 0
});

try {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL,
    input: "Reply with exactly OK",
    max_output_tokens: 20
  });
  console.log(JSON.stringify({
    success: true,
    model: response.model,
    status: response.status,
    hasOutput: Boolean(response.output_text)
  }));
} catch (error) {
  console.log(JSON.stringify({
    success: false,
    status: error.status ?? null,
    code: error.code ?? null,
    type: error.type ?? null,
    message: String(error.message).replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]")
  }));
  process.exitCode = 1;
}
