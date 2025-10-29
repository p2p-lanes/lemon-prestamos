"use client";

/**
 * /activity - Loan History
 * Display all user's past and current loans
 */

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { getVaultContract } from "@/lib/blockchain";
import { formatUSDT } from "@/lib/contracts";
import { formatAddress, getTxLink, formatTimeAgo } from "@/lib/blockchain";
import { AlertCircle, ArrowLeft, ExternalLink } from "lucide-react";
import type { LoanData } from "@/hooks/use-loan-data";

export default function ActivityPage() {
  const { wallet, isAuthenticated, isLoading: authLoading } = useWallet();
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "repaid" | "defaulted">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLoans = async () => {
      if (!wallet) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const vault = getVaultContract();
        const allLoans = await vault.getAllLoans();

        // Filter to only show user's loans
        const userLoans = allLoans.filter(
          (loan: LoanData) => loan.borrower.toLowerCase() === wallet.toLowerCase()
        );

        // Sort by timestamp (newest first)
        userLoans.sort((a: LoanData, b: LoanData) => Number(b.timestamp) - Number(a.timestamp));

        setLoans(userLoans);
      } catch (err) {
        console.error("Error fetching loans:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch loans");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoans();
  }, [wallet]);

  const filteredLoans = loans.filter((loan) => {
    if (filter === "all") return true;
    if (filter === "active") return loan.isActive && !loan.isDefaulted;
    if (filter === "repaid") return loan.isRepaid;
    if (filter === "defaulted") return loan.isDefaulted && !loan.isRepaid;
    return true;
  });

  const getLoanStatus = (loan: LoanData) => {
    if (loan.isRepaid) return { label: "Repaid", variant: "default" as const };
    if (loan.isDefaulted) return { label: "Defaulted", variant: "destructive" as const };
    if (loan.isActive) return { label: "Active", variant: "secondary" as const };
    return { label: "Closed", variant: "outline" as const };
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please open this app in Lemon Cash to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-sm text-muted-foreground">
            Your loan history
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.location.href = "/home"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Home
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "active", "repaid", "defaulted"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f as typeof filter)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loans List */}
      {filteredLoans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No loans yet. Borrow your first loan to get started!"
                : `No ${filter} loans found.`
              }
            </p>
            {filter === "all" && (
              <Button
                className="mt-4"
                onClick={() => window.location.href = "/home"}
              >
                Borrow Now
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLoans.map((loan, index) => {
            const status = getLoanStatus(loan);
            const daysAgo = Math.floor((Date.now() / 1000 - Number(loan.timestamp)) / 86400);

            return (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Loan #{Number(loan.id) + 1}
                      </CardTitle>
                      <CardDescription>
                        {formatTimeAgo(loan.timestamp)}
                      </CardDescription>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Principal</p>
                      <p className="text-lg font-semibold">
                        {formatUSDT(loan.principal)} USDT
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Active</p>
                      <p className="text-lg font-semibold">{daysAgo} days</p>
                    </div>
                  </div>

                  {loan.isActive && !loan.isDefaulted && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => window.location.href = "/repay"}
                    >
                      Go to Repay
                    </Button>
                  )}

                  {loan.isDefaulted && !loan.isRepaid && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full"
                      onClick={() => window.location.href = "/repay"}
                    >
                      Repay Defaulted Loan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {loans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{loans.length}</p>
                <p className="text-sm text-muted-foreground">Total Loans</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {loans.filter(l => l.isRepaid).length}
                </p>
                <p className="text-sm text-muted-foreground">Repaid</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {loans.filter(l => l.isActive && !l.isDefaulted).length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {loans.filter(l => l.isDefaulted && !l.isRepaid).length}
                </p>
                <p className="text-sm text-muted-foreground">Defaulted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
