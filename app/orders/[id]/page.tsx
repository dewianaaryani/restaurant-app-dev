"use client";

import { useState, useEffect, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, CheckCircle, XCircle, ArrowLeft, Download } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Order } from "@/types";
import { toast } from "sonner";
import { MainNav } from "@/app/components/main-nav";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/utils/formatter";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/users/orders/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setOrder(data.order);
          } else {
            setOrder(null);
          }
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setOrder(null);
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const generatePDFReceipt = () => {
    if (!order) return;

    const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <title>Order Receipt - ${order.id}</title>
      <style>
          body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.6;
          }
          .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #ea580c;
              padding-bottom: 20px;
          }
          .logo {
              font-size: 28px;
              font-weight: bold;
              color: #ea580c;
              margin-bottom: 10px;
          }
          .restaurant-info {
              font-size: 14px;
              color: #666;
          }
          .order-info {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
          }
          .order-info h2 {
              margin: 0 0 15px 0;
              color: #ea580c;
              font-size: 20px;
          }
          .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
          }
          .info-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
          }
          .info-label {
              font-weight: bold;
              color: #555;
          }
          .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
          }
          .status-completed {
              background: #dcfce7;
              color: #166534;
          }
          .status-in-progress {
              background: #dbeafe;
              color: #1e40af;
          }
          .status-cancelled {
              background: #fee2e2;
              color: #dc2626;
          }
          .items-section {
              margin: 30px 0;
          }
          .items-section h3 {
              color: #ea580c;
              margin-bottom: 15px;
              font-size: 18px;
          }
          .item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              margin-bottom: 10px;
              background: white;
          }
          .item-details {
              flex: 1;
          }
          .item-name {
              font-weight: bold;
              margin-bottom: 5px;
          }
          .item-price {
              color: #666;
              font-size: 14px;
          }
          .item-total {
              font-weight: bold;
              color: #ea580c;
              font-size: 16px;
          }
          .summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
          }
          .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              padding: 5px 0;
          }
          .summary-row.total {
              border-top: 2px solid #ea580c;
              padding-top: 15px;
              margin-top: 15px;
              font-weight: bold;
              font-size: 18px;
              color: #ea580c;
          }
          .details-section {
              margin: 30px 0;
          }
          .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
          }
          .detail-box {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
          }
          .detail-box h4 {
              margin: 0 0 10px 0;
              color: #ea580c;
              font-size: 16px;
          }
          .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #666;
              font-size: 14px;
          }
          .thank-you {
              font-size: 18px;
              font-weight: bold;
              color: #ea580c;
              margin-bottom: 10px;
          }
          @media print {
              body { margin: 0; }
              .no-print { display: none; }
          }
      </style>
  </head>
  <body>
      <div class="header">
          <div class="logo">🍽️ DW Restaurant RESTAURANT</div>
          <div class="restaurant-info">
              123 Gourmet Street, Downtown District<br>
              New York, NY 10001<br>
              Tel: (555) 123-4567 | Email: info@bellavista.com
          </div>
      </div>
  
      <div class="order-info">
          <h2>Order Details</h2>
          <div class="info-grid">
              <div>
                  <div class="info-item">
                      <span class="info-label">ORD - </span>
                      <span>${order.id}</span>
                  </div>
                  <div class="info-item">
                      <span class="info-label">Customer:</span>
                      <span>${order.customer.name}</span>
                  </div>
                  <div class="info-item">
                      <span class="info-label">Email:</span>
                      <span>${order.customer.email}</span>
                  </div>
              </div>
              <div>
                  <div class="info-item">
                      <span class="info-label">Order Date:</span>
                      <span>${new Date(
                        order.order_time
                      ).toLocaleDateString()} at ${new Date(
      order.order_time
    ).toLocaleTimeString()}</span>
                  </div>
                  <div class="info-item">
                      <span class="info-label">Status:</span>
                      <span class="status-badge status-${
                        order.order_status
                      }">${order.order_status.replace("-", " ")}</span>
                  </div>
                
              </div>
          </div>
      </div>
  
      <div class="items-section">
          <h3>Order Items</h3>
          ${order.order_items
            .map(
              (item) => `
              <div class="item">
                  <div class="item-details">
                      <div class="item-name">${item.menu.name}</div>
                      <div class="item-price">${formatRupiah(item.price)} × ${
                item.quantity
              }</div>
                  </div>
                  <div class="item-total">${formatRupiah(
                    item.price * item.quantity
                  )}</div>
              </div>
          `
            )
            .join("")}
      </div>
  
      <div class="summary">
          <div class="summary-row total">
              <span>Total Amount:</span>
              <span>${formatRupiah(order.total_amount)}</span>
          </div>
      </div>
  
      <div class="footer">
          <div class="thank-you">Thank you for choosing DW Restaurant!</div>
          <p>We appreciate your business and hope you enjoyed your dining experience.</p>
          <p>For any questions or feedback, please contact us at info@bellavista.com</p>
          <p><small>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</small></p>
      </div>
  </body>
  </html>
      `;

    // Create and download PDF
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-receipt-${order.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Receipt Downloaded");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
      case "confirmed":
      case "preparing":
      case "ready":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="capitalize">
            {status}
          </Badge>
        );
    }
  };

  // Fix: Change parameter type to accept Rating[] | undefined
  // const getRatingValue = (ratings: Rating[] | undefined): number => {
  //   if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
  //     return 0;
  //   }
  //   return ratings[0].rating || 0;
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MainNav />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center mb-6">
              <Link
                href="/orders"
                className="flex items-center text-orange-600 hover:text-orange-800"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Orders
              </Link>
            </div>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">
                  The order you&apos;re looking for doesn&apos;t exist or you
                  don&apos;t have permission to view it.
                </p>
                <Button
                  onClick={() => router.push("/orders")}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  View All Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainNav />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-6">
            <Link
              href="/orders"
              className="flex items-center text-orange-600 hover:text-orange-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-2xl">Order {order.id}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Placed on {new Date(order.order_time).toLocaleDateString()}{" "}
                    at {new Date(order.order_time).toLocaleTimeString()}
                  </p>
                  {order.table.name && (
                    <p className="text-sm text-muted-foreground">
                      Table {order.table.name}
                    </p>
                  )}
                </div>
                {getStatusBadge(order.order_status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-3">Order Items</h3>
                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col md:flex-row gap-4 p-4 border rounded-lg"
                      >
                        <div className="relative h-20 w-20 flex-shrink-0">
                          <Image
                            src={item.menu.image || "/placeholder.svg"}
                            alt={item.menu.name}
                            fill
                            className="object-cover rounded-md"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div>
                              <h4 className="font-medium">{item.menu.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatRupiah(item.price)} x {item.quantity}
                              </p>
                              {item.customization && (
                                <p className="text-sm text-blue-600 mt-1">
                                  Note: {item.customization}
                                </p>
                              )}
                            </div>
                            <div className="text-right mt-2 md:mt-0">
                              <p className="font-medium">
                                {formatRupiah(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Order Summary */}
                <div>
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>{formatRupiah(order.total_amount)}</span>
                    </div>
                    {order.order_status === "completed" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cashier</span>
                          <span>{order.kasir_id}</span>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 md:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={generatePDFReceipt}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
