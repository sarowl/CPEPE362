"use client";

import { useEffect, useState } from "react";
import { CarFront, X } from "lucide-react";
import type { NewVehicleInput } from "./garagemodel";

type GarageEditableVehicle = NewVehicleInput & {
  id: string;
};

type Props = {
  open: boolean;
  vehicle: GarageEditableVehicle | null;
  onClose: () => void;
  onSave: (vehicle: GarageEditableVehicle) => void;
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
  ORnumber: "",
  CRnumber: "",
  Grossweight: 0,
  Netweight: 0,
};

export default function GarageEditModal({ open, vehicle, onClose, onSave }: Props) {
  const [form, setForm] = useState<NewVehicleInput>(EMPTY_FORM);

  useEffect(() => {
    if (!open || !vehicle) return;
    setForm({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      colorName: vehicle.colorName,
      colorHex: vehicle.colorHex,
      vin: vehicle.vin || "",
      owner: vehicle.owner,
      enginenumber: vehicle.enginenumber,
      Platenumber: vehicle.Platenumber,
      chasisnumber: vehicle.chasisnumber,
      type: vehicle.type,
      ORnumber: vehicle.ORnumber,
      CRnumber: vehicle.CRnumber,
      Grossweight: vehicle.Grossweight,
      Netweight: vehicle.Netweight,
    });
  }, [open, vehicle]);

  if (!open || !vehicle) return null;

  const saveChanges = () => {
    onSave({
      id: vehicle.id,
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
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.colorHex}
                    onChange={(event) => setForm((prev) => ({ ...prev, colorHex: event.target.value }))}
                    className="h-8 w-8 cursor-pointer rounded border border-[#cfd2d8] bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={form.colorName}
                    onChange={(event) => setForm((prev) => ({ ...prev, colorName: event.target.value }))}
                    className="h-8 w-28 rounded border border-[#cfd2d8] bg-white px-2 font-mono text-xs font-semibold text-[#11151e] outline-none"
                  />
                </div>
              </div>
            </Section>

            <Section title="IDENTIFICATION">
              <EditInputRow
                label="Plate Number"
                value={form.Platenumber}
                onChange={(value) => setForm((prev) => ({ ...prev, Platenumber: value }))}
              />
              <EditInputRow label="VIN" value={form.vin || ""} onChange={(value) => setForm((prev) => ({ ...prev, vin: value }))} />
              <EditInputRow
                label="Chassis No."
                value={form.chasisnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, chasisnumber: value }))}
              />
              <EditInputRow
                label="Engine No."
                value={form.enginenumber}
                onChange={(value) => setForm((prev) => ({ ...prev, enginenumber: value }))}
              />
            </Section>

            <Section title="REGISTRATION">
              <EditInputRow
                label="OR Number"
                value={form.ORnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, ORnumber: value }))}
              />
              <EditInputRow
                label="CR Number"
                value={form.CRnumber}
                onChange={(value) => setForm((prev) => ({ ...prev, CRnumber: value }))}
              />
              <EditInputRow label="Owner" value={form.owner} onChange={(value) => setForm((prev) => ({ ...prev, owner: value }))} />
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center border-b border-[#d6d7db] py-2 gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-36 rounded border border-[#cfd2d8] bg-white px-2 font-mono text-xs font-semibold text-[#11151e] outline-none focus:border-[#f08a57]"
      />
    </div>
  );
}
