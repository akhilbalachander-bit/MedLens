import { Suspense } from "react";
import { ScanPageInner } from "./ScanPageInner";

export const metadata = { title: "Scan Documents — MedLens" };

export default function ScanPage() {
  return (
    <Suspense>
      <ScanPageInner />
    </Suspense>
  );
}
