import { z } from "zod";
import { EvidenceSchema, type Evidence } from "@/domain/evidence";

export type ToolContext = {
  investigationId: string;
  incidentId: string;
  taskId: string;
};

type ToolDefinition<TInput extends z.ZodType> = {
  name: string;
  description: string;
  mode: "read";
  inputSchema: TInput;
  timeoutMs: number;
  execute: (input: z.infer<TInput>, context: ToolContext) => Promise<Evidence[]>;
};

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition<z.ZodType>>();
  constructor(private readonly maxResultBytes = 64_000) {}

  register<TInput extends z.ZodType>(definition: ToolDefinition<TInput>) {
    if (definition.mode !== "read") throw new Error("Stage 2 registry accepts read-only tools only.");
    if (this.tools.has(definition.name)) throw new Error(`Duplicate tool: ${definition.name}`);
    this.tools.set(definition.name, definition as ToolDefinition<z.ZodType>);
  }

  list() {
    return [...this.tools.values()].map(({ name, description, mode }) => ({ name, description, mode }));
  }

  async execute(name: string, input: unknown, context: ToolContext): Promise<Evidence[]> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool is not allowlisted: ${name}`);
    const parsed = tool.inputSchema.safeParse(input);
    if (!parsed.success) throw new Error(`Invalid arguments for tool: ${name}`);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const evidence = await Promise.race([
        tool.execute(parsed.data, context),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Tool timed out: ${name}`)), tool.timeoutMs);
        })
      ]);
      const validated = z.array(EvidenceSchema).parse(evidence);
      if (Buffer.byteLength(JSON.stringify(validated), "utf8") > this.maxResultBytes) {
        throw new Error(`Tool result exceeds size limit: ${name}`);
      }
      return validated;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export type ReadToolDefinition<TInput extends z.ZodType> = ToolDefinition<TInput>;
