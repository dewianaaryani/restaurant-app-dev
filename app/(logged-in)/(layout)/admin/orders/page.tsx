"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { Order, OrderStatus, PaymentStatus } from "@/types";
import RefreshButton from "@/app/components/refresh-button";
import { toast } from "sonner";
import { formatRupiah } from "@/utils/formatter";

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/orders");

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

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        return (
          order.id.toLowerCase().includes(query) ||
          order.customer.name?.toLowerCase().includes(query) ||
          order.customer.email.toLowerCase().includes(query) ||
          order.table.name.toLocaleLowerCase().includes(query) ||
          order.order_items.some((item) =>
            item.menu.name.toLowerCase().includes(query)
          )
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.order_status === statusFilter
      );
    }

    // Payment filter
    if (paymentFilter !== "all") {
      filtered = filtered.filter(
        (order) => order.payment_status === paymentFilter
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case "today":
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_time);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === today.getTime();
          });
          break;
        case "yesterday":
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_time);
            orderDate.setHours(0, 0, 0, 0);
            return orderDate.getTime() === yesterday.getTime();
          });
          break;
        case "week":
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_time);
            return orderDate >= weekAgo;
          });
          break;
        case "month":
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          filtered = filtered.filter((order) => {
            const orderDate = new Date(order.order_time);
            return orderDate >= monthAgo;
          });
          break;
      }
    }

    // Sort by order time (newest first)
    return filtered.sort(
      (a, b) =>
        new Date(b.order_time).getTime() - new Date(a.order_time).getTime()
    );
  }, [orders, searchQuery, statusFilter, paymentFilter, dateFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    dateFilter !== "all";

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "cooking":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Cooking
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "ready":
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">
            Order Management
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <RefreshButton />
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter Orders</CardTitle>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, customer, table, or menu..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cooking">Cooking</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: &quot;{searchQuery}&quot;
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                </Badge>
              )}
              {paymentFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Payment: {paymentFilter}
                </Badge>
              )}
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Date:{" "}
                  {dateFilter === "today"
                    ? "Today"
                    : dateFilter === "yesterday"
                    ? "Yesterday"
                    : dateFilter === "week"
                    ? "Last 7 Days"
                    : dateFilter === "month"
                    ? "Last 30 Days"
                    : dateFilter}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      )}

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {hasActiveFilters ? (
                  <>
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No orders found matching your filters.</p>
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Clear filters to see all orders
                    </Button>
                  </>
                ) : (
                  <p>No orders available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold">
                            #{order.id.toUpperCase()}
                          </h3>
                          {getStatusBadge(order.order_status)}
                          {getPaymentStatusBadge(order.payment_status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.customer.name} • {order.customer.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.table.name} •{" "}
                          {new Date(order.order_time).toLocaleString()}
                        </p>
                        {order.kasir && (
                          <p className="text-sm text-muted-foreground">
                            Cashier: {order.kasir.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-orange-600">
                          {formatRupiah(order.total_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.order_items.length} items
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Order Items:</p>
                      <div className="space-y-1">
                        {order.order_items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {item.quantity}x {item.menu.name}
                              {item.customization && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({item.customization})
                                </span>
                              )}
                            </span>
                            <span>{formatRupiah(item.subtotal)}</span>
                          </div>
                        ))}
                        {order.order_items.length > 3 && (
                          <p className="text-sm text-muted-foreground">
                            +{order.order_items.length - 3} more items
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewOrderDetails(order)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Order Details - #{selectedOrder?.id.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Complete order information and items
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Customer Information</h4>
                  <p className="text-sm">{selectedOrder.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.customer.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.table.name}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Order Information</h4>
                  <p className="text-sm">
                    Order Time:{" "}
                    {new Date(selectedOrder.order_time).toLocaleString()}
                  </p>
                  {selectedOrder.completed_time && (
                    <p className="text-sm">
                      Completed:{" "}
                      {new Date(selectedOrder.completed_time).toLocaleString()}
                    </p>
                  )}
                  {selectedOrder.kasir && (
                    <p className="text-sm">
                      Processed by: {selectedOrder.kasir.name}
                    </p>
                  )}
                  <div className="flex space-x-2 mt-2">
                    {getStatusBadge(selectedOrder.order_status)}
                    {getPaymentStatusBadge(selectedOrder.payment_status)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{item.menu.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatRupiah(item.price)} x {item.quantity}
                        </p>
                        {item.menu.desc && (
                          <p className="text-xs text-muted-foreground">
                            {item.menu.desc}
                          </p>
                        )}
                        {item.customization && (
                          <p className="text-sm text-blue-600">
                            Note: {item.customization}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold">
                        {formatRupiah(item.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-4 border-t font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-orange-600">
                    {formatRupiah(selectedOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? "Filtered" : "All time"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {
                filteredOrders.filter(
                  (order) => order.order_status === "pending"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cooking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                filteredOrders.filter(
                  (order) => order.order_status === "cooking"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">In kitchen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                filteredOrders.filter(
                  (order) => order.order_status === "completed"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatRupiah(
                filteredOrders.reduce(
                  (sum, order) => sum + order.total_amount,
                  0
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? "Filtered" : "Total"} revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
