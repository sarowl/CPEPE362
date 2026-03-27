import { useState } from "react";
import { Upload, Camera, Check, AlertTriangle } from "lucide-react";

interface VisualAssistScreenProps {
  onConfirm: () => void;
}

const VisualAssistScreen = ({ onConfirm }: VisualAssistScreenProps) => {
  const [uploaded, setUploaded] = useState(false);
  const [verified, setVerified] = useState<"none" | "checking" | "ok" | "warning">("none");

  const handleUpload = () => {
    setUploaded(true);
    setVerified("checking");
    setTimeout(() => setVerified("ok"), 2000);
  };

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Visual Check</h2>
        <p className="text-sm text-muted-foreground">
          Take a photo of the completed step for verification
        </p>
      </div>

      {/* Upload area */}
      {!uploaded ? (
        <button
          onClick={handleUpload}
          className="w-full h-56 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-colors"
        >
          <div className="bg-muted rounded-full p-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Tap to take a photo</p>
            <p className="text-xs text-muted-foreground mt-1">or upload from gallery</p>
          </div>
        </button>
      ) : (
        <div className="space-y-4 animate-slide-up">
          {/* Simulated uploaded image with overlay */}
          <div className="relative rounded-xl overflow-hidden border border-border">
            <div className="w-full h-56 bg-muted flex items-center justify-center">
              <Upload className="h-12 w-12 text-muted-foreground/30" />
            </div>

            {/* Analysis overlay */}
            {verified === "checking" && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0s" }} />
                    <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.3s" }} />
                    <div className="w-2 h-2 rounded-full bg-primary thinking-pulse" style={{ animationDelay: "0.6s" }} />
                  </div>
                  <span className="text-sm text-muted-foreground">Analyzing image...</span>
                </div>
              </div>
            )}

            {verified === "ok" && (
              <div className="absolute top-3 right-3 bg-success text-success-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Looks correct
              </div>
            )}

            {verified === "warning" && (
              <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Check alignment
              </div>
            )}
          </div>

          {/* Confirmation */}
          {verified === "ok" && (
            <div className="space-y-3 animate-slide-up">
              <div className="success-card flex items-start gap-3">
                <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Installation looks correct. Ready to proceed to the next step.
                </p>
              </div>
              <button
                onClick={onConfirm}
                className="step-confirm-btn bg-primary text-primary-foreground"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisualAssistScreen;
