interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  label: string;
}

const ProgressIndicator = ({ currentStep, totalSteps, label }: ProgressIndicatorProps) => {
  // Ensure we don't divide by zero and handle step progress correctly
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <div className="w-full px-4 py-3 bg-background border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">
          {label}
        </span>
        <span className="text-xs font-mono font-bold text-primary">
          {currentStep} / {totalSteps}
        </span>
      </div>

      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-in-out shadow-[0_0_8px_rgba(249,115,22,0.3)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressIndicator;