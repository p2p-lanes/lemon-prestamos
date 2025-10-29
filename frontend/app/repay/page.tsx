"use client";

/**
 * /repay - Repayment Screen
 * Screen for repaying active loans
 */

import { useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { useLoanData } from "@/hooks/use-loan-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { approveUSDT, repayLoan, repayDefaultedLoan } from "@/lib/lemon-sdk";
import { formatUSDT, ACTIVE_NETWORK } from "@/lib/contracts";
import { formatAddress, calculateTimeRemaining, getCurrentAPR, canRepay, formatTimeAgo } from "@/lib/blockchain";
import { getUSDTContract } from "@/lib/blockchain";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

export default function RepayPage() {
  const { wallet, isAuthenticated, isLoading: authLoading } = useWallet();
  const loanData = useLoanData(wallet);
  const [step, setStep] = useState<"check" | "approve" | "repay">("check");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txResult, setTxResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasAllowance, setHasAllowance] = useState(false);

  const checkAllowance = async () => {
    if (!wallet || !loanData.activeLoan) return;

    try {
      setIsProcessing(true);
      const usdt = getUSDTContract();
      const allowance = await usdt.allowance(wallet, ACTIVE_NETWORK.contracts.VAULT);

      if (allowance >= loanData.repaymentAmount) {
        setHasAllowance(true);
        setStep("repay");
      } else {
        setHasAllowance(false);
        setStep("approve");
      }
    } catch (error) {
      console.error("Error checking allowance:", error);
      setStep("approve");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!loanData.repaymentAmount) return;

    try {
      setIsProcessing(true);
      setTxResult(null);

      const result = await approveUSDT(loanData.repaymentAmount.toString());

      if (result.success) {
        setTxResult({
          success: true,
          message: "USDT approved successfully!"
        });
        setHasAllowance(true);
        setStep("repay");
      } else {
        setTxResult({
          success: false,
          message: result.error || "Approval failed"
        });
      }
    } catch (error) {
      setTxResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepay = async () => {
    if (!loanData.activeLoan) return;

    try {
      setIsProcessing(true);
      setTxResult(null);

      const result = loanData.activeLoan.isDefaulted
        ? await repayDefaultedLoan()
        : await repayLoan();

      if (result.success) {
        setTxResult({
          success: true,
          message: "Loan repaid successfully! Redirecting..."
        });

        // Redirect to home after 3 seconds
        setTimeout(() => {
          window.location.href = "/home";
        }, 3000);
      } else {
        setTxResult({
          success: false,
          message: result.error || "Repayment failed"
        });
      }
    } catch (error) {
      setTxResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsProcessing(false);
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

  if (!loanData.activeLoan) {
    return (
      <div className="container mx-auto p-4 max-w-2xl space-y-4">
        <Button
          variant="ghost"
          onClick={() => window.location.href = "/home"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have an active loan to repay.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const loan = loanData.activeLoan;
  const timeRemaining = calculateTimeRemaining(loan.timestamp);
  const currentAPR = getCurrentAPR(loan.timestamp);
  const canRepayNow = canRepay(loan.timestamp);
  const daysElapsed = Math.floor((Date.now() / 1000 - Number(loan.timestamp)) / 86400);
  const interest = loanData.repaymentAmount - loan.principal;

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => window.location.href = "/home"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Badge variant={loan.isDefaulted ? "destructive" : timeRemaining.isOverdue ? "destructive" : "default"}>
          {loan.isDefaulted ? "Defaulted" : timeRemaining.isOverdue ? "Overdue" : "Active"}
        </Badge>
      </div>

      {/* Loan Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Summary</CardTitle>
          <CardDescription>
            Borrowed {formatTimeAgo(loan.timestamp)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Principal</p>
              <p className="text-2xl font-bold">
                {formatUSDT(loan.principal)} USDT
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Interest</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatUSDT(interest)} USDT
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

          {!canRepayNow && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Loans must be active for at least 7 days before repayment. You can repay in {7 - daysElapsed} days.
              </AlertDescription>
            </Alert>
          )}

          {timeRemaining.isOverdue && !loan.isDefaulted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your loan is overdue. Interest rate increased to 20% APR.
              </AlertDescription>
            </Alert>
          )}

          {loan.isDefaulted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This loan has been marked as defaulted. You can still repay, but credit increase will be 10% instead of 20%.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Repayment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Repayment</CardTitle>
          <CardDescription>
            Amount needed to repay your loan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-4xl font-bold">
              {formatUSDT(loanData.repaymentAmount)} USDT
            </p>
          </div>

          {/* Credit Limit Info */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Credit Limit</span>
              <span className="font-medium">{formatUSDT(loanData.creditLimit)} USDT</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">After Repayment</span>
              <span className="font-medium text-green-600">
                {formatUSDT(BigInt(Math.floor(Number(loanData.creditLimit) * (loan.isDefaulted ? 1.1 : 1.2))))} USDT
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +{loan.isDefaulted ? "10" : "20"}% credit increase
            </p>
          </div>

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

          {/* Action Buttons */}
          <div className="space-y-2">
            {step === "check" && (
              <Button
                className="w-full"
                size="lg"
                onClick={checkAllowance}
                disabled={!canRepayNow || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Start Repayment"
                )}
              </Button>
            )}

            {step === "approve" && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  `Step 1: Approve ${formatUSDT(loanData.repaymentAmount)} USDT`
                )}
              </Button>
            )}

            {step === "repay" && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleRepay}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Repaying...
                  </>
                ) : (
                  `Step 2: Repay ${formatUSDT(loanData.repaymentAmount)} USDT`
                )}
              </Button>
            )}
          </div>

          {step !== "check" && (
            <p className="text-xs text-center text-muted-foreground">
              {step === "approve" && "First, approve USDT spending"}
              {step === "repay" && "Final step: Repay your loan"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
