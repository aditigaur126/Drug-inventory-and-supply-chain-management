"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "@/hooks/use-toast";

const TOAST_DEDUPE_WINDOW_MS = 4000;
const DEFAULT_ERROR_MESSAGE = "An unexpected error occurred. Please try again.";

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

type ErrorWithResponse = {
  message?: string;
  response?: {
    data?: ApiErrorPayload;
  };
  __CANCEL__?: boolean;
};

const isAbortError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { name?: string };
  return maybeError.name === "AbortError";
};

const parseErrorMessage = (error: unknown): string => {
  if (!error) {
    return DEFAULT_ERROR_MESSAGE;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  const axiosError = error as ErrorWithResponse;
  const responseMessage =
    axiosError.response?.data?.message || axiosError.response?.data?.error;

  if (responseMessage) {
    return responseMessage;
  }

  if (axiosError.message) {
    return axiosError.message;
  }

  return DEFAULT_ERROR_MESSAGE;
};

export default function GlobalErrorPopupHandler() {
  const lastShownAtRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const showGlobalErrorPopup = (message: string) => {
      const finalMessage = message?.trim() || DEFAULT_ERROR_MESSAGE;
      const now = Date.now();
      const lastShownAt = lastShownAtRef.current[finalMessage] ?? 0;

      if (now - lastShownAt < TOAST_DEDUPE_WINDOW_MS) {
        return;
      }

      lastShownAtRef.current[finalMessage] = now;

      toast({
        title: "Error",
        description: finalMessage,
        variant: "destructive",
      });
    };

    const onUnhandledError = (event: ErrorEvent) => {
      const message =
        event.message || parseErrorMessage(event.error) || DEFAULT_ERROR_MESSAGE;
      showGlobalErrorPopup(message);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isAbortError(event.reason)) {
        return;
      }

      showGlobalErrorPopup(parseErrorMessage(event.reason));
    };

    const originalFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          const statusText = response.statusText ? ` ${response.statusText}` : "";
          showGlobalErrorPopup(`Request failed with status ${response.status}${statusText}.`);
        }

        return response;
      } catch (error) {
        if (!isAbortError(error)) {
          showGlobalErrorPopup(parseErrorMessage(error));
        }

        throw error;
      }
    };

    const axiosInterceptorId = axios.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        const cancellableError = error as ErrorWithResponse;
        if (!cancellableError.__CANCEL__ && !isAbortError(error)) {
          showGlobalErrorPopup(parseErrorMessage(error));
        }

        return Promise.reject(error);
      }
    );

    window.addEventListener("error", onUnhandledError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.fetch = originalFetch;
      axios.interceptors.response.eject(axiosInterceptorId);
      window.removeEventListener("error", onUnhandledError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}