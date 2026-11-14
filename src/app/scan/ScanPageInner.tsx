"use client";

import { useSearchParams } from "next/navigation";
import { Camera, Lightbulb } from "lucide-react";
import { ScanFlow } from "@/components/scan/ScanFlow";
import { Card } from "@/components/ui";
import { useTr } from "@/lib/i18n";

export function ScanPageInner() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const tr = useTr();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-4xl font-normal tracking-wide text-ink sm:text-5xl">
          <Camera className="h-7 w-7 text-brand-700" /> {tr("Scan Documents")}
        </h1>
        <p className="mt-1 text-ink-soft">
          {tr("Scan or upload a prescription bottle, medication label or hospital discharge papers. You can add several pages.")}
        </p>
      </div>
      <ScanFlow variant="hero" initialMode={mode === "camera" || mode === "upload" ? mode : null} />
      <Card>
        <h2 className="mb-2 flex items-center gap-2 font-semibold text-ink">
          <Lightbulb className="h-5 w-5 text-amber-600" /> {tr("Tips for a clear scan")}
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
          <li>{tr("Use good light and avoid shadows or glare.")}</li>
          <li>{tr("Fit the whole page in the frame. Hold the phone straight above it.")}</li>
          <li>{tr("For a pill bottle, take one photo for each side of the label.")}</li>
          <li>{tr("Scan every page of your discharge papers, in order.")}</li>
          <li>{tr("If something is hard to read, MedLens will flag it so you can check it with your pharmacist.")}</li>
        </ul>
      </Card>
    </div>
  );
}
