import { CheckCircle2, Calendar, RotateCcw, ChevronRight } from "lucide-react";
import Image from "next/image";

interface PostRepairScreenProps {
  onRestart: () => void;
}

const PostRepairScreen = ({ onRestart }: PostRepairScreenProps) => {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      {/* Success image */}
      <div className="w-24 h-24 rounded-full overflow-hidden">
        <Image 
        src="/success-check.jpg" 
        alt="Repair complete" 
        width={96} 
        height={96} 
        className="w-full h-full object-cover"
        />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Repair Complete</h2>
        <p className="text-sm text-muted-foreground">
          Brake pad replacement — logged successfully
        </p>
      </div>

      {/* Post-repair checks */}
      <div className="w-full space-y-3">
        <div className="step-card">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm font-medium text-foreground">Post-repair check</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pump the brake pedal several times before driving. The first few presses may feel soft —
            this is normal. Test at low speed in a safe area.
          </p>
        </div>

        {/* Next maintenance */}
        <div className="step-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Next maintenance</p>
                <p className="text-xs text-muted-foreground">Brake fluid flush — 30,000 mi</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Restart */}
      <button
        onClick={onRestart}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Start a new repair
      </button>
    </div>
  );
};

export default PostRepairScreen;
