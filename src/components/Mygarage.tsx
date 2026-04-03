"use client";

import { useState, useEffect } from "react";
import { Car, Plus } from "lucide-react";
import GarageModal, { type NewVehicleInput } from "./garagemodel";
import GarageViewModal from "./garageviewmodal";
import GarageEditModal from "./garageeditmodal";
import { supabase } from "@/lib/supabase";

type GarageVehicle = NewVehicleInput & {
  id: string;
  colorName: string;
  colorHex: string;
};

type MaintenanceEntry = {
  id: string;
  carId: string;
  activity: string;
  date: string;
  notes: string;
  reminder: string;
  createdAt: string;
};

export default function Mygarage() {
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [vehicles, setVehicles] = useState<GarageVehicle[]>([]);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [maintenanceRows, setMaintenanceRows] = useState<MaintenanceEntry[]>([]);
  const [maintenanceActivity, setMaintenanceActivity] = useState("");
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenanceReminder, setMaintenanceReminder] = useState("");
  const [maintenanceEditingId, setMaintenanceEditingId] = useState<string | null>(null);
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false);
  const [maintenanceFormError, setMaintenanceFormError] = useState<string | null>(null);

  const activeVehicle = vehicles.find((vehicle) => vehicle.id === activeVehicleId) ?? null;
  const visibleMaintenanceRows = maintenanceRows
    .filter((row) => activeVehicleId !== null && row.carId === activeVehicleId)
    .sort((a, b) => {
      const aCreated = Date.parse(a.createdAt);
      const bCreated = Date.parse(b.createdAt);

      if (!Number.isNaN(aCreated) && !Number.isNaN(bCreated) && aCreated !== bCreated) {
        return bCreated - aCreated;
      }

      const aDate = Date.parse(a.date);
      const bDate = Date.parse(b.date);

      if (!Number.isNaN(aDate) && !Number.isNaN(bDate) && aDate !== bDate) {
        return bDate - aDate;
      }

      return b.id.localeCompare(a.id);
    });

  const mapVehicleRow = (row: any): GarageVehicle => {
    const firstString = (...values: unknown[]) => {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }

        if (typeof value === "number" && Number.isFinite(value)) {
          return String(value);
        }
      }
      return "";
    };

    const firstNumber = (...values: unknown[]) => {
      for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
      return 0;
    };

    const modelRaw = typeof row?.model === "string" ? row.model.trim() : "Unknown Model";
    const modelParts = modelRaw.split(/\s+/).filter(Boolean);
    const make = modelParts[0] ?? "Unknown";
    const model = modelParts.slice(1).join(" ") || "Model";

    const colorRaw = typeof row?.color === "string" ? row.color : "Unknown (#000000)";
    const colorName = colorRaw.split(" (")[0] || "Unknown";
    const colorHex = colorRaw.match(/\((.*?)\)/)?.[1] || "#000000";

    const yearParsed = Number(row?.year);
    const year = Number.isFinite(yearParsed) ? yearParsed : new Date().getFullYear();

    return {
      id: String(row?.id ?? `vehicle-${Math.random().toString(36).slice(2, 10)}`),
      make,
      model,
      year,
      colorName,
      colorHex,
      vin: firstString(row?.vin, row?.VIN) || undefined,
      owner: firstString(row?.owner, row?.Owner, row?.registered_owner),
      enginenumber: firstString(row?.enginenumber, row?.enginenum, row?.engine_number, row?.engine, row?.EngineNumber),
      Platenumber: firstString(row?.Platenumber, row?.platenumber, row?.platenum, row?.plate_number),
      chasisnumber: firstString(row?.chasisnumber, row?.chasis, row?.chassisnumber, row?.chassis_number),
      type: firstString(row?.type, row?.vehicle_type),
      ORnumber: firstString(row?.ORnumber, row?.ORnum, row?.or_number),
      CRnumber: firstString(row?.CRnumber, row?.CRnum, row?.cr_number),
      Grossweight: firstNumber(row?.Grossweight, row?.grossweight, row?.gross_weight),
      Netweight: firstNumber(row?.Netweight, row?.netweight, row?.net_weight),
    };
  };

  const mapMaintenanceRow = (row: any): MaintenanceEntry => {
    const safeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

    return {
      id: String(row?.id ?? `maintenance-${Math.random().toString(36).slice(2, 10)}`),
      carId: String(row?.car_id ?? ""),
      activity: safeText(row?.activity) || "N/A",
      date: safeText(row?.date) || "N/A",
      notes: safeText(row?.notes),
      reminder: safeText(row?.reminder) || "N/A",
      createdAt: safeText(row?.created_at),
    };
  };

  const resetMaintenanceForm = () => {
    setMaintenanceActivity("");
    setMaintenanceDate("");
    setMaintenanceNotes("");
    setMaintenanceReminder("");
    setMaintenanceEditingId(null);
    setMaintenanceFormError(null);
  };


