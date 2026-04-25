import type { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;

/**
 * Performs an immediate redirect with push
 */
export const redirectTo = (router: Router, path: string) => {
  router.push(path);
};

/**
 * Performs a replace redirect (doesn't add to browser history)
 * Useful for auth redirects to prevent back-button issues
 */
export const redirectToReplace = (router: Router, path: string) => {
  router.replace(path);
};

/**
 * Safely redirect based on callbackUrl or default
 * Prevents open redirect vulnerabilities
 */
export const redirectWithCallback = (
  router: Router,
  callbackUrl?: string | null,
  defaultPath: string = "/dashboard"
) => {
  // Validate callback URL is safe (same-origin, relative)
  if (callbackUrl && typeof callbackUrl === "string") {
    // Only allow relative URLs starting with /
    if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      router.replace(callbackUrl);
      return;
    }
  }
  // Fall back to default path
  router.replace(defaultPath);
};

/**
 * Get callbackUrl from search params safely
 */
export const getCallbackUrl = (searchParams: URLSearchParams): string | null => {
  const callback = searchParams.get("callbackUrl");
  // Validate it's a safe relative URL
  if (callback && callback.startsWith("/") && !callback.startsWith("//")) {
    return callback;
  }
  return null;
};
