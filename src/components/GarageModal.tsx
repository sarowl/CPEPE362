// ============================================================
// GarageModal.tsx — IMPORTED FROM Folder_B
//
// Modal dialog used by the AI Repair Flow (ProblemEntryScreen) to let the
// user select a vehicle from their garage.
// Exports the Vehicle interface used throughout RepairFlow and its screens.
// Interface: Vehicle { id: number, model: string, year: number | string }
// ============================================================
// src/components/GarageModal.tsx
import React from "react";
import { X, Logs, Loader2 } from "lucide-react";

export interface Vehicle {
  id: number;
  model: string;
  year: number | string;
}

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Vehicle[];
  onSelect: (car: Vehicle) => void;
  isLoading?: boolean;
}

const GarageModal: React.FC<GarageModalProps> = ({ isOpen, onClose, cars, onSelect, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Logs className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">My Garage</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cars?.length ? (
            <div className="grid gap-2">
              {cars.map((car, index) => (
                <button
                  key={index}
                  onClick={() => { onSelect(car); onClose(); }}
                  className="w-full flex items-center justify-between px-4 py-3 border border-border rounded-xl hover:border-primary/50 hover:bg-secondary/30 transition text-left"
                >
                  <span className="font-medium">{car.model}</span>
                  <span className="text-sm text-muted-foreground">{car.year}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No vehicles found in your garage.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm hover:bg-secondary rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarageModal;