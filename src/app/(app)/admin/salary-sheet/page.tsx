import { FadeIn } from "@/components/motion-div";
import { SalaryCalculator } from "./salary-calculator";

export default function SalarySheetPage() {
  return (
    <div className="space-y-5">
      <FadeIn>
        <div>
          <h1 className="ds-h1">Salary Structure Generator</h1>
          <p className="ds-body mt-1">
            Auto-calculates PF, ESI, gratuity, PT, insurance, and take-home
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <SalaryCalculator />
      </FadeIn>
    </div>
  );
}
