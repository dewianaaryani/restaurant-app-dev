"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Search, Edit, Trash2, Table2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Types
interface Table {
  id: string;
  name: string;
  desc: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiError {
  error: string;
}

const tableFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be less than 255 characters"),
  desc: z.string().optional(),
});

type TableFormData = z.infer<typeof tableFormSchema>;

export default function TableManagement() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      desc: "",
    },
  });

  // Fetch tables from API
  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/tables");

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || "Failed to fetch tables");
      }

      const data: Table[] = await response.json();
      setTables(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch tables";
      console.error("Error fetching tables:", error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTable = () => {
    setEditingTable(null);
    form.reset({ name: "", desc: "" });
    setIsDialogOpen(true);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    form.reset({
      name: table.name,
      desc: table.desc || "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: TableFormData) => {
    setFormLoading(true);

    try {
      const url = editingTable
        ? `/api/admin/tables/${editingTable.id}`
        : "/api/admin/tables";

      const method = editingTable ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name.trim(),
          desc: data.desc?.trim() || undefined,
        }),
      });

      const responseData: Table | ApiError = await response.json();

      if (!response.ok) {
        const errorData = responseData as ApiError;
        throw new Error(errorData.error || "Operation failed");
      }

      const tableData = responseData as Table;

      if (editingTable) {
        // Update existing table
        setTables(
          tables.map((table) =>
            table.id === editingTable.id ? tableData : table
          )
        );
        toast.success("Table updated successfully");
      } else {
        // Add new table
        setTables([tableData, ...tables]);
        toast.success("Table created successfully");
      }

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save table";
      console.error("Error saving table:", error);
      toast.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = (table: Table) => {
    setTableToDelete(table);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) return;

    try {
      const response = await fetch(`/api/admin/tables/${tableToDelete.id}`, {
        method: "DELETE",
      });

      const data: { message: string } | ApiError = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;
        throw new Error(errorData.error || "Failed to delete table");
      }

      setTables(tables.filter((table) => table.id !== tableToDelete.id));
      toast.success("Table deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete table";
      console.error("Error deleting table:", error);
      toast.error(errorMessage);
    } finally {
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setEditingTable(null);
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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">
            Table Management
          </h2>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button onClick={handleAddTable}>
              <Plus className="mr-2 h-4 w-4" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingTable ? "Edit Table" : "Add New Table"}
              </DialogTitle>
              <DialogDescription>
                {editingTable
                  ? "Update the table information below."
                  : "Create a new table for your database."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter table name" {...field} />
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
                          placeholder="Enter table description (optional)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={formLoading}>
                    {formLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingTable ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Tables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tables Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => (
          <Card key={table.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                <Table2 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">{table.name}</CardTitle>
              </div>
              <Badge variant="secondary">Table</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {table.desc || "No description available"}
              </p>
              <div className="flex flex-col space-y-2">
                <div className="text-xs text-muted-foreground">
                  Created:{" "}
                  {format(new Date(table.created_at), "d MMMM yyyy", {
                    locale: id,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated:{" "}
                  {format(new Date(table.updated_at), "d MMMM yyyy", {
                    locale: id,
                  })}
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditTable(table)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeleteClick(table)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTables.length === 0 && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No tables found matching your search."
                : "No tables found. Create your first table!"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tables.length}</div>
            <p className="text-xs text-muted-foreground">Active tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                tables.filter(
                  (table) =>
                    new Date(table.created_at) >
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Created this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tables with Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.filter((table) => table.desc).length}
            </div>
            <p className="text-xs text-muted-foreground">Have descriptions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Name Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tables.length > 0
                ? Math.round(
                    tables.reduce((sum, table) => sum + table.name.length, 0) /
                      tables.length
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Characters</p>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the table &ldquo;
              {tableToDelete?.name}&rdquo;. This action cannot be undone.
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
