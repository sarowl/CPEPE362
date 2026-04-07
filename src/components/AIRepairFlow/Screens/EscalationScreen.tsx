//src\components\AIRepairFlow\Screens\EscalationScreen.tsx
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
  distance_meters?: number | null;          // ← new
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface EscalationScreenProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ratingStars = (rating: number) => {
  const full = Math.floor(rating);
  return Array.from({ length: 5 }, (_, i) => i < full);
};

const mapsDirectionsUrl = (lat: number, lng: number, name: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${name}`;

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
            setError("No mechanics found near your location. Try expanding your search area.");
          } else {
            setMechanics(data.mechanics);
          }
        } catch (err: any) {
          setError(err.message ?? "Failed to fetch nearby mechanics.");
        } finally {
          setLoading(false);
        }
      },
      (geoErr) => {
        setLoading(false);
        switch (geoErr.code) {
          case geoErr.PERMISSION_DENIED:
            setError("Location access was denied. Please enable it in your browser settings.");
            break;
          case geoErr.POSITION_UNAVAILABLE:
            setError("Your location is currently unavailable.");
            break;
          default:
            setError("Unable to determine your location.");
        }
      },
      { timeout: 10000 }
    );
  };

  // ── Idle state (before search) ──────────────────────────────────────────────
  const renderIdle = () => (
    <div className="flex flex-col items-center space-y-8 animate-fade-in">
      {/* Icon */}
      <div className="relative">
        <div className="bg-destructive/10 rounded-full p-6">
          <ShieldAlert className="h-12 w-12 text-destructive" />
        </div>
        <span className="absolute -bottom-1 -right-1 bg-destructive rounded-full h-4 w-4 animate-ping opacity-70" />
      </div>

      {/* Copy */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-foreground">
          This repair needs a professional
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          Based on the complexity and safety requirements of this step, we
          recommend having a certified mechanic complete the remaining work.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={findMechanics}
        className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <MapPin className="h-5 w-5" />
        Find Mechanics &amp; Auto Shops Nearby
      </button>

      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Go back to repair steps
      </button>
    </div>
  );

  // ── Loading state ───────────────────────────────────────────────────────────
  const renderLoading = () => (
    <div className="flex flex-col items-center space-y-6 py-12 animate-fade-in">
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <Loader2 className="h-5 w-5 text-primary animate-spin absolute -top-1 -right-1" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-foreground">Locating nearby mechanics…</p>
        <p className="text-sm text-muted-foreground">Checking top-rated shops in your area</p>
      </div>
    </div>
  );

  // ── Error state ─────────────────────────────────────────────────────────────
  const renderError = () => (
    <div className="w-full space-y-4 animate-fade-in">
      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">{error}</p>
      </div>
      <button
        onClick={findMechanics}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Try Again
      </button>
      <button
        onClick={onBack}
        className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Go back to repair steps
      </button>
    </div>
  );

  // ── Results state ───────────────────────────────────────────────────────────
  const renderResults = () => (
    <div className="w-full space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Nearby Mechanics</h2>
          <p className="text-xs text-muted-foreground">
            {mechanics.length} top-rated shop{mechanics.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <button
          onClick={() => {
            setMechanics([]);
            setSearched(false);
            setError(null);
          }}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Search again
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {mechanics.map((m) => (
          <div
            key={m.place_id}
            className="bg-card border border-border rounded-xl p-4 space-y-3 hover:border-primary/40 transition-colors"
          >
            {/* Name + open status */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground leading-snug">{m.name}</p>
              {m.opening_hours && (
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                    m.opening_hours.open_now
                      ? "bg-green-500/10 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {m.opening_hours.open_now ? "Open" : "Closed"}
                </span>
              )}
            </div>

            {/* Rating */}
            {m.rating && (
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {ratingStars(m.rating).map((filled, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        filled ? "text-yellow-400 fill-yellow-400" : "text-muted stroke-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {m.rating.toFixed(1)}
                  {m.user_ratings_total && ` (${m.user_ratings_total.toLocaleString()})`}
                </span>
              </div>
            )}

            {/* Address */}
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{m.vicinity}</span>
            </div>

            {/* Distance */}
            {m.distance_meters != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Navigation className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {m.distance_meters < 1000
                    ? `${Math.round(m.distance_meters)}m away`
                    : `${(m.distance_meters / 1000).toFixed(1)}km away`}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              {m.formatted_phone_number && (
                <a
                  href={`tel:${m.formatted_phone_number}`}
                  className="flex-1 py-2 border border-border rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </a>
              )}
              <a
                href={mapsDirectionsUrl(
                  m.geometry.location.lat,
                  m.geometry.location.lng,
                  m.name
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-primary/10 text-primary rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-primary/20 transition-colors"
              >
                <Navigation className="h-3.5 w-3.5" />
                Directions
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Go back to repair steps
      </button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-6 max-w-lg mx-auto flex flex-col items-center min-h-[60vh]">
      {!searched && renderIdle()}
      {searched && loading && renderLoading()}
      {searched && !loading && error && renderError()}
      {searched && !loading && !error && mechanics.length > 0 && renderResults()}
    </div>
  );
};

export default EscalationScreen;