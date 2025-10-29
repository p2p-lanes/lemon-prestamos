"use client";

/**
 * /home - Borrow Screen
 * Main screen for borrowing USDT
 */

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useLoanData } from "@/hooks/use-loan-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { borrowUSDT } from "@/lib/lemon-sdk";
import { formatUSDT, parseUSDT, CONSTANTS } from "@/lib/contracts";
import { formatAddress, calculateTimeRemaining, getCurrentAPR } from "@/lib/blockchain";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function HomePage() {
  const { wallet, isAuthenticated, isLoading: authLoading } = useWallet();
  const loanData = useLoanData(wallet);
  const [borrowAmount, setBorrowAmount] = useState("");
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);

  // Calculate available credit
  const creditUsed = loanData.activeLoan ? loanData.activeLoan.principal : 0n;
  const creditAvailable = loanData.creditLimit > creditUsed ? loanData.creditLimit - creditUsed : 0n;
  const creditUtilization = loanData.creditLimit > 0n
    ? Number((creditUsed * 100n) / loanData.creditLimit)
    : 0;

  // Calculate estimated repayment
  const estimatedRepayment = borrowAmount
    ? (parseFloat(borrowAmount) * (1 + CONSTANTS.BASE_APR * (30 / 365))).toFixed(2)
    : "0.00";

  const handleBorrow = async () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      setTxResult({ success: false, message: "Please enter a valid amount" });
      return;
    }

    const amountBigInt = parseUSDT(borrowAmount);
    if (amountBigInt > creditAvailable) {
      setTxResult({ success: false, message: "Amount exceeds available credit" });
      return;
    }

    try {
      setIsBorrowing(true);
      setTxResult(null);

      const result = await borrowUSDT(amountBigInt.toString());

      if (result.success) {
        setTxResult({
          success: true,
          message: `Successfully borrowed ${borrowAmount} USDT!`
        });
        setBorrowAmount("");

        // Refresh loan data
        setTimeout(() => {
          loanData.refresh();
        }, 2000);
      } else {
        setTxResult({
          success: false,
          message: result.error || "Transaction failed"
        });
      }
    } catch (error) {
      setTxResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsBorrowing(false);
    }
  };

  if (authLoading || loanData.isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please open this app in Lemon Cash to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show active loan details if user has one
  if (loanData.activeLoan) {
    const timeRemaining = calculateTimeRemaining(loanData.activeLoan.timestamp);
    const currentAPR = getCurrentAPR(loanData.activeLoan.timestamp);
    const daysElapsed = Math.floor((Date.now() / 1000 - Number(loanData.activeLoan.timestamp)) / 86400);

    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prestamos</h1>
            <p className="text-sm text-muted-foreground">
              {formatAddress(wallet || "")}
            </p>
          </div>
          <Badge variant={timeRemaining.isOverdue ? "destructive" : "default"}>
            {timeRemaining.isOverdue ? "Overdue" : "Active"}
          </Badge>
        </div>

        {/* Active Loan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Active Loan</CardTitle>
            <CardDescription>
              You have an active loan. Repay to borrow again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Principal</p>
                <p className="text-2xl font-bold">
                  {formatUSDT(loanData.activeLoan.principal)} USDT
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">To Repay</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatUSDT(loanData.repaymentAmount)} USDT
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Days Active</p>
                <p className="font-medium">{daysElapsed} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current APR</p>
                <p className="font-medium">{currentAPR}%</p>
              </div>
            </div>

            {timeRemaining.isOverdue ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your loan is overdue. Please repay as soon as possible. Interest is now at 20% APR.
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Time Remaining
                </p>
                <p className="font-medium">
                  {timeRemaining.days} days, {timeRemaining.hours} hours
                </p>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => window.location.href = "/repay"}
            >
              Go to Repay
            </Button>
          </CardContent>
        </Card>

        {/* Credit Limit Info */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span className="font-medium">
                  {formatUSDT(creditUsed)} / {formatUSDT(loanData.creditLimit)} USDT
                </span>
              </div>
              <Progress value={creditUtilization} />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show borrow form if no active loan
  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Prestamos</h1>
        <p className="text-sm text-muted-foreground">
          {formatAddress(wallet || "")}
        </p>
      </div>

      {/* Credit Meter */}
      <Card>
        <CardHeader>
          <CardTitle>Available Credit</CardTitle>
          <CardDescription>
            Your current borrowing limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-green-600">
              {formatUSDT(creditAvailable)} USDT
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Limit: {formatUSDT(loanData.creditLimit)} USDT
            </p>
          </div>
          {loanData.loanCount > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Successful repayments: {loanData.loanCount}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrow Form */}
      <Card>
        <CardHeader>
          <CardTitle>Borrow USDT</CardTitle>
          <CardDescription>
            Get instant access to USDT. Repay within 30 days at 10% APR.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (USDT)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={borrowAmount}
              onChange={(e) => setBorrowAmount(e.target.value)}
              max={formatUSDT(creditAvailable)}
              step="0.01"
              disabled={isBorrowing}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Min: 1.00 USDT</span>
              <span>Max: {formatUSDT(creditAvailable)} USDT</span>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[25, 50, 100].map((percent) => {
              const amount = (Number(formatUSDT(creditAvailable)) * percent) / 100;
              return (
                <Button
                  key={percent}
                  variant="outline"
                  size="sm"
                  onClick={() => setBorrowAmount(amount.toFixed(2))}
                  disabled={isBorrowing || creditAvailable === 0n}
                >
                  {percent}%
                </Button>
              );
            })}
          </div>

          {/* Loan Details Preview */}
          {borrowAmount && parseFloat(borrowAmount) > 0 && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Borrow Amount</span>
                <span className="font-medium">{borrowAmount} USDT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest (30 days @ 10%)</span>
                <span className="font-medium">
                  {(parseFloat(estimatedRepayment) - parseFloat(borrowAmount)).toFixed(2)} USDT
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t">
                <span>Total Repayment</span>
                <span>{estimatedRepayment} USDT</span>
              </div>
            </div>
          )}

          {/* Transaction Result */}
          {txResult && (
            <Alert variant={txResult.success ? "default" : "destructive"}>
              {txResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{txResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Borrow Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleBorrow}
            disabled={
              isBorrowing ||
              !borrowAmount ||
              parseFloat(borrowAmount) <= 0 ||
              parseUSDT(borrowAmount) > creditAvailable
            }
          >
            {isBorrowing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Borrow Now"
            )}
          </Button>

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Loans must be active for at least 7 days before repayment</p>
            <p>• 10% APR for first 30 days, 20% APR after</p>
            <p>• Credit limit increases 20% with each successful repayment</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
