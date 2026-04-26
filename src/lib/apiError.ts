type ApiErrorPayload = {
  message?: string;
  error?: string;
};

const DEFAULT_API_ERROR_MESSAGE = "Request failed. Please try again.";

export const getApiErrorMessage = async (
  response: Response,
  fallbackMessage: string = DEFAULT_API_ERROR_MESSAGE
): Promise<string> => {
  try {
    const clone = response.clone();
    const contentType = clone.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = (await clone.json()) as ApiErrorPayload;
      if (payload?.message?.trim()) return payload.message.trim();
      if (payload?.error?.trim()) return payload.error.trim();
    } else {
      const text = (await clone.text()).trim();
      if (text) return text;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
};
