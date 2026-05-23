import { Banner } from "@/components";

export function PreviewBanner() {
  return (
    <div className="px-8 pt-6">
      <Banner tone="warning">
        Preview — this area shows sample data. Live functionality lands in a later phase.
      </Banner>
    </div>
  );
}
