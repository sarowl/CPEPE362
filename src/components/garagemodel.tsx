"use client";

import { useEffect, useMemo, useState } from "react";
import { CarFront, ChevronLeft, ChevronRight, ScanLine, X, Check } from "lucide-react";

export type NewVehicleInput = {
  year: number;
  make: string;
  model: string;
  colorName: string;
  colorHex: string;
  vin?: string;
  owner: string;
  enginenumber:string;
  Platenumber:string;
  chasisnumber:string;
  type:string;
  ORnumber:string;
  CRnumber:string;
  Grossweight:number;
  Netweight:number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: NewVehicleInput) => void;
};

type Step = "chooser" | "vin" | "make" | "year" | "color" | "details" | "confirm";

const MAKES = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Nissan", "Subaru", "Jeep"];

const VEHICLE_COLORS = [
  { name: "White", hex: "#f5f5f5" },
  { name: "Black", hex: "#202020" },
  { name: "Silver", hex: "#b3b3b3" },
  { name: "Gray", hex: "#7b7f85" },
  { name: "Blue", hex: "#315f9c" },
  { name: "Red", hex: "#b03333" },
  { name: "Green", hex: "#397a4f" },
  { name: "Brown", hex: "#6a4a3c" },
] as const;

export default function GarageModal({ open, onClose, onAddVehicle }: Props) {
  const [step, setStep] = useState<Step>("chooser");
  const [vin, setVin] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedColorName, setSelectedColorName] = useState("White");
  const [selectedColorHex, setSelectedColorHex] = useState("#f5f5f5");
  const [owner, setOwner] = useState("");
  const [enginenumber, setEnginenumber] = useState("");
  const [Platenumber, setPlatenumber] = useState("");
  const [chasisnumber, setChasisnumber] = useState("");
  const [type, setType] = useState("");
  const [ORnumber, setORnumber] = useState("");
  const [CRnumber, setCRnumber] = useState("");
  const [Grossweight, setGrossweight] = useState(0);
  const [Netweight, setNetweight] = useState(0);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1990 + 1 }, (_, i) => current - i);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("chooser");
    setVin("");
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear(2023);
    setSelectedColorName("White");
    setSelectedColorHex("#f5f5f5");
    setOwner("");
    setEnginenumber("");
    setPlatenumber("");
    setChasisnumber("");
    setType("");
    setORnumber("");
    setCRnumber("");
    setGrossweight(0);
    setNetweight(0);
  }, [open]);

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

    if (step === "color") {
      setStep("year");
      return;
    }

    if (step === "details") {
      setStep("color");
      return;
    }

    if (step === "confirm") {
      setStep("details");
    }
  };

  const chooseMake = (make: string) => {
    setSelectedMake(make);
  };

  const decodeVin = () => {
    // Placeholder decode flow to match current mock behavior.
    setSelectedMake("Honda");
    setSelectedModel("Pilot");
    setSelectedYear(2023);
    setStep("color");
  };

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]"
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
            <div>
              <p className="mb-2.5 text-sm text-slate-500">Choose a make, then enter your model.</p>

              <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {MAKES.map((make) => {
                  const selected = selectedMake === make;

                  return (
                    <button
                      key={make}
                      type="button"
                      onClick={() => chooseMake(make)}
                      className={`h-10 rounded-lg px-3.5 text-left text-base font-medium transition ${
                        selected
                          ? "border border-[#2d67e3] bg-[#e7edfb] text-[#1f55c7]"
                          : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                      }`}
                    >
                      {make}
                    </button>
                  );
                })}
              </div>

              <label className="mb-2 block text-sm font-medium text-slate-600">Model</label>
              <input
                type="text"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                placeholder="e.g. Ranger, Civic, Hilux"
                className="mb-4 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
              />

              <button
                type="button"
                onClick={() => setStep("year")}
                disabled={!selectedMake || !selectedModel.trim()}
                className="h-10 w-full rounded-lg bg-[#2d67e3] text-sm font-semibold text-white transition enabled:hover:bg-[#1f55c7] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continue
              </button>
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
                        setStep("color");
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

          {step === "color" ? (
            <div>
              <p className="mb-2.5 text-sm text-slate-500">
                {selectedYear} {selectedMake} {selectedModel}
              </p>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {VEHICLE_COLORS.map((color) => {
                  const selected = color.name === selectedColorName;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setSelectedColorName(color.name);
                        setSelectedColorHex(color.hex);
                        setStep("details");
                      }}
                      className={`flex h-11 items-center gap-2.5 rounded-lg border px-3 text-left text-sm font-semibold transition ${
                        selected
                          ? "border-[#2d67e3] bg-[#e7edfb] text-[#1f55c7]"
                          : "border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      <span
                        className="inline-block h-4 w-4 rounded-full border border-slate-400"
                        style={{ backgroundColor: color.hex }}
                        aria-hidden="true"
                      />
                      <span>{color.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === "details" ? (
            <div>
              <p className="mb-4 text-sm text-slate-500">
                {selectedYear} {selectedMake} {selectedModel}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Plate Number
                  </label>
                  <input
                    type="text"
                    value={Platenumber}
                    onChange={(e) => setPlatenumber(e.target.value)}
                    placeholder="e.g. ABC-1234"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    VIN
                  </label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
                    placeholder="Vehicle Identification"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Chassis Number
                  </label>
                  <input
                    type="text"
                    value={chasisnumber}
                    onChange={(e) => setChasisnumber(e.target.value)}
                    placeholder="e.g. CHN-2024-0001"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    value={enginenumber}
                    onChange={(e) => setEnginenumber(e.target.value)}
                    placeholder="e.g. ENG-2AR-0001"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="e.g. SUV, Sedan"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    OR Number
                  </label>
                  <input
                    type="text"
                    value={ORnumber}
                    onChange={(e) => setORnumber(e.target.value)}
                    placeholder="e.g. OR-2024-00001"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    CR Number
                  </label>
                  <input
                    type="text"
                    value={CRnumber}
                    onChange={(e) => setCRnumber(e.target.value)}
                    placeholder="e.g. CR-2024-00001"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Gross Weight
                  </label>
                  <input
                    type="number"
                    value={Grossweight}
                    onChange={(e) => setGrossweight(Number(e.target.value))}
                    placeholder="e.g. 1,850 kg"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Net Weight
                  </label>
                  <input
                    type="number"
                    value={Netweight}
                    onChange={(e) => setNetweight(Number(e.target.value))}
                    placeholder="e.g. 1,520 kg"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Registered Owner
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Full name of owner"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#2d67e3]"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  className="h-10 flex-1 rounded-lg bg-[#f26a2e] text-sm font-semibold text-white transition hover:bg-[#d45a1f]"
                >
                  Next
                </button>
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
                <ConfirmRow label="Color" value={selectedColorName} />
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddVehicle({
                    year: selectedYear,
                    make: selectedMake,
                    model: selectedModel,
                    colorName: selectedColorName,
                    colorHex: selectedColorHex,
                    vin: vin || undefined,
                    owner,
                    enginenumber,
                    Platenumber,
                    chasisnumber,
                    type,
                    ORnumber,
                    CRnumber,
                    Grossweight,
                    Netweight,
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
  if (step === "make") return "Make & Model";
  if (step === "year") return "Select Year";
  if (step === "color") return "Select Color";
  if (step === "details") return "Vehicle Details";
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