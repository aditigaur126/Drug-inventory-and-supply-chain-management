"use client";
import { useState } from "react";
import { FormData } from "@/lib/zodSchema/formSchema";
import { getApiErrorMessage } from "@/lib/apiError";

interface UseCreateHospitalResponse {
  createHospital: (data: FormData) => Promise<any>;
  isFormLoading: boolean;
  formError: string | null;
}

const useCreateHospital = (): UseCreateHospitalResponse => {
  const [isFormLoading, setIsLoading] = useState(false);
  const [formError, setError] = useState<string | null>(null);

  const createHospital = async (data: FormData): Promise<any> => {
    setIsLoading(true);
    setError(null); // Reset error before starting the request

    try {
      const response = await fetch("/api/hospital/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Check for response status
      if (!response.ok) {
        const message = await getApiErrorMessage(
          response,
          "Unable to create hospital. Please try again."
        );
        setError(message);
        throw new Error(message);
      }

      const result = await response.json();
      return result; // Return the result for further use if needed
    } catch (error: any) {
      console.error("Error during hospital creation:", error.message);
      setError(error.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false); // Ensure loading state is updated
    }
  };

  return {
    createHospital,
    isFormLoading,
    formError,
  };
};

export default useCreateHospital;
