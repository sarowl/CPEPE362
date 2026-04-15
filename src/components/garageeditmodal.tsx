"use client";

import { useEffect, useState } from "react";
import { CarFront, X } from "lucide-react";
import type { NewVehicleInput } from "./garagemodel";

type GarageEditableVehicle = NewVehicleInput & {
  id: string;
  photoPath?: string;
};

type Props = {
  open: boolean;
  vehicle: GarageEditableVehicle | null;
  onClose: () => void;
  onSave: (vehicle: GarageEditableVehicle) => void;
};

type ValidationErrors = Partial<{
  Platenumber: string;
  vin: string;
  chasisnumber: string;
  enginenumber: string;
  ORnumber: string;
  CRnumber: string;
  owner: string;
}>;

const VALIDATION_PATTERNS = {
  PLATENUM: /^[A-Z]{3}-?\d{3,4}$|^\d{3}[A-Z]{3}$/,
  VIN: /^[A-HJ-NPR-Z0-9]{17}$/,
  CHASSIS: /^[A-Z0-9-]{6,20}$/,
  ENGINE: /^[A-Z0-9-]{6,20}$/,
  OR: /^\d{6,10}$/,
  CR: /^[A-Z0-9-]{6,15}$/,
};

const COLOR_NAME_TO_HEX: Record<string, string> = {
  white: "#f5f5f5",
  black: "#202020",
  silver: "#b3b3b3",
  gray: "#7b7f85",
  grey: "#7b7f85",
  blue: "#315f9c",
  red: "#b03333",
  green: "#397a4f",
  brown: "#6a4a3c",
  yellow: "#d4a017",
  orange: "#e67e22",
  purple: "#7b3f99",
};

const isHexColor = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

const rgbToHex = (value: string) => {
  const match = value
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(\d*\.?\d+))?\s*\)$/i);

  if (!match) return null;

  const [r, g, b] = [match[1], match[2], match[3]].map((channel) => Number(channel));
  if ([r, g, b].some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    return null;
  }

  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
};

const toHexColor = (input: string, fallback: string) => {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return fallback;

  if (isHexColor(normalized)) {
    return normalized;
  }

  const fromRgb = rgbToHex(normalized);
  if (fromRgb) {
    return fromRgb;
  }

  return COLOR_NAME_TO_HEX[normalized] ?? fallback;
};

const EMPTY_FORM: NewVehicleInput = {
  year: new Date().getFullYear(),
  make: "",
  model: "",
  colorName: "",
  colorHex: "#b3b3b3",
  vin: "",
  owner: "",
  enginenumber: "",
  Platenumber: "",
  chasisnumber: "",
  type: "",
  classification: "private",
  ORnumber: "",
  CRnumber: "",
  Grossweight: 0,
  Netweight: 0,
};

