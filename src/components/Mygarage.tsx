"use client";

import { useState } from "react";
import { Gauge, Droplets, CalendarClock, Thermometer, Plus, Search } from "lucide-react";
import GarageModal, { type NewVehicleInput } from "./garagemodel";

type GarageVehicle = NewVehicleInput & {
  id: string;
  alerts: number;
  mileage: number;
  oilLife: number;
};

function safeMileage(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function safeOilLife(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(100, Math.max(0, parsed));
}

export default function Mygarage() {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

  const stats = [
    { id: "service", label: "Next Service", value: "Overdue", icon: CalendarClock },
    { id: "temp", label: "Coolant Temp", value: "205degF", icon: Thermometer },
  ];

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null;

  const handleAddVehicle = (vehicle: NewVehicleInput) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `vehicle-${Date.now()}`;

    const newVehicle: GarageVehicle = {
      ...vehicle,
      id,
      alerts: 0,
      mileage: 0,
      oilLife: 100,
    };

    setVehicles((prev) => [...prev, newVehicle]);
    setActiveVehicleId(id);
    setOpen(false);
  };

  const handleAddTrip = () => {
    if (!activeVehicleId) {
      window.alert("Select a vehicle first.");
      return;
    }

    const rawMiles = window.prompt("Enter trip distance in miles", "0");
    if (rawMiles === null) return;

    const normalizedMiles = rawMiles.trim().replace(/,/g, "");
    const milesToAdd = Number(normalizedMiles);
    if (!normalizedMiles || !Number.isFinite(milesToAdd) || milesToAdd <= 0) {
      window.alert("Please enter a valid number greater than 0.");
      return;
    }

    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === activeVehicleId
          ? { ...vehicle, mileage: safeMileage(vehicle.mileage) + milesToAdd }
          : vehicle
      )
    );
  };

  const handleOilChanged = () => {
    if (!activeVehicleId) {
      window.alert("Select a vehicle first.");
      return;
    }

    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === activeVehicleId
          ? { ...vehicle, oilLife: 100 }
          : vehicle
      )
    );
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f5f9]">
      <div className="w-full">
        <div className="grid min-h-[calc(100vh-3.5rem)] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="bg-[#050a1a] text-white lg:rounded-b-xl lg:rounded-t-none">
            <div className="border-b border-white/10 px-5 py-6">
              <h2 className="text-xl font-semibold tracking-tight">myGarage</h2>
            </div>

            <div className="px-4 py-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Vehicles</p>

              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => setActiveVehicleId(vehicle.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                      vehicle.id === activeVehicleId
                        ? "bg-[#0f1b3d] ring-1 ring-[#1f4ed8]/60"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{vehicle.year} {vehicle.model}</p>
                      <p className="text-xs text-white/55">{vehicle.make}</p>
                    </div>
                    {vehicle.alerts > 0 ? (
                      <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-xs font-semibold text-white">
                        {vehicle.alerts}
                      </span>
                    ) : null}
                  </button>
                ))}

                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-white/10 px-3 py-3 text-xs text-white/55">
                    No vehicles yet. Use Add Vehicle to create your garage.
                  </div>
                ) : null}
              </div>

              <button
                onClick={() => setOpen(true)}
                className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/5"
              >
                <Plus className="h-4 w-4" />
                Add Vehicle
              </button>
            </div>
          </aside>

          <section className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#0f172a]">
                  {activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : "No Vehicle Selected"}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {activeVehicle ? "Active repair in progress" : "Add a vehicle to start tracking repairs"}
                </p>
              </div>

              <label className="flex h-11 w-full max-w-70 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:w-70">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search guides..."
                  className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <Gauge className="h-3.5 w-3.5" />
                      Mileage
                    </div>
                    <p className="text-3xl font-semibold tracking-tight text-slate-900">
                      {activeVehicle ? `${Math.round(safeMileage(activeVehicle.mileage)).toLocaleString()} mi` : "--"}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddTrip}
                      disabled={!activeVehicle}
                      className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Trip
                    </button>
                    {!activeVehicle ? (
                      <p className="mt-2 text-xs text-slate-400">Add/select a vehicle to update mileage.</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <Droplets className="h-3.5 w-3.5" />
                      Oil Life
                    </div>
                    <p className="text-3xl font-semibold tracking-tight text-slate-900">
                      {activeVehicle ? `${Math.round(safeOilLife(activeVehicle.oilLife))}%` : "--"}
                    </p>
                    <button
                      type="button"
                      onClick={handleOilChanged}
                      disabled={!activeVehicle}
                      className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Oil Changed
                    </button>
                  </div>

                  {stats.map((stat) => (
                    <div key={stat.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <stat.icon className="h-3.5 w-3.5" />
                        {stat.label}
                      </div>
                      <p className="text-3xl font-semibold tracking-tight text-slate-900">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">In Progress</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">Guides</h2>
                  <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    No guides to track yet.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-xl font-semibold tracking-tight text-slate-900">Saved Guides</h3>
                  <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    No saved guides yet.
                  </p>
                </div>
              </div>

              <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Technical Specs</h3>

                <div className="space-y-3 text-sm">
                  <SpecRow label="Engine" value="5.0L Coyote V8" />
                  <SpecRow label="VIN" value="1FTEW1EP3PK...47" />
                  <SpecRow label="Oil" value="5W-20 Synthetic Blend" />
                  <SpecRow label="Tire PSI" value="35 / 35 PSI" />
                  <SpecRow label="Trans" value="6-Speed Auto" />
                  <SpecRow label="Coolant" value="Motorcraft Gold" />
                </div>
              </aside>
            </div>
          </section>
        </div>
      </div>

      <GarageModal open={open} onClose={() => setOpen(false)} onAddVehicle={handleAddVehicle} />
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[70px_1fr] gap-2 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="justify-self-end text-right font-semibold text-slate-800">{value}</span>
    </div>
  );
}