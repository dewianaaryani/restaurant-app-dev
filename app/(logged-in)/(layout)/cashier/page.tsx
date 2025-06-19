"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  Download,
  Printer,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Order, OrderStatus, PaymentStatus } from "@/types";
import { formatRupiah } from "@/utils/formatter";
import { toast } from "sonner";
import RefreshButton from "@/app/components/refresh-button";

export default function CashierDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cashier");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, []);

  const openPaymentDialog = (order: Order) => {
    setSelectedOrder(order);
    setReceivedAmount("");
    setIsPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    if (!selectedOrder) return;

    setIsProcessing(true);

    try {
      const res = await fetch(`/api/cashier/orders/${selectedOrder.id}/pay`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to process payment");
      }

      const data = await res.json();
      console.log("Payment response:", data);

      toast.success("Payment successful!");
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error("Payment failed");
    }

    setIsProcessing(false);
    setIsPaymentDialogOpen(false);

    // Open receipt dialog
    setTimeout(() => {
      setIsReceiptDialogOpen(true);
    }, 500);
  };

  const generatePDFReceipt = (order: Order) => {
    const receiptContent = `
BELLA VISTA RESTAURANT
123 Gourmet Street, Downtown District
New York, NY 10001
Tel: (555) 123-4567

================================
RECEIPT
================================

Order ID: ${order.id}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Table: ${order.table.name}
Customer: ${order.customer.name}

--------------------------------
ITEMS:
--------------------------------
${order.order_items
  .map(
    (item) =>
      `${item.quantity}x ${item.menu.name.padEnd(20)} $${item.subtotal.toFixed(
        2
      )}`
  )
  .join("\n")}

--------------------------------
SUMMARY:
--------------------------------

TOTAL:           ${formatRupiah(order.total_amount)}

Payment Method:  "Cash"
Status: PAID
Cashier ID: ${order.kasir_id || "N/A"}

Thank you for dining with us!
Visit us again soon.

================================
    `;

    // Create and download the receipt
    const blob = new Blob([receiptContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printReceipt = (order: Order) => {
    const receiptWindow = window.open("", "_blank");
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${order.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .separator { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>BELLA VISTA RESTAURANT</h2>
              <p>123 Gourmet Street, Downtown District<br>
              New York, NY 10001<br>
              Tel: (555) 123-4567</p>
            </div>
            
            <div class="separator"></div>
            
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
            <p><strong>Table:</strong> ${order.table.name}</p>
            <p><strong>Customer:</strong> ${order.customer.name}</p>
            
            <div class="separator"></div>
            
            <h3>ITEMS:</h3>
            ${order.order_items
              .map(
                (item) =>
                  `<p>${item.quantity}x ${
                    item.menu.name
                  } - $${item.subtotal.toFixed(2)}</p>`
              )
              .join("")}
            
            <div class="separator"></div>
            
          
            <p class="total">TOTAL: ${formatRupiah(order.total_amount)}</p>
            
            <div class="separator"></div>
            <p><strong>Status:</strong> PAID</p>
            <p><strong>Cashier ID:</strong> ${order.kasir_id || "N/A"}</p>
            
            <div class="separator"></div>
            
            <div class="header">
              <p>Thank you for dining with us!<br>
              Visit us again soon.</p>
            </div>
          </body>
        </html>
      `);
      receiptWindow.document.close();
      receiptWindow.print();
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Payment
          </Badge>
        );

      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "ready":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case "cooking":
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <Clock className="h-3 w-3 mr-1" />
            Cooking
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateChange = () => {
    if (!selectedOrder || !receivedAmount) return 0;
    const finalTotal = selectedOrder.total_amount;
    return Number.parseFloat(receivedAmount) - finalTotal;
  };

  // Filter orders that are ready for payment (order_status: ready, payment_status: pending)
  const pendingOrders = orders.filter(
    (order) =>
      order.order_status === "ready" && order.payment_status === "pending"
  );
  const paidOrders = orders.filter((order) => order.payment_status === "paid");

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Cashier</h2>
        </div>
        <div className="flex items-center space-x-2">
          <RefreshButton />
        </div>
      </div>

      {/* Cashier Stats */}
      {/* <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payment
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {pendingOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Orders ready for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidOrders.length}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {paidOrders
                .reduce((sum, order) => sum + order.total_amount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Transaction
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {paidOrders.length > 0
                ? (
                    paidOrders.reduce(
                      (sum, order) => sum + order.total_amount,
                      0
                    ) / paidOrders.length
                  ).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Per order</p>
          </CardContent>
        </Card>
      </div> */}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pending Payment ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid Orders ({paidOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {pendingOrders.map((order) => {
              return (
                <Card
                  key={order.id}
                  className="border-yellow-200 bg-yellow-50/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {order.customer.name} • Table {order.table.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getOrderStatusBadge(order.order_status)}
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          {formatRupiah(order.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.order_time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-2">Items:</h4>
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm"
                            >
                              <span>
                                {item.quantity}x {item.menu.name}
                                {item.customization && (
                                  <span className="text-blue-600">
                                    {" "}
                                    ({item.customization})
                                  </span>
                                )}
                              </span>
                              <span>{formatRupiah(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center font-medium">
                        <span>Total Amount:</span>
                        <span className="text-lg">
                          {formatRupiah(order.total_amount)}
                        </span>
                      </div>

                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          onClick={() => openPaymentDialog(order)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Process Payment
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="paid" className="space-y-4">
          <div className="grid gap-4">
            {paidOrders.map((order) => {
              return (
                <Card
                  key={order.id}
                  className="border-green-200 bg-green-50/50"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{order.id}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {order.customer.name} • Table {order.table.name}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {getOrderStatusBadge(order.order_status)}
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {formatRupiah(order.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.completed_time &&
                            new Date(order.completed_time).toLocaleTimeString()}
                        </p>
                        {order.kasir_id && (
                          <p className="text-xs text-muted-foreground">
                            Cashier: {order.kasir_id}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsReceiptDialogOpen(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        View Receipt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printReceipt(order)}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generatePDFReceipt(order)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              {selectedOrder &&
                `Order ${selectedOrder.id} - ${selectedOrder.customer.name}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total amount to pay:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatRupiah(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="received">Amount Received</Label>
                <Input
                  id="received"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                />
                {receivedAmount && (
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="flex justify-between text-sm">
                      <span>Change:</span>
                      <span className="font-medium">
                        {calculateChange() >= 0
                          ? formatRupiah(calculateChange())
                          : "Insufficient amount"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={processPayment}
              disabled={isProcessing || calculateChange() < 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order ${selectedOrder.id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Receipt Preview */}
              <div className="p-4 bg-white border rounded-lg font-mono text-sm">
                <div className="text-center mb-4">
                  <h3 className="font-bold">BELLA VISTA RESTAURANT</h3>
                  <p className="text-xs">123 Gourmet Street</p>
                  <p className="text-xs">Tel: (555) 123-4567</p>
                </div>

                <div className="border-t border-dashed pt-2 mb-2">
                  <p>Order: {selectedOrder.id}</p>
                  <p>Table: {selectedOrder.table.name}</p>
                  <p>Customer: {selectedOrder.customer.name}</p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="border-t border-dashed pt-2 mb-2">
                  {selectedOrder.order_items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.menu.name}
                      </span>
                      <span>{formatRupiah(item.subtotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed pt-2">
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(selectedOrder.total_amount)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed pt-2 mt-2">
                  <p>Status: PAID</p>
                  {selectedOrder.kasir_id && (
                    <p>Cashier: {selectedOrder.kasir_id}</p>
                  )}
                </div>

                <div className="text-center mt-4 text-xs">
                  <p>Thank you for dining with us!</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => printReceipt(selectedOrder)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => generatePDFReceipt(selectedOrder)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
