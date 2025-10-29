"use client";

/**
 * Custom hook for fetching loan data
 */

import { useState, useEffect } from "react";
import { getVaultContract } from "@/lib/blockchain";
import { formatUSDT } from "@/lib/contracts";

export interface LoanData {
  id: bigint;
  borrower: string;
  principal: bigint;
  timestamp: bigint;
  isActive: boolean;
  isRepaid: boolean;
  isDefaulted: boolean;
}

export interface UserLoanInfo {
  creditLimit: bigint;
  activeLoan: LoanData | null;
  repaymentAmount: bigint;
  loanCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLoanData(wallet: string | null): UserLoanInfo {
  const [creditLimit, setCreditLimit] = useState<bigint>(0n);
  const [activeLoan, setActiveLoan] = useState<LoanData | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<bigint>(0n);
  const [loanCount, setLoanCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLoanData = async () => {
    if (!wallet) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const vault = getVaultContract();

      // Fetch all data in parallel
      const [limit, loan, count] = await Promise.all([
        vault.getCreditLimit(wallet),
        vault.getActiveLoan(wallet),
        vault.getUserLoanCount(wallet),
      ]);

      setCreditLimit(limit);
      setLoanCount(Number(count));

      // Check if loan is active
      if (loan.isActive || loan.isDefaulted) {
        setActiveLoan(loan);

        // Get repayment amount
        const repayment = await vault.calculateRepaymentAmount(wallet);
        setRepaymentAmount(repayment);
      } else {
        setActiveLoan(null);
        setRepaymentAmount(0n);
      }
    } catch (err) {
      console.error("Error fetching loan data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch loan data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanData();
  }, [wallet]);

  return {
    creditLimit,
    activeLoan,
    repaymentAmount,
    loanCount,
    isLoading,
    error,
    refresh: fetchLoanData,
  };
}
