"use client";

import React, { useState } from "react";
import { CreditCard, DollarSign, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onOpenChange,
  orderId,
  totalAmount,
  onPaymentSuccess,
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Mask card number
    if (name === "cardNumber") {
      const masked = value.replace(/\s/g, "").slice(0, 16);
      const formatted = masked.replace(/(\d{4})(?=\d)/g, "$1 ");
      setCardDetails((prev) => ({ ...prev, [name]: formatted }));
      return;
    }

    // Format expiry date
    if (name === "expiryDate") {
      const formatted = value.replace(/\D/g, "").slice(0, 4);
      if (formatted.length >= 2) {
        const result = formatted.slice(0, 2) + "/" + formatted.slice(2, 4);
        setCardDetails((prev) => ({ ...prev, [name]: result }));
      } else {
        setCardDetails((prev) => ({ ...prev, [name]: formatted }));
      }
      return;
    }

    // CVV only numbers
    if (name === "cvv") {
      const cvvOnly = value.replace(/\D/g, "").slice(0, 3);
      setCardDetails((prev) => ({ ...prev, [name]: cvvOnly }));
      return;
    }

    setCardDetails((prev) => ({ ...prev, [name]: value }));
  };

  const validatePayment = () => {
    if (paymentMethod === "CARD") {
      if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, "").length < 16) {
        toast({
          title: "Invalid Card",
          description: "Please enter a valid 16-digit card number",
          variant: "destructive",
        });
        return false;
      }
      if (!cardDetails.expiryDate || cardDetails.expiryDate.length < 5) {
        toast({
          title: "Invalid Expiry",
          description: "Please enter expiry date (MM/YY)",
          variant: "destructive",
        });
        return false;
      }
      if (!cardDetails.cvv || cardDetails.cvv.length < 3) {
        toast({
          title: "Invalid CVV",
          description: "Please enter a valid CVV",
          variant: "destructive",
        });
        return false;
      }
      if (!cardDetails.cardholderName) {
        toast({
          title: "Invalid Name",
          description: "Please enter cardholder name",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validatePayment()) return;

    setIsProcessing(true);
    try {
      const response = await axios.post("/api/payments/create-session", {
        orderId,
        totalAmount,
        paymentMethod,
      });

      const data = response.data as any;
      if (data.success) {
        toast({
          title: "Payment Successful",
          description: `Transaction ID: ${data.transaction_id}`,
        });
        onPaymentSuccess();
        onOpenChange(false);
        setCardDetails({
          cardNumber: "",
          expiryDate: "",
          cvv: "",
          cardholderName: "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.response?.data?.error || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </DialogTitle>
          <DialogDescription>
            Complete your payment to proceed with the order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Order Amount:</span>
              <span className="text-lg font-semibold flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                <SelectItem value="DEMO">Demo Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Demo Payment Info */}
          {paymentMethod === "DEMO" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is a demo payment. No actual charge will be made.
              </AlertDescription>
            </Alert>
          )}

          {/* Card Details */}
          {paymentMethod === "CARD" && (
            <div className="space-y-3 bg-blue-50 p-3 rounded-lg">
              <div>
                <Label className="text-sm">Card Number</Label>
                <Input
                  placeholder="1234 5678 9012 3456"
                  name="cardNumber"
                  value={cardDetails.cardNumber}
                  onChange={handleCardChange}
                  maxLength={19}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm">Cardholder Name</Label>
                <Input
                  placeholder="John Doe"
                  name="cardholderName"
                  value={cardDetails.cardholderName}
                  onChange={handleCardChange}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Expiry (MM/YY)</Label>
                  <Input
                    placeholder="12/25"
                    name="expiryDate"
                    value={cardDetails.expiryDate}
                    onChange={handleCardChange}
                    maxLength={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">CVV</Label>
                  <Input
                    placeholder="123"
                    name="cvv"
                    value={cardDetails.cvv}
                    onChange={handleCardChange}
                    maxLength={3}
                    type="password"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bank Transfer Info */}
          {paymentMethod === "BANK_TRANSFER" && (
            <Alert>
              <AlertDescription>
                <p className="text-sm mb-2">Transfer details:</p>
                <p className="text-xs">Bank: National Hospital Bank</p>
                <p className="text-xs">Account: 123456789</p>
                <p className="text-xs">IFSC: NHB0001234</p>
              </AlertDescription>
            </Alert>
          )}

          {/* UPI Info */}
          {paymentMethod === "UPI" && (
            <Alert>
              <AlertDescription>
                <p className="text-sm">UPI ID: hospital@upi</p>
                <p className="text-xs text-gray-600 mt-1">A UPI payment link will be sent to your registered email.</p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? "Processing..." : `Pay $${totalAmount.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
