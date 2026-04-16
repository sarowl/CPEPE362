// ============================================================
// AIRepairFlow/Screens/EscalationScreen.tsx — IMPORTED FROM Folder_B
//
// Escalation path in the AI repair flow when user cannot self-repair.
// Features:
//  - Calls /api/find_mechanics (Geoapify) to suggest nearby mechanics
//  - Displays a list of nearby service centers with addresses
//  - Option to go back and retry the repair
// ============================================================
import { useState } from "react";
import {
  ShieldAlert,
  MapPin,
  ChevronLeft,
  Loader2,
  Star,
  Phone,
  Navigation,
  AlertCircle,
  Search,
  CheckCircle2,
  Wrench,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mechanic {
  place_id: string;
  name: string;
  vicinity: string;
  rating?: number | null;
  user_ratings_total?: number | null;
  opening_hours?: { open_now: boolean } | null;
  formatted_phone_number?: string | null;
  distance_meters?: number | null;
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface EscalationScreenProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mapsDirectionsUrl = (lat: number, lng: number, name: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(name)}`;

// ─── Component ────────────────────────────────────────────────────────────────

const EscalationScreen = ({ onBack }: EscalationScreenProps) => {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const findMechanics = () => {
    setError(null);
    setLoading(true);
    setSearched(true);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch("/api/find_mechanics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lng: longitude }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data?.error ?? `Server error ${res.status}`);
          }

          const data = await res.json();
          if (!Array.isArray(data.mechanics) || data.mechanics.length === 0) {
            setError("No mechanics found nearby.");
          } else {
            setMechanics(data.mechanics);
          }
        } catch (err: any) {
          setError(err.message ?? "Failed to fetch nearby mechanics.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError("Location access denied.");
      },
      { timeout: 10000 }
    );
  };

  // ── Idle State ──────────────────────────────────────────────────────────────
  const renderIdle = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto text-center">
      <div className="relative">
        <div className="bg-destructive/10 rounded-full p-8">
          <Wrench className="h-14 w-14 text-destructive" />
        </div>
        <div className="absolute -top-2 -right-2 bg-destructive text-white p-1.5 rounded-full">
          <ShieldAlert className="h-5 w-5" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Safety Escalation</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This repair requires professional tools and calibration. Let's find a certified shop to finish the job.
        </p>
      </div>
      <button
        onClick={findMechanics}
        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center gap-3 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <MapPin className="h-5 w-5" />
        Find Nearby Shops
      </button>
    </div>
  );

  const renderResults = () => (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Nearby Shops</h2>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Professional shops near your location
          </p>
        </div>
        <button
          onClick={() => { setMechanics([]); setSearched(false); }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-full hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Search className="h-4 w-4" />
          New Search
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mechanics.map((m) => (
          <div
            key={m.place_id}
            className="group bg-card border border-border rounded-[2rem] p-6 flex flex-col justify-between hover:border-primary/30 transition-all duration-300"
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                    {m.name}
                  </h3>
                  <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{m.vicinity}</span>
                </p>
              </div>

              {m.distance_meters != null && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary/50 w-fit px-2 py-1 rounded">
                   {(m.distance_meters / 1000).toFixed(1)} km away
                </div>
              )}
            </div>

            <div className="gap-3 mt-8">
              <a
                href={mapsDirectionsUrl(m.geometry.location.lat, m.geometry.location.lng, m.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-bold text-xs transition-all shadow-lg shadow-primary/10"
              >
                <Navigation className="h-4 w-4" />
                Directions
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Nav */}
      <div className="pt-8 border-t border-border flex justify-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Instructions
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-6 py-12 w-full max-w-7xl mx-auto min-h-screen">
      {!searched && renderIdle()}
      
      {searched && loading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Mapping nearest repair centers</p>
        </div>
      )}

      {searched && !loading && error && (
        <div className="max-w-md mx-auto text-center space-y-6 py-12">
          <div className="bg-destructive/10 border-2 border-destructive/20 p-8 rounded-[2.5rem]">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="font-bold text-foreground leading-tight">{error}</p>
          </div>
          <button onClick={findMechanics} className="font-black text-xs uppercase tracking-widest border-b-2 border-primary pb-1">Try Again</button>
        </div>
      )}

      {searched && !loading && !error && mechanics.length > 0 && renderResults()}
    </div>
  );
};

export default EscalationScreen;