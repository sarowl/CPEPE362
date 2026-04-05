// src/components/GarageModal.tsx
import React from "react";
import { X, Logs, Car } from "lucide-react";

export interface Vehicle {
  img?: string;
  make: string;
  model: string;
  year: number | string;
}

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Vehicle[];
  onSelect: (car: Vehicle) => void;
}

const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  cars,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Logs className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">My Garage</h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {cars?.length ? (
            <div className="grid gap-3">
              {cars.map((car, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-4 p-3 border border-border rounded-xl hover:border-primary/50 hover:bg-secondary/30 transition cursor-pointer"
                >
                  {/* Image */}
                  <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {car.img ? (
                      <img
                        src={car.img}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-primary">
                        {car.year}
                      </span>
                      <h3 className="font-bold truncate">{car.make}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {car.model}
                    </p>
                  </div>

                  {/* Select */}
                  <button
                    onClick={() => {
                      onSelect(car);
                      onClose();
                    }}
                    className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg transition"
                  >
                    Select
                  </button>
                </div>
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm hover:bg-secondary rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GarageModal;