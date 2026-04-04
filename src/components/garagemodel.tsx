"use client";

import { useEffect, useMemo, useState } from "react";
import { CarFront, ChevronLeft, X, Check } from "lucide-react";

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
  classification: "private" | "electric" | "public" | "government";
  ORnumber:string;
  CRnumber:string;
  Grossweight:number;
  Netweight:number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: NewVehicleInput, photoFile: File | null) => void;
};

type Step = "make" | "year" | "color" | "details" | "confirm";

type ValidationErrors = Partial<{
  Platenumber: string;
  vin: string;
  chasisnumber: string;
  enginenumber: string;
  ORnumber: string;
  CRnumber: string;
  owner: string;
}>;

const MAKES = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Nissan", "Subaru", "Jeep"];
const PLATENUM_PATTERN = /^[A-Z]{3}-?\d{3,4}$|^\d{3}[A-Z]{3}$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const CHASSIS_PATTERN = /^[A-Z0-9-]{6,20}$/;
const ENGINE_PATTERN = /^[A-Z0-9-]{6,20}$/;
const OR_PATTERN = /^\d{6,10}$/;
const CR_PATTERN = /^[A-Z0-9-]{6,15}$/;
const CLASSIFICATION_OPTIONS: NewVehicleInput["classification"][] = [
  "private",
  "electric",
  "public",
  "government",
];

