"use client";

import { CarFront, X } from "lucide-react";

type GarageViewVehicle = {
	id: string;
	year: number;
	make: string;
	model: string;
	colorName: string;
	colorHex: string;
	photoUrl?: string;
	vin?: string;
	owner: string;
	enginenumber: string;
	Platenumber: string;
	chasisnumber: string;
	type: string;
	classification: "private" | "electric" | "public" | "government";
	ORnumber: string;
	CRnumber: string;
	Grossweight: number;
	Netweight: number;
};

type Props = {
	open: boolean;
	vehicle: GarageViewVehicle | null;
	onClose: () => void;
};

export default function GarageViewModal({ open, vehicle, onClose }: Props) {
	if (!open || !vehicle) return null;

	const showOrNA = (value: unknown) => {
		if (typeof value === "string") {
			const trimmed = value.trim();
			return trimmed ? trimmed : "N/A";
		}

		if (typeof value === "number" && Number.isFinite(value)) {
			return String(value);
		}

		return "N/A";
	};

	return (
		<div
			className="fixed inset-0 z-80 flex items-center justify-center bg-black/50 px-4"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				className="w-full max-w-sm overflow-hidden rounded-md border border-[#cfd2d8] bg-[#f7f7f8] shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between px-5 pt-4">
					<h2 className="font-mono text-lg font-bold tracking-tight text-[#12161f]">
						{vehicle.make} {vehicle.model}
					</h2>

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
					{vehicle.photoUrl ? (
						<div className="mb-4 overflow-hidden rounded-md border border-[#cfd2d8] bg-white">
							<img
								src={vehicle.photoUrl}
								alt={`${vehicle.make} ${vehicle.model}`}
								className="h-40 w-full object-cover"
							/>
						</div>
					) : null}

					<div className="mb-4 flex justify-center">
						<div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#dfdfe1]">
							<CarFront className="h-6 w-6 text-[#1f232b]" strokeWidth={1.6} />
						</div>
					</div>

					<div className="mb-2 flex justify-center">
						<span className="rounded-full bg-[#11131a] px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-white">
							Active
						</span>
					</div>

					<div className="max-h-96 overflow-y-auto space-y-4">
						{/* VEHICLE INFORMATION */}
						<Section title="VEHICLE INFORMATION">
							<DetailRow label="Make" value={showOrNA(vehicle.make)} />
							<DetailRow label="Model" value={showOrNA(vehicle.model)} />
							<DetailRow label="Year" value={String(vehicle.year)} />
							<DetailRow
								label="Color"
								value={showOrNA(vehicle.colorName)}
							/>
							<DetailRow label="Type" value={showOrNA(vehicle.type)} />
							<DetailRow label="Classification" value={showOrNA(vehicle.classification)} />
						</Section>

						{/* IDENTIFICATION */}
						<Section title="IDENTIFICATION">
							<DetailRow
								label="Plate Number"
								value={
									<span className="rounded-full border border-[#1d1f25] px-3 py-0.5 font-mono text-sm font-bold uppercase tracking-[0.12em] text-[#11131a]">
										{showOrNA(vehicle.Platenumber)}
									</span>
								}
							/>
							<DetailRow label="VIN" value={showOrNA(vehicle.vin)} />
							<DetailRow label="Engine No." value={showOrNA(vehicle.enginenumber)} />
							<DetailRow label="Chassis No." value={showOrNA(vehicle.chasisnumber)} />
							<DetailRow label="Registered Owner" value={showOrNA(vehicle.owner)} />
						</Section>

						{/* REGISTRATION */}
						<Section title="REGISTRATION">
							<DetailRow label="OR Number" value={showOrNA(vehicle.ORnumber)} />
							<DetailRow label="CR Number" value={showOrNA(vehicle.CRnumber)} />
						</Section>

						{/* SPECIFICATIONS */}
						<Section title="SPECIFICATIONS">
							<DetailRow
								label="Gross Weight"
								value={vehicle.Grossweight > 0 ? `${vehicle.Grossweight} kg` : "N/A"}
							/>
							<DetailRow
								label="Net Weight"
								value={vehicle.Netweight > 0 ? `${vehicle.Netweight} kg` : "N/A"}
							/>
						</Section>
					</div>
				</div>
			</div>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="grid grid-cols-[1fr_auto] items-center border-b border-[#d6d7db] py-2">
			<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#637085]">{label}</span>
			<span className="font-mono text-sm font-bold uppercase tracking-[0.03em] text-[#11151e]">{value}</span>
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

