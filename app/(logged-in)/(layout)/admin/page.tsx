"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  BarChart3,
  Eye,
} from "lucide-react";
import { Order, OrderStatus, User } from "@/types";
import { formatRupiah } from "@/utils/formatter";
import { toast } from "sonner";
import Link from "next/link";

interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  revenueChange: number;
  ordersToday: number;
  ordersChange: number;
  totalCustomers: number;
  customersChange: number;
  averageOrderValue: number;
  avgOrderChange: number;
  pendingOrders: number;
  cookingOrders: number;
  completedToday: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentOrders: Order[];
  topCustomers: User[];
}

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const data = await response.json();
      console.log(data);

      setDashboardData(data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - orderTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hour${
        Math.floor(diffInMinutes / 60) > 1 ? "s" : ""
      } ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${
      Math.floor(diffInMinutes / 1440) > 1 ? "s" : ""
    } ago`;
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

  if (!dashboardData) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center text-muted-foreground">
          Failed to load dashboard data
        </div>
      </div>
    );
  }

  const { stats, recentOrders } = dashboardData;

  const statsCards = [
    {
      title: "Total Revenue",
      value: formatRupiah(stats.totalRevenue),
      change: `+${stats.revenueChange}%`,
      icon: DollarSign,
      trend: stats.revenueChange >= 0 ? "up" : "down",
      description: `${formatRupiah(stats.todayRevenue)} today`,
    },
    {
      title: "Orders Today",
      value: stats.ordersToday.toString(),
      change: `${stats.ordersChange >= 0 ? "+" : ""}${stats.ordersChange}%`,
      icon: ShoppingCart,
      trend: stats.ordersChange >= 0 ? "up" : "down",
      description: `${stats.completedToday} completed`,
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      change: `+${stats.customersChange}%`,
      icon: Users,
      trend: stats.customersChange >= 0 ? "up" : "down",
      description: "Active customers",
    },
    {
      title: "Average Order",
      value: formatRupiah(stats.averageOrderValue),
      change: `${stats.avgOrderChange >= 0 ? "+" : ""}${stats.avgOrderChange}%`,
      icon: TrendingUp,
      trend: stats.avgOrderChange >= 0 ? "up" : "down",
      description: "Per order value",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Link href="/admin/reports">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center justify-between">
                <p
                  className={`text-xs ${
                    stat.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stat.change} from last month
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Status Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingOrders}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600">
              Cooking Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.cookingOrders}
            </div>
            <p className="text-xs text-muted-foreground">In kitchen</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedToday}
            </div>
            <p className="text-xs text-muted-foreground">Successfully served</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>
                  Latest orders from your restaurant
                </CardDescription>
              </div>
              <Link href="/admin/orders">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        #{order.id.toUpperCase()}
                      </span>
                      {getStatusBadge(order.order_status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name} • {order.table.name}
                    </p>
                    <p className="text-sm">
                      {order.order_items
                        .map((item) => item.menu.name)
                        .join(", ")}
                      {order.order_items.length > 2 &&
                        ` +${order.order_items.length - 2} more`}
                    </p>
                    {order.order_items.some((item) => item.customization) && (
                      <p className="text-xs text-blue-600">
                        Special requests included
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">
                      {formatRupiah(order.total_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeAgo(order.order_time)}
                    </p>
                    {order.kasir && (
                      <p className="text-xs text-muted-foreground">
                        By: {order.kasir.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your restaurant efficiently
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/orders">
              <Button className="w-full justify-start" variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View All Orders
              </Button>
            </Link>
            <Link href="/admin/customers">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Customers
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button className="w-full justify-start" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Analytics
              </Button>
            </Link>
            <Link href="/admin/menu">
              <Button className="w-full justify-start" variant="outline">
                <Clock className="mr-2 h-4 w-4" />
                Manage Menu
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button className="w-full justify-start bg-orange-600 hover:bg-orange-700">
                <DollarSign className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
