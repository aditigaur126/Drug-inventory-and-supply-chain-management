// import { Layout } from "@/components/layout"
"use client";
import { HospitalsTable, Hospital } from "../components/hospitals-table";
import { Button } from "@/components/ui/button";
import useFetchHospitals from "@/hooks/use-fetch-hospital";

export default function HospitalsPage() {
  const { hospitals, loading, error } = useFetchHospitals();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-muted/40">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Hospitals</h2>
        <div className="flex items-center space-x-2">
          <Button>Add Hospital</Button>
        </div>
      </div>
      <HospitalsTable data={hospitals} />
    </div>
  );
}
