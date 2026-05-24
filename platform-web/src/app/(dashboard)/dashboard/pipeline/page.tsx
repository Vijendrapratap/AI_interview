import { PageHeader } from "@/components";
import { PipelineBoardClient, type PipelineBoardData } from "@/components/PipelineBoardClient";
import { getPipeline } from "@/lib/data/applications";

export default async function PipelinePage() {
  const pipeline = await getPipeline();

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        eyebrow="Recruiting"
        title="Hiring Pipeline"
        subtitle="Kanban view — move candidates from application to hire with AI context visible."
      />

      <PipelineBoardClient initialPipeline={pipeline as PipelineBoardData} />
    </div>
  );
}