export default function GarageModal({ open, onClose, onAddVehicle }: Props) {
  const [step, setStep] = useState<Step>("make");
  const [vin, setVin] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedColorName, setSelectedColorName] = useState("");
  const [selectedColorHex, setSelectedColorHex] = useState("#b3b3b3");
  const [owner, setOwner] = useState("");
  const [enginenumber, setEnginenumber] = useState("");
  const [Platenumber, setPlatenumber] = useState("");
  const [chasisnumber, setChasisnumber] = useState("");
  const [type, setType] = useState("");
  const [classification, setClassification] = useState<NewVehicleInput["classification"]>("private");
  const [ORnumber, setORnumber] = useState("");
  const [CRnumber, setCRnumber] = useState("");
  const [Grossweight, setGrossweight] = useState(0);
  const [Netweight, setNetweight] = useState(0);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: current - 1990 + 1 }, (_, i) => current - i);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("make");
    setVin("");
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear(2023);
    setSelectedColorName("");
    setSelectedColorHex("#b3b3b3");
    setOwner("");
    setEnginenumber("");
    setPlatenumber("");
    setChasisnumber("");
    setType("");
    setClassification("private");
    setORnumber("");
    setCRnumber("");
    setGrossweight(0);
    setNetweight(0);
    setSelectedPhotoFile(null);
    setSelectedPhotoPreview(null);
    setValidationErrors({});
  }, [open]);

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview) {
        URL.revokeObjectURL(selectedPhotoPreview);
      }
    };
  }, [selectedPhotoPreview]);

  if (!open) return null;

  const goBack = () => {
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

  const validateIdentificationAndRegistration = (): ValidationErrors => {
    const nextErrors: ValidationErrors = {};
    const plate = Platenumber.trim();
    const vinValue = vin.trim().toUpperCase();
    const chassis = chasisnumber.trim();
    const engine = enginenumber.trim();
    const orNum = ORnumber.trim();
    const crNum = CRnumber.trim();

    if (!plate) {
      nextErrors.Platenumber = "Plate number is required.";
    } else if (!PLATENUM_PATTERN.test(plate)) {
      nextErrors.Platenumber = "Format: ABC-1234 or ABC1234 or 123ABC.";
    }

    if (!vinValue) {
      nextErrors.vin = "VIN is required.";
    } else if (!VIN_PATTERN.test(vinValue)) {
      nextErrors.vin = "VIN must be 17 alphanumeric (A-Z, 0-9, excluding I, O, Q).";
    }

    if (!chassis) {
      nextErrors.chasisnumber = "Chassis number is required.";
    } else if (!CHASSIS_PATTERN.test(chassis)) {
      nextErrors.chasisnumber = "Format: 6-20 letters/numbers with hyphens allowed.";
    }

    if (!engine) {
      nextErrors.enginenumber = "Engine number is required.";
    } else if (!ENGINE_PATTERN.test(engine)) {
      nextErrors.enginenumber = "Format: 6-20 letters/numbers with hyphens allowed.";
    }

    if (!orNum) {
      nextErrors.ORnumber = "OR number is required.";
    } else if (!OR_PATTERN.test(orNum)) {
      nextErrors.ORnumber = "Format: 6-10 digits only.";
    }

    if (!crNum) {
      nextErrors.CRnumber = "CR number is required.";
    } else if (!CR_PATTERN.test(crNum)) {
      nextErrors.CRnumber = "Format: 6-15 alphanumeric with hyphens allowed.";
    }

    const ownerValue = owner.trim();
    if (!ownerValue) {
      nextErrors.owner = "Registered owner is required.";
    }

    return nextErrors;
  };

  const goToConfirmStep = () => {
    const nextErrors = validateIdentificationAndRegistration();
    setValidationErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      setStep("confirm");
    }
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
            {step !== "make" ? (
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
                          ? "border border-[#f26a2e] bg-[#ffe9df] text-[#d85720]"
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
                className="mb-4 h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
              />

              <button
                type="button"
                onClick={() => setStep("year")}
                disabled={!selectedMake || !selectedModel.trim()}
                className="h-10 w-full rounded-lg bg-[#f26a2e] text-sm font-semibold text-white transition enabled:hover:bg-[#d85720] disabled:cursor-not-allowed disabled:bg-slate-300"
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

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-600">Custom color name</label>
                  <input
                    type="text"
                    value={selectedColorName}
                    onChange={(event) => setSelectedColorName(event.target.value)}
                    placeholder="e.g. Cherry Red, Metallic Grey"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStep("details")}
                  disabled={!selectedColorName.trim()}
                  className="h-10 w-full rounded-lg bg-[#f26a2e] text-sm font-semibold text-white transition enabled:hover:bg-[#d85720] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === "details" ? (
            <div>
              <p className="mb-4 text-sm text-slate-500">
                {selectedYear} {selectedMake} {selectedModel}
              </p>

              <div className="mb-5 max-h-[52vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Plate Number
                    </label>
                    <input
                      type="text"
                      value={Platenumber}
                      onChange={(e) => {
                        setPlatenumber(e.target.value);
                        setValidationErrors((prev) => ({ ...prev, Platenumber: undefined }));
                      }}
                      placeholder="e.g. ABC-1234"
                      className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.Platenumber ? "border border-red-400" : "border border-slate-200"}`}
                    />
                    {validationErrors.Platenumber ? (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.Platenumber}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      VIN
                    </label>
                    <input
                      type="text"
                      value={vin}
                      onChange={(e) => {
                        setVin(e.target.value.toUpperCase().slice(0, 17));
                        setValidationErrors((prev) => ({ ...prev, vin: undefined }));
                      }}
                      placeholder="Vehicle Identification"
                      className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.vin ? "border border-red-400" : "border border-slate-200"}`}
                    />
                    {validationErrors.vin ? (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.vin}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Chassis Number
                    </label>
                    <input
                      type="text"
                      value={chasisnumber}
                      onChange={(e) => {
                        setChasisnumber(e.target.value);
                        setValidationErrors((prev) => ({ ...prev, chasisnumber: undefined }));
                      }}
                      placeholder="e.g. CHN-2024-0001"
                      className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.chasisnumber ? "border border-red-400" : "border border-slate-200"}`}
                    />
                    {validationErrors.chasisnumber ? (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.chasisnumber}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Engine Number
                    </label>
                    <input
                      type="text"
                      value={enginenumber}
                      onChange={(e) => {
                        setEnginenumber(e.target.value);
                        setValidationErrors((prev) => ({ ...prev, enginenumber: undefined }));
                      }}
                      placeholder="e.g. ENG-2AR-0001"
                      className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.enginenumber ? "border border-red-400" : "border border-slate-200"}`}
                    />
                    {validationErrors.enginenumber ? (
                      <p className="mt-1 text-xs text-red-600">{validationErrors.enginenumber}</p>
                    ) : null}
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
                  />
                  </div>

                  <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Classification
                  </label>
                  <select
                    value={classification}
                    onChange={(e) => setClassification(e.target.value as NewVehicleInput["classification"])}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
                  >
                    {CLASSIFICATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                  </div>

                  <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    OR Number
                  </label>
                  <input
                    type="text"
                    value={ORnumber}
                    onChange={(e) => {
                      setORnumber(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, ORnumber: undefined }));
                    }}
                    placeholder="e.g. 1234567"
                    className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.ORnumber ? "border border-red-400" : "border border-slate-200"}`}
                  />
                  {validationErrors.ORnumber ? (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.ORnumber}</p>
                  ) : null}
                  </div>

                  <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    CR Number
                  </label>
                  <input
                    type="text"
                    value={CRnumber}
                    onChange={(e) => {
                      setCRnumber(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, CRnumber: undefined }));
                    }}
                    placeholder="e.g. ABC-1234567"
                    className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.CRnumber ? "border border-red-400" : "border border-slate-200"}`}
                  />
                  {validationErrors.CRnumber ? (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.CRnumber}</p>
                  ) : null}
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
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
                    className="h-10 w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e]"
                  />
                </div>

                  <div className="col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Registered Owner
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => {
                      setOwner(e.target.value);
                      setValidationErrors((prev) => ({ ...prev, owner: undefined }));
                    }}
                    placeholder="Full name of owner"
                    className={`h-10 w-full rounded-lg bg-slate-100 px-3.5 text-sm text-slate-700 outline-none transition focus:border-[#f26a2e] ${validationErrors.owner ? "border border-red-400" : "border border-slate-200"}`}
                  />
                  {validationErrors.owner ? (
                    <p className="mt-1 text-xs text-red-600">{validationErrors.owner}</p>
                  ) : null}
                  </div>

                  <div className="col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Vehicle Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedPhotoFile(file);

                      if (selectedPhotoPreview) {
                        URL.revokeObjectURL(selectedPhotoPreview);
                      }

                      if (file) {
                        setSelectedPhotoPreview(URL.createObjectURL(file));
                      } else {
                        setSelectedPhotoPreview(null);
                      }
                    }}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-[#f26a2e] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                  />

                  {selectedPhotoPreview ? (
                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <img
                        src={selectedPhotoPreview}
                        alt="Vehicle preview"
                        className="h-36 w-full object-cover"
                      />
                    </div>
                  ) : null}
                  </div>
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
                  onClick={goToConfirmStep}
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
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#ffe9df]">
                    <CarFront className="h-5 w-5 text-[#f26a2e]" />
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
                <ConfirmRow label="Color" value={selectedColorName.trim()} />
                <ConfirmRow label="Classification" value={classification} />
                <ConfirmRow label="Photo" value={selectedPhotoFile ? selectedPhotoFile.name : "None"} />
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddVehicle({
                    year: selectedYear,
                    make: selectedMake,
                    model: selectedModel,
                    colorName: selectedColorName.trim(),
                    colorHex: selectedColorHex,
                    vin: vin || undefined,
                    owner,
                    enginenumber,
                    Platenumber,
                    chasisnumber,
                    type,
                    classification,
                    ORnumber,
                    CRnumber,
                    Grossweight,
                    Netweight,
                  }, selectedPhotoFile);
                }}
                className="h-10 w-full rounded-lg bg-[#f26a2e] text-sm font-semibold text-white transition hover:bg-[#d85720]"
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
  if (step === "make") return "Make & Model";
  if (step === "year") return "Select Year";
  if (step === "color") return "Custom Color";
  if (step === "details") return "Vehicle Details";
  return "Confirm Vehicle";
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] border-b border-slate-200 py-2">
      <span className="text-base text-slate-500">{label}</span>
      <span className="text-base font-medium text-slate-900">{value}</span>
    </div>
  );
}
