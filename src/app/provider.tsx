"use client";
import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import GlobalErrorPopupHandler from "@/components/GlobalErrorPopupHandler";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <RecoilRoot>
      <SessionProvider>
        <GlobalErrorPopupHandler />
        {children}
        <Toaster />
      </SessionProvider>
    </RecoilRoot>
  );
};
