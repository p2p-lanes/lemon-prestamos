"use client";

/**
 * /profile - User Stats
 * Display user's borrowing statistics and credit history
 */

import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useLoanData } from "@/hooks/use-loan-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getVaultContract } from "@/lib/blockchain";
import { formatUSDT, CONSTANTS } from "@/lib/contracts";
import { formatAddress } from "@/lib/blockchain";
import { AlertCircle, ArrowLeft, TrendingUp, Award, Target, Clock } from "lucide-react";
import type { LoanData } from "@/hooks/use-loan-data";

export default function ProfilePage() {
  const { wallet, isAuthenticated, isLoading: authLoading, disconnect } = useWallet();
  const loanData = useLoanData(wallet);
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  useEffect(() => {
    const fetchLoans = async () => {
      if (!wallet) {
        setIsLoadingLoans(false);
        return;
      }

      try {
        const vault = getVaultContract();
        const allLoans = await vault.getAllLoans();

        const userLoans = allLoans.filter(
          (loan: LoanData) => loan.borrower.toLowerCase() === wallet.toLowerCase()
        );

        setLoans(userLoans);
      } catch (err) {
        console.error("Error fetching loans:", err);
      } finally {
        setIsLoadingLoans(false);
      }
    };

    fetchLoans();
  }, [wallet]);

  // Calculate statistics
  const stats = {
    totalBorrowed: loans.reduce((sum, loan) => sum + loan.principal, 0n),
    totalRepaid: loans.filter(l => l.isRepaid).length,
    totalActive: loans.filter(l => l.isActive && !l.isDefaulted).length,
    totalDefaulted: loans.filter(l => l.isDefaulted && !l.isRepaid).length,
    onTimeRate: loans.length > 0
      ? Math.round((loans.filter(l => l.isRepaid).length / loans.length) * 100)
      : 0,
  };

  // Calculate credit score (0-100)
  const creditScore = Math.min(100, Math.round(
    (loanData.loanCount * 20) + // 20 points per successful repayment
    (stats.onTimeRate * 0.5) + // Up to 50 points for on-time rate
    (stats.totalDefaulted > 0 ? -30 : 0) // -30 for defaults
  ));

  // Calculate credit limit progression
  const creditHistory: number[] = [];
  let currentLimit = CONSTANTS.INITIAL_CREDIT_LIMIT;
  for (let i = 0; i <= loanData.loanCount; i++) {
    creditHistory.push(currentLimit);
    currentLimit *= CONSTANTS.CREDIT_INCREASE_FACTOR;
  }

  if (authLoading || loanData.isLoading || isLoadingLoans) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
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
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">
            {formatAddress(wallet || "")}
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

      {/* Credit Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Credit Score
          </CardTitle>
          <CardDescription>
            Based on your borrowing history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-6xl font-bold text-green-600">
              {creditScore}
            </div>
            <p className="text-sm text-muted-foreground mt-2">out of 100</p>
          </div>
          <Progress value={creditScore} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Credit Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSDT(loanData.creditLimit)}
            </div>
            <p className="text-xs text-muted-foreground">USDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Total Borrowed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUSDT(stats.totalBorrowed)}
            </div>
            <p className="text-xs text-muted-foreground">USDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Repayments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalRepaid}
            </div>
            <p className="text-xs text-muted-foreground">successful</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              On-Time Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.onTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground">repaid on time</p>
          </CardContent>
        </Card>
      </div>

      {/* Loan History Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Summary</CardTitle>
          <CardDescription>
            Breakdown of your loan history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Loans</span>
              <span className="font-semibold">{loans.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">Repaid</span>
              <span className="font-semibold text-green-600">{stats.totalRepaid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">Active</span>
              <span className="font-semibold text-blue-600">{stats.totalActive}</span>
            </div>
            {stats.totalDefaulted > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Defaulted</span>
                <span className="font-semibold text-red-600">{stats.totalDefaulted}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Credit Limit History */}
      {creditHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Credit Limit Progression</CardTitle>
            <CardDescription>
              Your credit limit growth over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {creditHistory.map((limit, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32">
                    <div className={`h-2 w-2 rounded-full ${index === creditHistory.length - 1 ? 'bg-green-600' : 'bg-muted'}`} />
                    <span className="text-sm">Loan {index}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {limit.toFixed(2)} USDT
                      </span>
                      {index > 0 && (
                        <span className="text-xs text-green-600">
                          +{((limit / creditHistory[index - 1] - 1) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <Progress
                      value={(limit / creditHistory[creditHistory.length - 1]) * 100}
                      className="h-1 mt-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/activity"}
          >
            View Loan History
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = "/home"}
          >
            Borrow USDT
          </Button>
          <Button
            variant="destructive"
            className="w-full"
            onClick={disconnect}
          >
            Disconnect Wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
