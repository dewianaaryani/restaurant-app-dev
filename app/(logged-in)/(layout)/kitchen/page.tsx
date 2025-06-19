"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Clock,
  ChefHat,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { Menu, Order } from "@/types";
import { formatRupiah } from "@/utils/formatter";
import { toast } from "sonner";
import RefreshButton from "@/app/components/refresh-button";

export default function KitchenDashboard() {
  //stats need api
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuItems, setMenuItems] = useState<Menu[]>([]);
  const fetchMenus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/kitchen/menus");
      if (!response.ok) {
        throw new Error("Failed to fetch menus");
      }
      const data = await response.json();
      setMenuItems(data);
    } catch (error) {
      console.error("Error fetching menus:", error);
      toast.error("Failed to fetch menus");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchMenus();
  }, []);
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/kitchen/orders");
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

  // With loading state management
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const updateOrderStatusWithLoading = async (
    orderId: string,
    newStatus: Order["order_status"]
  ) => {
    if (isUpdatingStatus) return; // Prevent multiple simultaneous updates

    setIsUpdatingStatus(orderId);

    try {
      const response = await fetch("/api/kitchen/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          order_id: orderId,
          order_status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update order status");
      }

      toast.success(result.message);
      await fetchOrders();
      return result;
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
      throw error;
    } finally {
      setIsUpdatingStatus(null);
    }
  };
  const [togglingAvailability, setTogglingAvailability] = useState<
    string | null
  >(null);

  const toggleMenuAvailabilityWithLoading = async (menuId: string) => {
    if (togglingAvailability) return; // Prevent multiple simultaneous updates

    setTogglingAvailability(menuId);

    try {
      const response = await fetch("/api/kitchen/menus", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          menu_id: menuId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to toggle menu availability");
      }

      toast.success(result.message);
      await fetchMenus();

      return result;
    } catch (error) {
      console.error("Error toggling menu availability:", error);
      toast.error("Failed to update menu availability");
      throw error;
    } finally {
      setTogglingAvailability(null);
    }
  };

  const getOrderStatusBadge = (status: Order["order_status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cooking":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <ChefHat className="h-3 w-3 mr-1" />
            Cooking
          </Badge>
        );
      case "ready":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Sort orders by priority and time
  const sortedOrders = [...orders].sort((a, b) => {
    // Then by time (oldest first)
    return new Date(a.order_time).getTime() - new Date(b.order_time).getTime();
  });
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
          <h2 className="text-3xl font-bold tracking-tight">
            Kitchen Dashboard
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <RefreshButton />
        </div>
      </div>

      {/* Kitchen Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {
                orders.filter((order) => order.order_status === "pending")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Waiting to cook</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Currently Cooking
            </CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                orders.filter((order) => order.order_status === "cooking")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ready to Serve
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter((order) => order.order_status === "ready").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unavailable Items
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {menuItems.filter((item) => !item.is_available).length}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">Incoming Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu Status</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-4">
            {sortedOrders.map((order) => (
              <Card
                key={order.id}
                className={`${
                  order.order_status === "cooking"
                    ? "border-blue-200 bg-blue-50/50"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div>
                        <CardTitle className="text-lg">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {order.customer.name} • Table {order.table.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getOrderStatusBadge(order.order_status)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Total: {formatRupiah(order.total_amount)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-medium mb-2">Order Items:</h4>
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {item.quantity}x
                              </span>
                              <span>{item.menu.name}</span>
                              {item.customization && (
                                <span className="text-sm text-blue-600">
                                  ({item.customization})
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      {order.order_status === "pending" && (
                        <Button
                          onClick={() =>
                            updateOrderStatusWithLoading(order.id, "cooking")
                          }
                          disabled={isUpdatingStatus === order.id}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUpdatingStatus === order.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ChefHat className="h-4 w-4 mr-2" />
                              Start Cooking
                            </>
                          )}
                        </Button>
                      )}

                      {order.order_status === "cooking" && (
                        <Button
                          onClick={() =>
                            updateOrderStatusWithLoading(order.id, "ready")
                          }
                          disabled={isUpdatingStatus === order.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {isUpdatingStatus === order.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Ready
                            </>
                          )}
                        </Button>
                      )}

                      {order.order_status === "ready" && (
                        <Button variant="outline" disabled>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Ready
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <div className="grid gap-4">
            {menuItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.category?.name}
                        </p>
                        <p className="text-sm font-medium">
                          {formatRupiah(item.price)}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge
                            className={
                              item.is_available
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {item.is_available ? "Available" : "Unavailable"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium mb-2">
                          Availability:
                        </p>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.is_available}
                            disabled={togglingAvailability === item.id}
                            onCheckedChange={() =>
                              toggleMenuAvailabilityWithLoading(item.id)
                            }
                          />
                          <span className="text-sm">
                            {togglingAvailability === item.id
                              ? "Updating..."
                              : item.is_available
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