export default function GarageEditModal({ open, vehicle, onClose, onSave }: Props) {
  const [form, setForm] = useState<NewVehicleInput>(EMPTY_FORM);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const handleColorNameChange = (nextColorName: string) => {
    setForm((prev) => ({
      ...prev,
      colorName: nextColorName,
      colorHex: toHexColor(nextColorName, prev.colorHex),
    }));
  };

  useEffect(() => {
    if (!open || !vehicle) return;
    setForm({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      colorName: vehicle.colorName,
      colorHex: toHexColor(vehicle.colorHex, toHexColor(vehicle.colorName, EMPTY_FORM.colorHex)),
      vin: vehicle.vin || "",
      owner: vehicle.owner,
      enginenumber: vehicle.enginenumber,
      Platenumber: vehicle.Platenumber,
      chasisnumber: vehicle.chasisnumber,
      type: vehicle.type,
      classification: vehicle.classification,
      ORnumber: vehicle.ORnumber,
      CRnumber: vehicle.CRnumber,
      Grossweight: vehicle.Grossweight,
      Netweight: vehicle.Netweight,
    });
    setValidationErrors({});
  }, [open, vehicle]);

  if (!open || !vehicle) return null;

  const validateIdentificationAndRegistration = (): boolean => {
    const nextErrors: ValidationErrors = {};

    if (form.Platenumber && !VALIDATION_PATTERNS.PLATENUM.test(form.Platenumber)) {
      nextErrors.Platenumber = "Invalid plate number (e.g. ABC-1234 or 123ABC)";
    }

    if (form.vin && !VALIDATION_PATTERNS.VIN.test(form.vin)) {
      nextErrors.vin = "VIN must be exactly 17 alphanumeric characters (no I, O, Q)";
    }

    if (form.chasisnumber && !VALIDATION_PATTERNS.CHASSIS.test(form.chasisnumber)) {
      nextErrors.chasisnumber = "Chassis number must be 6-20 alphanumeric characters or hyphens";
    }

    if (form.enginenumber && !VALIDATION_PATTERNS.ENGINE.test(form.enginenumber)) {
      nextErrors.enginenumber = "Engine number must be 6-20 alphanumeric characters or hyphens";
    }

    if (form.ORnumber && !VALIDATION_PATTERNS.OR.test(form.ORnumber)) {
      nextErrors.ORnumber = "OR number must be 6-10 digits";
    }

    if (form.CRnumber && !VALIDATION_PATTERNS.CR.test(form.CRnumber)) {
      nextErrors.CRnumber = "CR number must be 6-15 alphanumeric characters or hyphens";
    }

    if (!form.owner || form.owner.trim() === "") {
      nextErrors.owner = "Registered owner is required.";
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const saveChanges = () => {
    if (!validateIdentificationAndRegistration()) {
      return;
    }
    onSave({
      id: vehicle.id,
      photoPath: vehicle.photoPath,
      ...form,
      vin: form.vin || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-md border border-[#cfd2d8] bg-[#f7f7f8] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-4">
          <h2 className="font-mono text-lg font-bold tracking-tight text-[#12161f]">Edit Vehicle</h2>

          <button
            type="button"
            onClick={onClose}
            className="border-2 border-[#f08a57] p-0.5 text-[#6a707b] transition hover:bg-[#efefef]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-3">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dfdfe1]">
              <CarFront className="h-6 w-6 text-[#1f232b]" strokeWidth={1.6} />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
            <Section title="VEHICLE INFORMATION">
              <EditInputRow label="Make" value={form.make} onChange={(value) => setForm((prev) => ({ ...prev, make: value }))} />
              <EditInputRow label="Model" value={form.model} onChange={(value) => setForm((prev) => ({ ...prev, model: value }))} />
              <EditInputRow
                label="Year"
                type="number"
                value={String(form.year)}
                onChange={(value) => setForm((prev) => ({ ...prev, year: Number(value) || prev.year }))}
              />
              <EditInputRow label="Type" value={form.type} onChange={(value) => setForm((prev) => ({ ...prev, type: value }))} />
              <div className="grid grid-cols-[1fr_auto] items-center border-b border-[#d6d7db] py-2 gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">Classification</span>
                <select
                  value={form.classification}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      classification: event.target.value as NewVehicleInput["classification"],
                    }))
                  }
                  className="h-8 w-28 rounded border border-[#cfd2d8] bg-white px-2 font-mono text-xs font-semibold text-[#11151e] outline-none"
                >
                  <option value="private">Private</option>
                  <option value="electric">Electric</option>
                  <option value="public">Public</option>
                  <option value="government">Government</option>
                </select>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-center border-b border-[#d6d7db] py-2 gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">Color</span>
                <input
                  type="text"
                  value={form.colorName}
                  onChange={(event) => handleColorNameChange(event.target.value)}
                  className="h-8 w-28 rounded border border-[#cfd2d8] bg-white px-2 font-mono text-xs font-semibold text-[#11151e] outline-none"
                />
              </div>
            </Section>

            <Section title="IDENTIFICATION">
              <EditInputRow
                label="Plate Number"
                value={form.Platenumber}
                onChange={(value) => setForm((prev) => ({ ...prev, Platenumber: value }))}
                error={validationErrors.Platenumber}
              />
              <EditInputRow
                label="VIN"
                value={form.vin || ""}
                onChange={(value) => setForm((prev) => ({ ...prev, vin: value }))}
                error={validationErrors.vin}
              />
              <EditInputRow
                label="Chassis No."
                value={form.chasisnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, chasisnumber: value }))}
                error={validationErrors.chasisnumber}
              />
              <EditInputRow
                label="Engine No."
                value={form.enginenumber}
                onChange={(value) => setForm((prev) => ({ ...prev, enginenumber: value }))}
                error={validationErrors.enginenumber}
              />
            </Section>

            <Section title="REGISTRATION">
              <EditInputRow
                label="OR Number"
                value={form.ORnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, ORnumber: value }))}
                error={validationErrors.ORnumber}
              />
              <EditInputRow
                label="CR Number"
                value={form.CRnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, CRnumber: value }))}
                error={validationErrors.CRnumber}
              />
              <EditInputRow
                label="Owner"
                value={form.owner}
                onChange={(value) => setForm((prev) => ({ ...prev, owner: value }))}
                error={validationErrors.owner}
              />
            </Section>

            <Section title="SPECIFICATIONS">
              <EditInputRow
                label="Gross Weight"
                type="number"
                value={String(form.Grossweight)}
                onChange={(value) => setForm((prev) => ({ ...prev, Grossweight: Number(value) || 0 }))}
              />
              <EditInputRow
                label="Net Weight"
                type="number"
                value={String(form.Netweight)}
                onChange={(value) => setForm((prev) => ({ ...prev, Netweight: Number(value) || 0 }))}
              />
            </Section>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 flex-1 border border-[#cfd2d8] bg-white px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#11151e] transition hover:bg-[#efefef]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveChanges}
              className="h-9 flex-1 bg-[#f26a2e] px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#d85720]"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 border-b border-[#d6d7db] py-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#637085]">
        {title}
      </h3>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function EditInputRow({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  error?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start border-b border-[#d6d7db] py-2 gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">{label}</span>
      <div>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-8 w-36 rounded border bg-white px-2 font-mono text-xs font-semibold text-[#11151e] outline-none focus:border-[#f08a57] ${error ? "border-red-400" : "border-[#cfd2d8]"}`}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
