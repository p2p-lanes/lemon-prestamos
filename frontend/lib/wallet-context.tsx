"use client";

/**
 * Wallet Context
 * Manages authentication state and wallet address
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { authenticateUser, isLemonApp } from "./lemon-sdk";

interface WalletContextType {
  wallet: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authenticate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if running in Lemon app
      if (!isLemonApp()) {
        setError("This app only works inside Lemon Cash");
        setIsLoading(false);
        return;
      }

      // Get nonce from backend
      const nonceRes = await fetch("/api/auth/nonce", { method: "POST" });
      if (!nonceRes.ok) {
        throw new Error("Failed to get nonce");
      }
      const { nonce } = await nonceRes.json();

      // Authenticate with Lemon SDK
      const authResult = await authenticateUser(nonce);

      if (!authResult.success) {
        const errorMsg = typeof authResult.error === "string"
          ? authResult.error
          : authResult.error?.message || "Authentication failed";
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Verify signature on backend
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: authResult.wallet,
          signature: authResult.signature,
          message: authResult.message,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error("Failed to verify signature");
      }

      const { verified, wallet: verifiedWallet } = await verifyRes.json();

      if (verified) {
        setWallet(verifiedWallet);
        localStorage.setItem("wallet", verifiedWallet);
      } else {
        setError("Signature verification failed");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
    localStorage.removeItem("wallet");
  };

  // Auto-authenticate on mount if in Lemon app
  useEffect(() => {
    const storedWallet = localStorage.getItem("wallet");
    if (storedWallet) {
      setWallet(storedWallet);
      setIsLoading(false);
    } else if (isLemonApp()) {
      authenticate();
    } else {
      setError("This app only works inside Lemon Cash");
      setIsLoading(false);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isAuthenticated: !!wallet,
        isLoading,
        error,
        authenticate,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
