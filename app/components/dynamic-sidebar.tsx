"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  ShoppingCart,
  BarChart3,
  ChefHat,
  LogOut,
  FolderOpen,
  CreditCard,
  Table,
  LucideSquareTerminal,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

interface NavigationItem {
  title: string;
  url: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  roles: string[];
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
  {
    title: "Category Management",
    url: "/admin/categories",
    icon: FolderOpen,
    roles: ["admin"],
  },
  {
    title: "Table Management",
    url: "/admin/tables",
    icon: Table,
    roles: ["admin"],
  },
  {
    title: "Menu Management",
    url: "/admin/menu",
    icon: UtensilsCrossed,
    roles: ["admin"],
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Order Management",
    url: "/admin/orders",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    title: "Kitchen Orders",
    url: "/kitchen/orders",
    icon: ChefHat,
    roles: ["kitchen"],
  },
  {
    title: "Payment Processing",
    url: "/cashier/payments",
    icon: CreditCard,
    roles: ["cashier"],
  },
  {
    title: "Reports",
    url: "/admin/reports",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    title: "Logs",
    url: "/admin/logs",
    icon: LucideSquareTerminal,
    roles: ["admin"],
  },
];

interface DynamicSidebarProps {
  userRole: string;
}

export function DynamicSidebar({ userRole = "staff" }: DynamicSidebarProps) {
  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "staff":
        return "bg-blue-100 text-blue-800";
      case "kitchen":
        return "bg-green-100 text-green-800";
      case "cashier":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-orange-600" />
            <span className="font-semibold text-lg">Dw Restaurant</span>
          </div>
          <Badge className={getRoleColor(userRole)}>
            {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </Badge>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.url}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <item.icon className="h-4 w-4 mr-2" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600"
                onClick={async () => await signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </Button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
