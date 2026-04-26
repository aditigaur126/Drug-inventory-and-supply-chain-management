"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useOrder } from "@/hooks/use-order";
import useInventory from "@/hooks/use-inventory";
import BreadCrumb from "@/components/BreadCrumb";
import SearchInputField from "@/components/SearchInputField";
import OrderFilters from "./order-filter";
import OrderSorting from "./order-sorting";

import PaginationComponent from "@/components/PaginationComponent";
import TotalSalesChart from "@/components/Graph Charts/TotalSalesChart";
import InventoryLevelsChart from "@/components/Graph Charts/InventoryLevelsChart";
import OrderStatusChart from "@/components/Graph Charts/OrderStatusChart";
import SupplierPerformanceChart from "@/components/Graph Charts/SupplierPerformanceChart";
import OrderLoadingComponent from "@/components/Order Components/OrderLoadingComponent";
import Cart, { CartItem } from "./cart";
import OrderSheet from "./order-sheet";
import OrderTable from "./order-table";
import { useCart } from "@/hooks/use-cart";

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("date");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const { clearCart } = useCart();
  const { loading, error, orders, fetchOrders, createOrder } = useOrder();
  const {
    items: inventoryItems,
    fetchItems: fetchInventoryItems,
    loading: inventoryLoading,
  } = useInventory();

  useEffect(() => {
    fetchOrders();
    fetchInventoryItems();
  }, [fetchOrders, fetchInventoryItems]);

  const totalSalesSeries = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const byDay = new Map<string, number>();
    for (const order of orders) {
      const date = new Date(order.order_date);
      const dayLabel = date.toLocaleDateString(undefined, {
        month: "short",
        day: "2-digit",
      });
      byDay.set(dayLabel, (byDay.get(dayLabel) || 0) + order.total_amount);
    }

    return Array.from(byDay.entries())
      .slice(-7)
      .map(([x, y]) => ({ x, y: Number(y.toFixed(2)) }));
  }, [orders]);

  const orderStatusSlices = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const byStatus = new Map<string, number>();
    for (const order of orders) {
      byStatus.set(order.status, (byStatus.get(order.status) || 0) + 1);
    }

    return Array.from(byStatus.entries()).map(([id, value]) => ({ id, value }));
  }, [orders]);

  const inventoryLevelBars = useMemo(() => {
    if (!inventoryItems || inventoryItems.length === 0) {
      return [];
    }

    const byItem = new Map<string, number>();
    for (const item of inventoryItems) {
      byItem.set(item.item_name, (byItem.get(item.item_name) || 0) + item.quantity);
    }

    return Array.from(byItem.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));
  }, [inventoryItems]);

  const supplierPerformanceSeries = useMemo(() => {
    if (!orders || orders.length === 0) {
      return [];
    }

    const supplierTotals = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.orderItems || []) {
        supplierTotals.set(
          item.item_supplier,
          (supplierTotals.get(item.item_supplier) || 0) + item.quantity * item.unit_price
        );
      }
    }

    const topSuppliers = Array.from(supplierTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return topSuppliers.map(([supplier, total]) => ({
      id: supplier,
      data: [
        { x: "Current", y: Number(total.toFixed(2)) },
        { x: "Projected", y: Number((total * 1.08).toFixed(2)) },
      ],
    }));
  }, [orders]);

  const handleCheckout = async (cartItems: CartItem[]) => {
    try {
      const currentDate = new Date();
      const expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() + 5);

      const submissionData = {
        order_date: currentDate.toISOString(),
        expected_delivery_date: expectedDate.toISOString(),
        orderItems: cartItems.map((item) => ({
          item_id: item.item.item_id,
          item_name: item.item.item_name,
          unit_price: item.unit_price,
          item_category: item.item.category,
          description: item.item.description,
          item_supplier: item.item.supplier,
          quantity: item.quantity,
          department: item.department.department,
        })),
        vendor: cartItems.map((item) => item.item.supplier).join(", "),
        status: "pending",
        paymentStatus: false,
        total_amount: cartItems.reduce(
          (total, item) => total + item.quantity * item.unit_price,
          0
        ),
      };

      if (!loading && !inventoryLoading) {
        await createOrder(submissionData);
        await clearCart();
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to create order:", error);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      const matchesSearch = (order.id || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesStatusFilter =
        selectedFilters.length === 0 ||
        selectedFilters.includes(order.status.toLowerCase());

      return matchesSearch && matchesStatusFilter;
    });
  }, [orders, searchQuery, selectedFilters]);

  const sortedFilteredOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        );
      } else if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      } else if (sortBy === "amount") {
        return b.total_amount - a.total_amount;
      }
      return 0;
    });
  }, [filteredOrders, sortBy]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedFilteredOrders.length / pageSize);
  }, [sortedFilteredOrders, pageSize]);

  const paginatedFilteredOrders = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedFilteredOrders.slice(startIndex, startIndex + pageSize);
  }, [sortedFilteredOrders, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPage(1);
    },
    []
  );

  if (loading) {
    return (
      <div className="w-full bg-muted/40">
        <OrderLoadingComponent />
      </div>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  return (
    <div className="min-h-screen bg-muted/40 w-full">
      <div className="flex-1 w-full overflow-y-auto p-4 md:p-6  space-y-4">
        <BreadCrumb
          paths={[
            { pageName: "Dashboard", path: "/dashboard" },
            { pageName: "Orders", path: "/dashboard/orders" },
          ]}
        />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <div className="flex space-x-4 items-center">
            <div>
              <OrderSheet loading={loading} />
            </div>
            <div>
              <Cart onCheckout={handleCheckout} />
            </div>
          </div>
        </div>
        <div className="bg-background border rounded-lg overflow-hidden w-full">
          <div className="px-6 py-4 border-b flex flex-row items-start md:items-center justify-between gap-4">
            <SearchInputField
              className="w-full md:w-1/2"
              placeholder="Search Orders..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <div className="flex items-center gap-4 w-full md:w-auto">
              <OrderFilters
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
              />
              <OrderSorting sortBy={sortBy} setSortBy={setSortBy} />
            </div>
          </div>
          <div className="p-2 md:p-5">
            <OrderTable orders={paginatedFilteredOrders} />
          </div>
        </div>
        <PaginationComponent
          page={page}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
        <div className="grid gap-8 mt-8">
          <div className="grid md:grid-cols-2 gap-6">
            <TotalSalesChart data={totalSalesSeries} />
            <InventoryLevelsChart data={inventoryLevelBars} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <OrderStatusChart data={orderStatusSlices} />
            <SupplierPerformanceChart data={supplierPerformanceSeries} />
          </div>
        </div>
      </div>
    </div>
  );
}
