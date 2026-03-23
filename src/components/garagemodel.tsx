"use client";

import { useEffect, useMemo, useState } from "react";
import { CarFront, ChevronLeft, ChevronRight, ScanLine, X, Check } from "lucide-react";

export type NewVehicleInput = {
  year: number;
  make: string;
  model: string;
  vin?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: NewVehicleInput) => void;
};

type Step = "chooser" | "vin" | "make" | "year" | "confirm";

const MAKES = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Nissan", "Subaru", "Jeep"];

const MODELS_BY_MAKE: Record<string, string> = {
  Toyota: "Camry",
  Honda: "Pilot",
  Ford: "F-150",
  Chevrolet: "Silverado",
  BMW: "X5",
  Nissan: "Rogue",
  Subaru: "Outback",
  Jeep: "Grand Cherokee",
};

export default function GarageModal({ open, onClose, onAddVehicle }: Props) {
  const [step, setStep] = useState<Step>("chooser");
  const [vin, setVin] = useState("");
  const [selectedMake, setSelectedMake] = useState("Honda");
  const [selectedModel, setSelectedModel] = useState("Pilot");
  const [selectedYear, setSelectedYear] = useState(2023);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1990 + 1 }, (_, i) => current - i);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("chooser");
    setVin("");
    setSelectedMake("Honda");
    setSelectedModel("Pilot");
    setSelectedYear(2023);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const goBack = () => {
    if (step === "vin" || step === "make") {
      setStep("chooser");
      return;
    }

    if (step === "year") {
      setStep("make");
      return;
    }

    if (step === "confirm") {
      setStep("year");
    }
  };

  const chooseMake = (make: string) => {
    setSelectedMake(make);
    setSelectedModel(MODELS_BY_MAKE[make] ?? "Base");
    setStep("year");
  };

  const decodeVin = () => {
    // Placeholder decode flow to match current mock behavior.
    setSelectedMake("Honda");
    setSelectedModel("Pilot");
    setSelectedYear(2023);
    setStep("confirm");
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-120 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 leading-none">
            {step !== "chooser" ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            ) : null}
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{titleForStep(step)}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-4">
          {step === "chooser" ? (
            <div className="space-y-2.5">
              <ActionCard
                icon={<ScanLine className="h-5 w-5 text-[#2d67e3]" />}
                title="Enter VIN"
                description="Auto-detect year, make, and model from your 17-character VIN"
                onClick={() => setStep("vin")}
              />
              <ActionCard
                icon={<CarFront className="h-5 w-5 text-[#2d67e3]" />}
                title="Manual Entry"
                description="Select year, make, and model manually"
                onClick={() => setStep("make")}
              />
            </div>
          ) : null}

          {step === "vin" ? (
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Vehicle Identification Number
              </p>
              <input
                value={vin}
                onChange={(event) => setVin(event.target.value.toUpperCase().slice(0, 17))}
                className="mb-3 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm tracking-[0.13em] text-slate-700 outline-none transition focus:border-[#2d67e3]"
                placeholder="e.g. 5TFCZ5AN3JX184732"
              />

              <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <p>Found on driver-side door jamb or windshield base</p>
                <p>{vin.length}/17</p>
              </div>

              <button
                type="button"
                onClick={decodeVin}
                className="h-10 w-full rounded-lg bg-[#2d67e3] text-sm font-semibold text-white transition hover:bg-[#1f55c7]"
              >
                Decode VIN
              </button>
            </div>
          ) : null}

          {step === "make" ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {MAKES.map((make) => (
                <button
                  key={make}
                  type="button"
                  onClick={() => chooseMake(make)}
                  className="h-10 rounded-lg bg-slate-100 px-3.5 text-left text-base font-medium text-slate-900 transition hover:bg-slate-200"
                >
                  {make}
                </button>
              ))}
            </div>
          ) : null}

          {step === "year" ? (
            <div>
              <p className="mb-2.5 text-sm text-slate-500">
                {selectedMake} {selectedModel}
              </p>

              <div className="max-h-105 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {years.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => {
                        setSelectedYear(year);
                        setStep("confirm");
                      }}
                      className="h-10 rounded-lg bg-slate-100 text-base font-semibold text-slate-900 transition hover:bg-slate-200"
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div>
              <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-3">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7edfb]">
                    <CarFront className="h-5 w-5 text-[#2d67e3]" />
                  </span>

                  <p className="text-lg font-semibold tracking-tight text-slate-900">
                    {selectedYear} {selectedMake} {selectedModel}
                  </p>
                </div>

                <Check className="h-5 w-5 text-green-500" />
              </div>

              <div className="mb-5 space-y-0.5">
                <ConfirmRow label="Year" value={String(selectedYear)} />
                <ConfirmRow label="Make" value={selectedMake} />
                <ConfirmRow label="Model" value={selectedModel} />
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddVehicle({
                    year: selectedYear,
                    make: selectedMake,
                    model: selectedModel,
                    vin: vin || undefined,
                  });
                }}
                className="h-10 w-full rounded-lg bg-[#2d67e3] text-sm font-semibold text-white transition hover:bg-[#1f55c7]"
              >
                Add to Garage
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function titleForStep(step: Step) {
  if (step === "chooser") return "Add Vehicle";
  if (step === "vin") return "Enter VIN";
  if (step === "make") return "Select Make";
  if (step === "year") return "Select Year";
  return "Confirm Vehicle";
}

function ActionCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg bg-slate-100 px-3.5 py-2.5 text-left transition hover:bg-slate-200"
    >
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e7edfb]">{icon}</span>
        <div>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </button>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 py-2">
      <span className="text-base text-slate-500">{label}</span>
      <span className="text-base font-medium text-slate-900">{value}</span>
    </div>
  );
}