const updateVehicleInDB = async (vehicle: GarageVehicle) => {
 const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    alert("User not logged in");
    return;
  }

  // 🔥 map fields (IMPORTANT)
  const mappedVehicle = {
    id: vehicle.id,
    model: `${vehicle.make} ${vehicle.model}`,
    year: vehicle.year,
    color: `${vehicle.colorName} (${vehicle.colorHex})`,
    type: vehicle.type,
    platenum: vehicle.Platenumber,
    vin: vehicle.vin,
    chasis: vehicle.chasisnumber,
    ORnum: vehicle.ORnumber,
    CRnum: vehicle.CRnumber,
    enginenum: vehicle.enginenumber,
    Grossweight: vehicle.Grossweight,
    Netweight: vehicle.Netweight,
    owner: vehicle.owner,
  };

  try {
    const res = await fetch("/api/mygarge/update", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mappedVehicle),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Update failed:", data.message);
      return;
    }

    console.log("Updated:", data);

    // 🔥 refresh from DB (BEST PRACTICE)
    await fetchVehicles();
  } catch (err) {
    console.error("Update failed:", err);
  }

}

  const fetchVehicles = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const token = session?.access_token;
    if (!token) {
      setIsAuthenticated(false);
      setVehicles([]);
      setMaintenanceRows([]);
      setActiveVehicleId(null);
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    try {
      const res = await fetch("/api/mygarge/fetch", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Fetch failed with status ${res.status}`);
      }

      const data = await res.json();

      const rows = Array.isArray(data?.vehicles) ? data.vehicles : [];
      const formatted: GarageVehicle[] = rows.map(mapVehicleRow);
      const maintenanceData = Array.isArray(data?.maintenance) ? data.maintenance : [];
      const formattedMaintenance: MaintenanceEntry[] = maintenanceData.map(mapMaintenanceRow);

      setVehicles(formatted);
      setMaintenanceRows(formattedMaintenance);

      if (formatted.length > 0) {
        setActiveVehicleId(formatted[0].id);
      } else {
        setActiveVehicleId(null);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
      setErrorMessage("Unable to load your garage right now.");
      setMaintenanceRows([]);
    } finally {
      setIsLoading(false);
    }
  };


const saveVehicleToDB = async (vehicle: GarageVehicle) => {
  const model = `${vehicle.make} ${vehicle.model}`;
  const color = `${vehicle.colorName} (${vehicle.colorHex})`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    alert("User not logged in");
    return;
  }

  try {
    const res = await fetch("/api/mygarge/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model,
        year: vehicle.year,
        color,
        owner: vehicle.owner,
        type: vehicle.type,
        platenum: vehicle.Platenumber,
        vin: vehicle.vin,
        chasis: vehicle.chasisnumber,
        ORnum: vehicle.ORnumber,
        CRnum: vehicle.CRnumber,
        enginenum: vehicle.enginenumber,
        Grossweight: vehicle.Grossweight,
        Netweight: vehicle.Netweight,
      }),
    });

    const data = await res.json();

    console.log("Saved:", data);
  } catch (err) {
    console.error("Save failed:", err);
  }
};
  const handleAddVehicle = async (vehicle: NewVehicleInput) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `vehicle-${Date.now()}`;

    const newVehicle: GarageVehicle = {
      ...vehicle,
      id,
    };

    setOpen(false);

 
    await saveVehicleToDB(newVehicle);

    await fetchVehicles();
  };

  const handleEditVehicle = async (updatedVehicle: GarageVehicle) => {
    setEditOpen(false);

    await updateVehicleInDB(updatedVehicle);

  };

  const getPlate = (vehicle: GarageVehicle) => {
    const dbPlate = typeof vehicle.Platenumber === "string" ? vehicle.Platenumber.trim() : "";
    return dbPlate || "No platenum";
  };

  
  useEffect(() => {
    fetchVehicles();
  }, []);

const deleteVehicleFromDB = async (id: string) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    alert("User not logged in");
    return;
  }

  try {
    const res = await fetch("/api/mygarge/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const text = await res.text();
      let data = null;
      if (text) {
        data = JSON.parse(text);
      }
      alert(`Delete failed: ${data?.error || "Unknown error"}`);
      return;
    }

    let data = null;
    const text = await res.text();

    if (text) {
      data = JSON.parse(text);
    }

    console.log("Deleted:", data);

    if (activeVehicleId === id) {
      setActiveVehicleId(null);
    }

    await fetchVehicles();
  } catch (err) {
    console.error("Delete failed:", err);
    alert("Delete failed: " + (err instanceof Error ? err.message : String(err)));
  }
};

const saveMaintenanceToDB = async () => {
  if (!activeVehicleId) {
    setMaintenanceFormError("Select a vehicle first.");
    return;
  }

  if (!maintenanceActivity.trim() || !maintenanceDate.trim()) {
    setMaintenanceFormError("Activity and date are required.");
    return;
  }

  setIsSavingMaintenance(true);
  setMaintenanceFormError(null);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    setMaintenanceFormError("User not logged in.");
    setIsSavingMaintenance(false);
    return;
  }

  try {
    const isEditMode = maintenanceEditingId !== null;
    const endpoint = isEditMode ? "/api/mygarge/maintenance_update" : "/api/mygarge/maintenance_save";
    const method = isEditMode ? "PUT" : "POST";
    const payload = isEditMode
      ? {
          id: maintenanceEditingId,
          activity: maintenanceActivity.trim(),
          date: maintenanceDate.trim(),
          notes: maintenanceNotes.trim(),
          reminder: maintenanceReminder.trim(),
        }
      : {
          car_id: activeVehicleId,
          activity: maintenanceActivity.trim(),
          date: maintenanceDate.trim(),
          notes: maintenanceNotes.trim(),
          reminder: maintenanceReminder.trim(),
        };

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setMaintenanceFormError(data?.message ?? "Unable to save maintenance history.");
      return;
    }

    setAddMaintenanceOpen(false);
    resetMaintenanceForm();
    await fetchVehicles();
  } catch (err) {
    console.error("Maintenance save failed:", err);
    setMaintenanceFormError("Unable to save maintenance history.");
  } finally {
    setIsSavingMaintenance(false);
  }
};

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#efefef] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        
        {/* HEADER */}
        <div className="px-0 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-mono text-4xl font-bold tracking-wide text-[#181818]">
              My Garage
            </h1>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 border border-[#151515] bg-[#111] px-5 py-2.5 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#2a2a2a]"
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* VEHICLES */}
        <section className="px-0 py-4">
          {errorMessage ? (
            <div className="border border-[#d7d7d7] bg-[#f9f9f9] px-5 py-4 font-mono text-sm text-[#222]">
              {errorMessage}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-3 border border-[#d7d7d7] bg-[#f9f9f9] px-5 py-7 text-center font-mono text-sm uppercase tracking-[0.1em] text-[#5f5f5f]">
              Loading garage...
            </div>
          ) : !isAuthenticated ? (
            <div className="mt-3 border border-[#d7d7d7] bg-[#f9f9f9] px-5 py-7 text-center font-mono text-sm text-[#3d3d3d]">
              Sign in to view and manage your garage.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((vehicle) => {
                const selected = vehicle.id === activeVehicleId;

                return (
                  <article
                    key={vehicle.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveVehicleId(vehicle.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveVehicleId(vehicle.id);
                      }
                    }}
                    className={`min-h-[180px] border-2 border-dashed px-5 py-6 ${
                      selected
                        ? "border-[#242424] bg-[#ececec]"
                        : "border-[#c9c9c9] bg-[#f2f2f2]"
                    } cursor-pointer`}
                  >
                    <div className="mb-3 flex justify-center">
                      <span className="inline-flex h-11 w-11 items-center justify-center text-[#7a7a7a]">
                        <Car className="h-7 w-7" />
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveVehicleId(vehicle.id)}
                      className="w-full cursor-pointer text-center"
                    >
                      <p className="font-mono text-[30px] font-semibold leading-tight">
                        {vehicle.make} {vehicle.model}
                      </p>

                      <p className="mt-2 font-mono text-base text-[#6f6f6f]">
                        {vehicle.year} · {getPlate(vehicle)} ·
                        <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-[#8a8a8a]"
                            style={{ backgroundColor: vehicle.colorHex }}
                          />
                          <span>{vehicle.colorName}</span>
                        </span>
                      </p>
                    </button>

                    <div className="mt-5 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveVehicleId(vehicle.id);
                          setViewOpen(true);
                        }}
                        className="cursor-pointer border border-[#c9c9c9] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#1f1f1f] transition-colors hover:border-[#f26a2e] hover:bg-[#f26a2e] hover:text-white"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveVehicleId(vehicle.id);
                          setEditOpen(true);
                        }}
                        className="cursor-pointer border border-[#c9c9c9] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#1f1f1f] transition-colors hover:border-[#f26a2e] hover:bg-[#f26a2e] hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteVehicleFromDB(vehicle.id);
                        }}
                        className="cursor-pointer border border-[#c9c9c9] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-[#1f1f1f] transition-colors hover:border-[#d94343] hover:bg-[#d94343] hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}

              {/* ADD BUTTON CARD */}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#c9c9c9] bg-[#f2f2f2]"
              >
                <Plus className="h-7 w-7" />
                <span className="mt-3 font-mono text-base font-semibold uppercase tracking-[0.2em] text-[#6f6f6f]">
                  Add New Vehicle
                </span>
              </button>
            </div>
          )}
        </section>

        {!isLoading && isAuthenticated ? (
          <section className="pt-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-mono text-base uppercase tracking-[0.28em] text-[#747474]">
                <span>Maintenance History</span>
                <span>·</span>
                <span className="text-[#1d1d1d]">
                  {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : "No Vehicle Selected"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetMaintenanceForm();
                  setAddMaintenanceOpen(true);
                }}
                disabled={!activeVehicle}
                className="inline-flex items-center gap-2 border border-[#151515] bg-[#111] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:border-[#9d9d9d] disabled:bg-[#bdbdbd]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Maintenance
              </button>
            </div>

            <div className="overflow-x-auto border border-[#cfcfcf] bg-[#f4f4f4]">
              <table className="w-full min-w-[760px] border-collapse font-mono text-sm text-[#1e1e1e]">
                <thead>
                  <tr className="border-b border-[#cfcfcf] bg-[#e7e7e7] text-left text-xs uppercase tracking-[0.14em] text-[#555]">
                    <th className="px-4 py-3 font-semibold">Activity</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold">Reminder</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMaintenanceRows.length > 0 ? (
                    visibleMaintenanceRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#cfcfcf] last:border-b-0">
                        <td className="px-4 py-5">{row.activity}</td>
                        <td className="px-4 py-5">{row.date}</td>
                        <td className="px-4 py-5 text-[#6a6a6a]">{row.notes}</td>
                        <td className="px-4 py-5">{row.reminder}</td>
                        <td className="px-4 py-5">
                          <button
                            type="button"
                            onClick={() => {
                              setMaintenanceEditingId(row.id);
                              setMaintenanceActivity(row.activity === "N/A" ? "" : row.activity);
                              setMaintenanceDate(row.date === "N/A" ? "" : row.date);
                              setMaintenanceNotes(row.notes);
                              setMaintenanceReminder(row.reminder === "N/A" ? "" : row.reminder);
                              setMaintenanceFormError(null);
                              setAddMaintenanceOpen(true);
                            }}
                            className="cursor-pointer border border-[#c9c9c9] px-3 py-1.5 text-xs uppercase tracking-[0.12em] hover:bg-[#ececec]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-sm uppercase tracking-[0.12em] text-[#6f6f6f]"
                      >
                        No maintenance history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>

      <GarageModal
        open={open}
        onClose={() => setOpen(false)}
        onAddVehicle={handleAddVehicle}
      />

      <GarageViewModal
        open={viewOpen}
        vehicle={activeVehicle}
        onClose={() => setViewOpen(false)}
      />

      <GarageEditModal
        open={editOpen}
        vehicle={activeVehicle}
        onClose={() => setEditOpen(false)}
        onSave={(vehicle) => handleEditVehicle(vehicle)}
      />

      {addMaintenanceOpen ? (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-900/45 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="font-mono text-lg font-semibold uppercase tracking-[0.14em] text-[#1d1d1d]">
                {maintenanceEditingId ? "Edit Maintenance History" : "Add Maintenance History"}
              </h2>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-[#6d6d6d]">
                {activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : "No Vehicle Selected"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#505050]">
                  Activity
                </label>
                <input
                  type="text"
                  value={maintenanceActivity}
                  onChange={(event) => setMaintenanceActivity(event.target.value)}
                  placeholder="e.g. Oil Change"
                  className="h-10 w-full border border-[#cfcfcf] bg-[#f7f7f7] px-3 font-mono text-sm text-[#1e1e1e] outline-none transition focus:border-[#2d67e3]"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#505050]">
                  Date
                </label>
                <input
                  type="date"
                  value={maintenanceDate}
                  onChange={(event) => setMaintenanceDate(event.target.value)}
                  className="h-10 w-full border border-[#cfcfcf] bg-[#f7f7f7] px-3 font-mono text-sm text-[#1e1e1e] outline-none transition focus:border-[#2d67e3]"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#505050]">
                  Reminder
                </label>
                <input
                  type="text"
                  value={maintenanceReminder}
                  onChange={(event) => setMaintenanceReminder(event.target.value)}
                  placeholder="e.g. Every 6 months"
                  className="h-10 w-full border border-[#cfcfcf] bg-[#f7f7f7] px-3 font-mono text-sm text-[#1e1e1e] outline-none transition focus:border-[#2d67e3]"
                />
              </div>

              <div>
                <label className="mb-2 block font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#505050]">
                  Notes
                </label>
                <input
                  type="text"
                  value={maintenanceNotes}
                  onChange={(event) => setMaintenanceNotes(event.target.value)}
                  placeholder="Optional notes"
                  className="h-10 w-full border border-[#cfcfcf] bg-[#f7f7f7] px-3 font-mono text-sm text-[#1e1e1e] outline-none transition focus:border-[#2d67e3]"
                />
              </div>
            </div>

            {maintenanceFormError ? (
              <p className="px-4 pb-2 font-mono text-xs uppercase tracking-[0.08em] text-[#b33636]">
                {maintenanceFormError}
              </p>
            ) : null}

            <div className="flex gap-3 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  setAddMaintenanceOpen(false);
                  resetMaintenanceForm();
                }}
                className="h-10 flex-1 border border-[#cfcfcf] bg-white font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#1f1f1f] transition hover:bg-[#f4f4f4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMaintenanceToDB}
                disabled={isSavingMaintenance}
                className="h-10 flex-1 border border-[#151515] bg-[#111] font-mono text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:border-[#9d9d9d] disabled:bg-[#bdbdbd]"
              >
                {isSavingMaintenance ? "Saving..." : maintenanceEditingId ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}







