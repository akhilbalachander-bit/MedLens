import { Suspense } from "react";
import { ResultsDashboard } from "@/components/results/ResultsDashboard";

export const metadata = { title: "Your results — MedLens" };

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsDashboard />
    </Suspense>
  );
}
