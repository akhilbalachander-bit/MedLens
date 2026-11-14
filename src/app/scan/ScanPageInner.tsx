"use client";

import { useSearchParams } from "next/navigation";
import { Camera, Lightbulb } from "lucide-react";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { Card } from "@/components/ui";

export function ScanPageInner() {
  const params = useSearchParams();
  const mode = params.get("mode");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Camera className="h-7 w-7 text-brand-700" /> Scan Documents
        </h1>
        <p className="mt-1 text-ink-soft">
          Scan or upload a prescription bottle, medication label or hospital discharge papers. You can add several pages.
        </p>
      </div>
      <ScanFlow variant="hero" initialMode={mode === "camera" || mode === "upload" ? mode : null} />
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
          <Lightbulb className="h-5 w-5 text-amber-600" /> Tips for a clear scan
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>Use good light and avoid shadows or glare.</li>
          <li>Fit the whole page in the frame. Hold the phone straight above it.</li>
          <li>For a pill bottle, take one photo for each side of the label.</li>
          <li>Scan every page of your discharge papers, in order.</li>
          <li>If something is hard to read, MedLens will flag it so you can check it with your pharmacist.</li>
        </ul>
      </Card>
    </div>
  );
}
