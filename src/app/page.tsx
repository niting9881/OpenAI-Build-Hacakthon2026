import { customer360Incident } from "@/domain/fixtures";
import { IncidentWorkspace } from "@/components/incident-workspace";

export default function Home() {
  return <IncidentWorkspace incident={customer360Incident} />;
}
