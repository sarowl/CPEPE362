import { ShieldAlert, Phone, MapPin } from "lucide-react";

interface EscalationScreenProps {
  onBack: () => void;
}

const EscalationScreen = ({ onBack }: EscalationScreenProps) => {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="bg-destructive/10 rounded-full p-6">
        <ShieldAlert className="h-12 w-12 text-destructive" />
      </div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-foreground">
          This repair needs a professional
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Based on the complexity and safety requirements of this step,
          we recommend having a certified mechanic complete the remaining work.
          This ensures your safety and the reliability of the repair.
        </p>
      </div>

      <div className="w-full space-y-3">
        <div className="step-card flex items-center gap-4">
          <Phone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Find a mechanic nearby</p>
            <p className="text-xs text-muted-foreground">Share your diagnosis for faster service</p>
          </div>
        </div>

        <div className="step-card flex items-center gap-4">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Auto shops in your area</p>
            <p className="text-xs text-muted-foreground">Based on your location</p>
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Go back to repair steps
      </button>
    </div>
  );
};

export default EscalationScreen;
