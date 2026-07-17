import { useState } from "react";
import Layout from "../components/Layout";
import { LogSection, type LogSectionConfig } from "../components/LogSection";
import { useAuth } from "../auth";
import { HOTELS } from "../types";

const buffet: LogSectionConfig = {
  type: "buffet",
  title: "CCP-1 · Buffet Temperature",
  description: "Hot/cold holding temperature checks",
  fields: [
    { name: "time", label: "Time", type: "time", required: true },
    { name: "item", label: "Item", required: true },
    { name: "zone", label: "Zone" },
    {
      name: "type",
      label: "Type",
      type: "select",
      options: ["hot", "cold"],
      required: true,
    },
    { name: "temperature", label: "Temperature (°C)", type: "number", step: "0.1", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["pass", "caution", "fail"],
      required: true,
    },
    { name: "correctiveAction", label: "Corrective action", type: "textarea" },
    { name: "monitoredBy", label: "Monitored by" },
  ],
  renderRow: (r) => (
    <div>
      <span className="font-medium text-slate-700">{r.time}</span> · {r.item}{" "}
      <span className="text-slate-500">({r.type})</span> — {r.temperature}°C
      {r.zone ? ` · ${r.zone}` : ""}
      {r.correctiveAction ? (
        <span className="block text-slate-500">
          ⚠ {r.correctiveAction}
        </span>
      ) : null}
    </div>
  ),
};

const thawing: LogSectionConfig = {
  type: "thawing",
  title: "CCP-2 · Thawing",
  description: "Controlled thawing records",
  fields: [
    { name: "itemName", label: "Item name", required: true },
    {
      name: "method",
      label: "Method",
      type: "select",
      options: ["fridge", "water", "microwave", "room"],
      required: true,
    },
    { name: "startDate", label: "Start date", type: "date", required: true },
    { name: "endDate", label: "End date", type: "date", required: true },
    { name: "initialTemp", label: "Initial temp (°C)", type: "number", step: "0.1", required: true },
    { name: "finalTemp", label: "Final temp (°C)", type: "number", step: "0.1" },
    { name: "quantity", label: "Quantity" },
    { name: "unit", label: "Unit" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["pass", "caution", "fail"],
      required: true,
    },
    { name: "correctiveAction", label: "Corrective action", type: "textarea" },
    { name: "monitoredBy", label: "Monitored by" },
  ],
  renderRow: (r) => (
    <div>
      <span className="font-medium text-slate-700">{r.itemName}</span> ·{" "}
      {r.method} thawing
      <span className="text-slate-500">
        {" "}
        ({r.startDate} → {r.endDate})
      </span>{" "}
      — {r.initialTemp}°C
      {r.correctiveAction ? (
        <span className="block text-slate-500">⚠ {r.correctiveAction}</span>
      ) : null}
    </div>
  ),
};

const received: LogSectionConfig = {
  type: "received",
  title: "CCP-3 · Goods Received",
  description: "Supplier delivery & vehicle temperature",
  fields: [
    { name: "time", label: "Time", type: "time", required: true },
    { name: "supplier", label: "Supplier", required: true },
    { name: "vehicleTemp", label: "Vehicle temp (°C)", type: "number", step: "0.1", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["pass", "caution", "fail"],
      required: true,
    },
    { name: "monitoredBy", label: "Monitored by" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  buildBody: (values, hotel) => ({
    hotelId: hotel,
    date: values.date,
    time: values.time,
    supplier: values.supplier,
    vehicleTemp: Number(values.vehicleTemp),
    status: values.status,
    items: [],
    monitoredBy: values.monitoredBy,
    notes: values.notes,
  }),
  renderRow: (r) => (
    <div>
      <span className="font-medium text-slate-700">{r.time}</span> · {r.supplier}{" "}
      <span className="text-slate-500">(vehicle {r.vehicleTemp}°C)</span>
      {r.notes ? <span className="block text-slate-500">{r.notes}</span> : null}
    </div>
  ),
};

const disinfection: LogSectionConfig = {
  type: "disinfection",
  title: "CCP-4 · Disinfection",
  description: "Surface/equipment disinfection checks",
  fields: [
    { name: "time", label: "Time", type: "time", required: true },
    { name: "items", label: "Area / items", required: true },
    { name: "solution", label: "Solution", required: true },
    { name: "concentration", label: "Concentration (%)", type: "number", step: "0.1", required: true },
    { name: "contactTime", label: "Contact time (min)", type: "number", required: true },
    { name: "waterTemp", label: "Water temp (°C)", type: "number", step: "0.1", required: true },
    { name: "ph", label: "pH", type: "number", step: "0.1" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: ["pass", "caution", "fail"],
      required: true,
    },
    { name: "correctiveAction", label: "Corrective action", type: "textarea" },
    { name: "monitoredBy", label: "Monitored by" },
  ],
  renderRow: (r) => (
    <div>
      <span className="font-medium text-slate-700">{r.time}</span> · {r.items}{" "}
      <span className="text-slate-500">
        ({r.solution}, {r.concentration}%, {r.contactTime}min)
      </span>
      {r.correctiveAction ? (
        <span className="block text-slate-500">⚠ {r.correctiveAction}</span>
      ) : null}
    </div>
  ),
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const hotels = user?.allowedHotels?.length ? user.allowedHotels : [...HOTELS];
  const [hotel, setHotel] = useState(hotels[0]);

  return (
    <Layout selectedHotel={hotel} onHotelChange={setHotel}>
      <div className="space-y-5">
        <LogSection config={buffet} hotel={hotel} />
        <LogSection config={thawing} hotel={hotel} />
        <LogSection config={received} hotel={hotel} />
        <LogSection config={disinfection} hotel={hotel} />
      </div>
    </Layout>
  );
}
