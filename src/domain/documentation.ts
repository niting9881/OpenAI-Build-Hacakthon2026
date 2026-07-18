import { z } from "zod";

export const DocumentTypeSchema = z.enum(["serviceNow", "stakeholder", "jira", "incidentReport"]);
const GroundedDocumentSchema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(20).max(4000),
  citations: z.array(z.string().regex(/^E-\d{2}$/)).min(1),
  status: z.literal("draft")
}).strict();

export const DocumentationBundleSchema = z.object({
  investigationId: z.string().regex(/^INV-[A-Z0-9]{8}$/),
  generatedAt: z.string().datetime(),
  serviceNow: GroundedDocumentSchema,
  stakeholder: GroundedDocumentSchema,
  jira: GroundedDocumentSchema,
  incidentReport: GroundedDocumentSchema
}).strict();

export const DocumentationRequestSchema = z.object({ investigationId: z.string().regex(/^INV-[A-Z0-9]{8}$/) }).strict();
export const PublicationDecisionSchema = z.object({
  investigationId: z.string().regex(/^INV-[A-Z0-9]{8}$/),
  documentType: DocumentTypeSchema,
  decision: z.enum(["approved", "rejected"])
}).strict();

export type DocumentationBundle = z.infer<typeof DocumentationBundleSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
