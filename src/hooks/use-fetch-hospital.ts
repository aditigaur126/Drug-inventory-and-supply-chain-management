// FILE: useFetchHospitals.ts
import { useState, useEffect } from "react";
import axios from "axios";

export interface Hospital {
  id: string;
  name: string;
  location: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  lastOrderDate: string;
}

const useFetchHospitals = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await axios.get("/api/hospital");
        const payload = response.data as
          | Hospital[]
          | { data?: Hospital[] }
          | Record<string, unknown>;
        const normalizedHospitals = Array.isArray(payload)
          ? payload
          : "data" in payload && Array.isArray(payload.data)
            ? payload.data
            : [];
        setHospitals(normalizedHospitals as Hospital[]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, []);

  return { hospitals, loading, error };
};

export default useFetchHospitals;
