"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Search, Edit, Trash2, Loader2, Package } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Types
interface MenuItem {
  id: string;
  category_id: string;
  categoryName: string;
  name: string;
  desc: string | null;
  image: string | null;
  is_available: boolean;
  price: number;
  stock: number;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  desc: string | null;
  menuCount: number;
  created_at: string;
  updated_at: string;
}

interface ApiError {
  error: string;
  details?: unknown;
}

// Form validation schema
const menuFormSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  desc: z.string().optional(),
  price: z.coerce
    .number()
    .int()
    .positive("Price must be a positive number in IDR"),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or greater"),
  image: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val === "") return true;
      try {
        new URL(val.startsWith("http") ? val : `https://${val}`);
        return true;
      } catch {
        return false;
      }
    }, "Please enter a valid image URL")
    .or(z.literal("")),
  is_available: z.boolean(),
});

// Stock management form schema
const stockFormSchema = z.object({
  quantity: z.coerce
    .number()
    .int()
    .positive("Quantity must be a positive number"),
  action: z.enum(["add", "set", "subtract"], {
    required_error: "Please select an action",
  }),
  reason: z.string().optional(),
});

type MenuFormData = z.infer<typeof menuFormSchema>;
type StockFormData = z.infer<typeof stockFormSchema>;

// Currency formatting utility
const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function MenuManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Stock management states
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockItem, setStockItem] = useState<MenuItem | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const form = useForm<MenuFormData>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: {
      category_id: "",
      name: "",
      desc: "",
      price: 0,
      stock: 0,
      image: "",
      is_available: true,
    },
  });

  const stockForm = useForm<StockFormData>({
    resolver: zodResolver(stockFormSchema),
    defaultValues: {
      quantity: 0,
      action: "add",
      reason: "",
    },
  });

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || "Failed to fetch categories");
      }
      const data: Category[] = await response.json();
      setCategories(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch categories";
      console.error("Error fetching categories:", error);
      toast.error(errorMessage);
    }
  }, []);

  // Fetch menu items
  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/menu";
      const params = new URLSearchParams();

      if (selectedCategory !== "all") {
        params.append("category_id", selectedCategory);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (availableOnly) {
        params.append("available", "true");
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || "Failed to fetch menu items");
      }
      const data: MenuItem[] = await response.json();
      setMenuItems(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch menu items";
      console.error("Error fetching menu items:", error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, availableOnly]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Dialog handlers
  const handleAddItem = () => {
    setEditingItem(null);
    form.reset({
      category_id: "",
      name: "",
      desc: "",
      price: 0,
      stock: 0,
      image: "",
      is_available: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    form.reset({
      category_id: item.category_id,
      name: item.name,
      desc: item.desc || "",
      price: item.price,
      stock: item.stock,
      image: item.image || "",
      is_available: item.is_available,
    });
    setIsDialogOpen(true);
  };

  // Stock management handlers
  const handleStockClick = (item: MenuItem) => {
    setStockItem(item);
    stockForm.reset({
      quantity: 0,
      action: "add",
      reason: "",
    });
    setStockDialogOpen(true);
  };

  const onStockSubmit = async (data: StockFormData) => {
    if (!stockItem) return;

    setStockLoading(true);
    try {
      const response = await fetch(`/api/menu/${stockItem.id}/stock`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: data.action,
          quantity: data.quantity,
          reason: data.reason || undefined,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update stock");
      }

      // Update the menu item in the list
      setMenuItems(
        menuItems.map((item) =>
          item.id === stockItem.id ? responseData.menu_item : item
        )
      );

      toast.success(responseData.message || "Stock updated successfully");
      setStockDialogOpen(false);
      stockForm.reset();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update stock";
      console.error("Error updating stock:", error);
      toast.error(errorMessage);
    } finally {
      setStockLoading(false);
    }
  };

  const onSubmit = async (data: MenuFormData) => {
    setFormLoading(true);

    try {
      const url = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          image: data.image || undefined,
          desc: data.desc || undefined,
        }),
      });

      const responseData: MenuItem | ApiError = await response.json();

      if (!response.ok) {
        const errorData = responseData as ApiError;
        throw new Error(errorData.error || "Operation failed");
      }

      const menuData = responseData as MenuItem;

      if (editingItem) {
        setMenuItems(
          menuItems.map((item) =>
            item.id === editingItem.id ? menuData : item
          )
        );
        toast.success("Menu item updated successfully");
      } else {
        setMenuItems([menuData, ...menuItems]);
        toast.success("Menu item created successfully");
      }

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save menu item";
      console.error("Error saving menu item:", error);
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/menu/${itemToDelete.id}`, {
        method: "DELETE",
      });

      const data: { message: string } | ApiError = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;
        throw new Error(errorData.error || "Failed to delete menu item");
      }

      setMenuItems(menuItems.filter((item) => item.id !== itemToDelete.id));
      toast.success("Menu item deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete menu item";
      console.error("Error deleting menu item:", error);
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const response = await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: item.category_id,
          name: item.name,
          desc: item.desc,
          price: item.price,
          stock: item.stock,
          image: item.image,
          is_available: !item.is_available,
        }),
      });

      const responseData: MenuItem | ApiError = await response.json();

      if (!response.ok) {
        const errorData = responseData as ApiError;
        throw new Error(errorData.error || "Failed to update availability");
      }

      const updatedItem = responseData as MenuItem;
      setMenuItems(
        menuItems.map((menuItem) =>
          menuItem.id === item.id ? updatedItem : menuItem
        )
      );

      toast.success(
        `Menu item ${updatedItem.is_available ? "enabled" : "disabled"}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update availability";
      console.error("Error updating availability:", error);
      toast.error(errorMessage);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setEditingItem(null);
    }
  };

  const handleStockDialogClose = (open: boolean) => {
    setStockDialogOpen(open);
    if (!open) {
      stockForm.reset();
      setStockItem(null);
    }
  };

  // Filter items for display
  const filteredItems = menuItems.filter((item) => {
    if (availableOnly && !item.is_available) return false;
    if (selectedCategory !== "all" && item.category_id !== selectedCategory)
      return false;
    if (
      searchQuery &&
      !item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Statistics
  const lowStockItems = menuItems.filter((item) => item.stock <= 5).length;

  const avgPrice =
    menuItems.length > 0
      ? menuItems.reduce((sum, item) => sum + item.price, 0) / menuItems.length
      : 0;

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
          <h2 className="text-3xl font-bold tracking-tight">Menu Management</h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={handleAddItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the menu item information below."
                  : "Create a new menu item for your restaurant."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter menu item name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="25000"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : parseInt(value) || 0
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Stock</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value === "" ? 0 : parseInt(value) || 0
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/image.jpg"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Available</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Make this item available for ordering
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingItem ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search menu items..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={availableOnly ? "default" : "outline"}
              onClick={() => setAvailableOnly(!availableOnly)}
            >
              Available Only
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <div className="grid gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-32 h-24 rounded-lg overflow-hidden">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {item.desc || "No description available"}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="secondary">{item.categoryName}</Badge>
                        <Badge
                          className={
                            item.is_available
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {item.is_available ? "Available" : "Unavailable"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            item.stock <= 5
                              ? "bg-red-50 text-red-700 border-red-200"
                              : item.stock <= 20
                              ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }
                        >
                          Stock: {item.stock}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">
                        {formatIDR(item.price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStockClick(item)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Stock
                      </Button>
                      <Switch
                        checked={item.is_available}
                        onCheckedChange={() => toggleAvailability(item)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteClick(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" || availableOnly
                ? "No menu items found matching your filters."
                : "No menu items found. Create your first menu item!"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{menuItems.length}</div>
            <p className="text-xs text-muted-foreground">Menu items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground">Items ≤ 5 stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(avgPrice)}</div>
            <p className="text-xs text-muted-foreground">Average price</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Management Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={handleStockDialogClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Manage Stock</DialogTitle>
            <DialogDescription>
              Update stock for &quot;{stockItem?.name}&quot;
              <br />
              Current stock: <strong>{stockItem?.stock || 0}</strong>
            </DialogDescription>
          </DialogHeader>
          <Form {...stockForm}>
            <form
              onSubmit={stockForm.handleSubmit(onStockSubmit)}
              className="space-y-4"
            >
              <FormField
                control={stockForm.control}
                name="action"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Action</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="add">
                          Add to current stock
                        </SelectItem>
                        <SelectItem value="subtract">
                          Subtract from stock
                        </SelectItem>
                        <SelectItem value="set">Set exact stock</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., New delivery, Inventory correction, Expired items"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      Optional reason for this stock change (will be logged)
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={stockForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {stockForm.watch("action") === "add"
                        ? "Quantity to Add"
                        : stockForm.watch("action") === "subtract"
                        ? "Quantity to Subtract"
                        : "New Stock Amount"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(
                            value === "" ? 0 : parseInt(value) || 0
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                    {stockForm.watch("action") === "add" &&
                      stockForm.watch("quantity") > 0 &&
                      stockItem && (
                        <p className="text-sm text-muted-foreground">
                          New stock will be:{" "}
                          {stockItem.stock + stockForm.watch("quantity")}
                        </p>
                      )}
                    {stockForm.watch("action") === "subtract" &&
                      stockForm.watch("quantity") > 0 &&
                      stockItem && (
                        <p className="text-sm text-muted-foreground">
                          New stock will be:{" "}
                          {Math.max(
                            0,
                            stockItem.stock - stockForm.watch("quantity")
                          )}
                        </p>
                      )}
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStockDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={stockLoading}>
                  {stockLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Stock
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{itemToDelete?.name}&rdquo;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
