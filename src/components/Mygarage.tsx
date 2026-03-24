"use client";

import { useState } from "react";
import { Car, Plus } from "lucide-react";
import GarageModal, { type NewVehicleInput } from "./garagemodel";

type GarageVehicle = NewVehicleInput & {
  id: string;
  colorName: string;
  colorHex: string;
};

type MaintenanceEntry = {
  id: string;
  activity: string;
  date: string;
  notes: string;
  reminder: string;
};

export default function Mygarage() {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [maintenanceByVehicle] = useState<Record<string, MaintenanceEntry[]>>({});

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null;

  const maintenanceHistory = activeVehicle
    ? maintenanceByVehicle[activeVehicle.id] ?? []
    : [];

  const handleAddVehicle = (vehicle: NewVehicleInput) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `vehicle-${Date.now()}`;

    const newVehicle: GarageVehicle = {
      ...vehicle,
      id,
    };

    setVehicles((prev) => [...prev, newVehicle]);
    setActiveVehicleId(id);
    setOpen(false);
  };

  const getPlate = (vehicle: GarageVehicle) => {
    const makeCode = vehicle.make.slice(0, 3).toUpperCase().padEnd(3, "X");
    const yearCode = String(vehicle.year).slice(-2);
    return `${makeCode}-${yearCode}${vehicle.model.slice(0, 1).toUpperCase()}`;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#efefef] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="px-0 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-mono text-4xl font-bold tracking-wide text-[#181818]">My Garage</h1>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 border border-[#151515] bg-[#111] px-6 py-3 font-mono text-base font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2a2a2a]"
            >
              <Plus className="h-5 w-5" />
              Add Vehicle
            </button>
          </div>
        </div>

        <section className="px-0 py-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const selected = vehicle.id === activeVehicleId;

              return (
                <article
                  key={vehicle.id}
                  className={`border-2 border-dashed px-5 py-5 transition ${
                    selected ? "border-[#121212] bg-[#ececec]" : "border-[#c1c1c1] bg-[#f5f5f5]"
                  }`}
                >
                  <div className="mb-3 flex justify-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center border border-[#c8c8c8] bg-[#dedede] text-[#5f5f5f]">
                      <Car className="h-6 w-6" />
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveVehicleId(vehicle.id)}
                    className="w-full text-center"
                  >
                    <p className="font-mono text-xl font-semibold leading-tight text-[#151515]">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="mt-1.5 font-mono text-sm tracking-wide text-[#6a6a6a]">
                      {vehicle.year} · {getPlate(vehicle)} ·
                      <span className="ml-1.5 inline-flex items-center gap-1.5 align-middle">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full border border-[#999]"
                          style={{ backgroundColor: vehicle.colorHex }}
                          aria-hidden="true"
                        />
                        <span>{vehicle.colorName}</span>
                      </span>
                    </p>
                  </button>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveVehicleId(vehicle.id)}
                      className="border border-[#b8b8b8] bg-[#f2f2f2] py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#222] hover:bg-[#e9e9e9]"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="border border-[#b8b8b8] bg-[#f2f2f2] py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#222] hover:bg-[#e9e9e9]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="border border-[#b8b8b8] bg-[#f2f2f2] py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#222] hover:bg-[#e9e9e9]"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-56 flex-col items-center justify-center border-2 border-dashed border-[#c1c1c1] bg-[#f6f6f6] px-5 py-5 text-[#8a8a8a] transition hover:border-[#9f9f9f] hover:text-[#5a5a5a]"
            >
              <Plus className="h-7 w-7" />
              <span className="mt-3 font-mono text-base font-semibold uppercase tracking-[0.14em]">Add New Vehicle</span>
            </button>
          </div>

          <div className="mt-7">
            <h2 className="border-b border-[#c8c8c8] pb-2.5 font-mono text-2xl font-semibold uppercase tracking-[0.12em] text-[#1c1c1c]">
              Maintenance History · {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : "No Vehicle Selected"}
            </h2>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-175 border border-[#cfcfcf] bg-[#f8f8f8]">
                <thead>
                  <tr className="bg-[#ececec] text-left">
                    <th className="border border-[#d5d5d5] px-4 py-2.5 font-mono text-base font-semibold text-[#2a2a2a]">Activity</th>
                    <th className="border border-[#d5d5d5] px-4 py-2.5 font-mono text-base font-semibold text-[#2a2a2a]">Date</th>
                    <th className="border border-[#d5d5d5] px-4 py-2.5 font-mono text-base font-semibold text-[#2a2a2a]">Notes</th>
                    <th className="border border-[#d5d5d5] px-4 py-2.5 font-mono text-base font-semibold text-[#2a2a2a]">Reminder</th>
                    <th className="border border-[#d5d5d5] px-4 py-2.5 font-mono text-base font-semibold text-[#2a2a2a]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceHistory.length > 0 ? (
                    maintenanceHistory.map((entry) => (
                      <tr key={entry.id} className="text-[#373737]">
                        <td className="border border-[#dfdfdf] px-4 py-2.5 font-mono text-base">{entry.activity}</td>
                        <td className="border border-[#dfdfdf] px-4 py-2.5 font-mono text-base">{entry.date}</td>
                        <td className="border border-[#dfdfdf] px-4 py-2.5 font-mono text-base">{entry.notes}</td>
                        <td className="border border-[#dfdfdf] px-4 py-2.5 font-mono text-base">{entry.reminder}</td>
                        <td className="border border-[#dfdfdf] px-4 py-2.5">
                          <button
                            type="button"
                            className="border border-[#b8b8b8] bg-[#f2f2f2] px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#222] hover:bg-[#e9e9e9]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="text-[#707070]">
                      <td colSpan={5} className="border border-[#dfdfdf] px-4 py-8 text-center font-mono text-base uppercase tracking-[0.08em]">
                        No maintenance records yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <GarageModal open={open} onClose={() => setOpen(false)} onAddVehicle={handleAddVehicle} />
    </div>
  );
}
