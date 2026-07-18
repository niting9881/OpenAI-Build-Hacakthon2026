import type { Incident } from "./investigation";

export const customer360Incident: Incident = {
  id: "INC-1042",
  title: "Customer360 pipeline failed during S3 input read",
  pipeline: "Customer360 Daily Refresh",
  priority: "P2",
  impact: "Customer profiles and morning analytics are delayed for operations teams.",
  failureTime: "2026-07-15T13:42:00.000Z",
  assignmentGroup: "Data Platform Operations",
  initialError: "AccessDenied while reading s3://customer360-input/landing/2026-07-15/",
  status: "New"
};
