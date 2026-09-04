"use client";

import { FleetStatusStrip } from "@/components/vehicles/vehicle-overview";
import { DeliveryTable } from "@/components/deliveries/delivery-table";
import { FleetSimulation } from "@/components/vehicles/fleet-simulation";

/**
 * Delivery management.
 *
 * Shares the fleet queries and the delay-detection control with Vehicle
 * Tracking rather than duplicating them — a consignment and its vehicle are
 * two views of the same operation.
 */
export default function DeliveriesPage() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <FleetStatusStrip />
      <FleetSimulation />
      <DeliveryTable />
    </div>
  );
}
