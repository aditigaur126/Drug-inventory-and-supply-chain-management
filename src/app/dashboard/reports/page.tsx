"use client";

import React, { useEffect, useMemo, useState } from "react";
import BreadCrumb from "@/components/BreadCrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Calendar,
  Clock,
  Download,
  Filter,
} from "lucide-react";
import { BlobProvider } from "@react-pdf/renderer";

import {
  DemandAnalyticsChartLive,
  InventoryStatusChartLive,
  StockUsageTrendsChartLive,
} from "./ChartImages";
import PDFReport from "./PDFReport";
import useInventory from "@/hooks/use-inventory";
import { useOrder } from "@/hooks/use-order";

export default function ReportAnalytics() {
  const [isClient, setIsClient] = useState(false);
  const { items, fetchItems, loading: inventoryLoading } = useInventory();
  const { orders, fetchOrders, loading: ordersLoading } = useOrder();

  useEffect(() => {
    setIsClient(true);
    fetchItems();
    fetchOrders();
  }, [fetchItems, fetchOrders]);

  const inStock = useMemo(
    () => items.filter((item) => item.quantity > item.threshold_quantity).length,
    [items]
  );
  const lowStock = useMemo(
    () =>
      items.filter(
        (item) => item.quantity > 0 && item.quantity <= item.threshold_quantity
      ).length,
    [items]
  );
  const outOfStock = useMemo(
    () => items.filter((item) => item.quantity <= 0).length,
    [items]
  );

  const criticalItems = useMemo(() => {
    const today = new Date();
    const soonDate = new Date(today);
    soonDate.setDate(today.getDate() + 30);

    return items
      .filter((item) => {
        const expiry = new Date(item.expiry_date);
        return (
          item.quantity <= item.threshold_quantity ||
          item.quantity <= 0 ||
          expiry <= soonDate
        );
      })
      .slice(0, 6)
      .map((item) => {
        const expiry = new Date(item.expiry_date);
        if (item.quantity <= 0) {
          return { name: item.item_name, status: "Out of Stock" };
        }
        if (item.quantity <= item.threshold_quantity) {
          return { name: item.item_name, status: "Low Stock" };
        }
        if (expiry <= soonDate) {
          return { name: item.item_name, status: "Expiring Soon" };
        }
        return { name: item.item_name, status: "Stable" };
      });
  }, [items]);

  const demandData = useMemo(() => {
    const demandMap = new Map<string, number>();
    for (const order of orders || []) {
      for (const orderItem of order.orderItems || []) {
        demandMap.set(
          orderItem.item_name,
          (demandMap.get(orderItem.item_name) || 0) + orderItem.quantity
        );
      }
    }

    const top = Array.from(demandMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      labels: top.map(([name]) => name),
      values: top.map(([, qty]) => qty),
    };
  }, [orders]);

  const trendData = useMemo(() => {
    const monthly = new Map<string, number>();
    for (const order of orders || []) {
      const month = new Date(order.order_date).toLocaleDateString(undefined, {
        month: "short",
      });
      const qty = (order.orderItems || []).reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      monthly.set(month, (monthly.get(month) || 0) + qty);
    }

    const entries = Array.from(monthly.entries()).slice(-6);
    return {
      labels: entries.map(([month]) => month),
      values: entries.map(([, qty]) => qty),
    };
  }, [orders]);

  const recentOrders = useMemo(() => {
    return [...(orders || [])]
      .sort(
        (a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      )
      .slice(0, 5);
  }, [orders]);

  const averageProcessingTimeDays = useMemo(() => {
    const successfulOrders = (orders || []).filter(
      (order) => order.status === "SUCCESS" && order.expected_delivery_date
    );

    if (successfulOrders.length === 0) return 0;

    const totalDays = successfulOrders.reduce((sum, order) => {
      const orderDate = new Date(order.order_date).getTime();
      const deliveredDate = new Date(order.expected_delivery_date as string).getTime();
      const diffDays = Math.max(0, (deliveredDate - orderDate) / (1000 * 60 * 60 * 24));
      return sum + diffDays;
    }, 0);

    return Number((totalDays / successfulOrders.length).toFixed(1));
  }, [orders]);

  // Data for PDF
  const reportData = {
    inventoryStatus: {
      inStock,
      lowStock,
      outOfStock,
    },
    criticalItems,
  };

  interface DownloadButtonProps {
    url: string | null;
    loading: boolean;
    error: Error | null;
  }

  const DownloadButton: React.FC<DownloadButtonProps> = ({
    url,
    loading,
    error: _error,
  }) => (
    <Button
      disabled={loading}
      onClick={() => {
        if (url) {
          const link = document.createElement("a");
          link.href = url;
          link.download = "MediNexus_Inventory_Report.pdf";
          link.click();
        }
      }}
    >
      {loading ? (
        "Generating PDF..."
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </>
      )}
    </Button>
  );

  const RTCGraphs = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Status
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <InventoryStatusChartLive
              inStock={inStock}
              lowStock={lowStock}
              outOfStock={outOfStock}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demand Analytics</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <DemandAnalyticsChartLive
              labels={demandData.labels}
              values={demandData.values}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Items
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {criticalItems.length > 0 ? (
                criticalItems.map((item) => (
                  <li key={`${item.name}-${item.status}`} className="flex justify-between items-center">
                    <span>{item.name}</span>
                    <span className="text-red-500 font-semibold">{item.status}</span>
                  </li>
                ))
              ) : (
                <li className="text-muted-foreground">No critical items.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  const TrendsGraphs = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Stock Usage Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <StockUsageTrendsChartLive
            labels={trendData.labels}
            values={trendData.values}
          />
        </CardContent>
      </Card>
    );
  };

  const ExpiryAnalytics = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Expiry Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice(0, 10).map((item) => {
                const expiry = new Date(item.expiry_date);
                const daysLeft = Math.ceil(
                  (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                let status = "Good";
                let color = "text-green-500";

                if (item.quantity <= item.threshold_quantity || daysLeft <= 30) {
                  status = "Expiring Soon";
                  color = "text-yellow-500";
                }

                if (item.quantity <= 0 || daysLeft <= 7) {
                  status = "Critical";
                  color = "text-red-500";
                }

                return (
                  <TableRow key={item.item_id + item.batch_number}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{expiry.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span className={color}>●</span> {status}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const DemandAnalytics = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Demand Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <DemandAnalyticsChartLive
            labels={demandData.labels}
            values={demandData.values}
          />
        </CardContent>
      </Card>
    );
  };

  const OrderHistory = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order History and Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Recent Orders</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{(order.id || "").slice(0, 8)}</TableCell>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Processing Time</h3>
              <div className="flex items-center space-x-4">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{averageProcessingTimeDays} days</p>
                  <p className="text-sm text-gray-500">
                    Average processing time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 mx-auto p-4 bg-muted/40 space-y-4 min-h-screen">
      <BreadCrumb
        paths={[
          { pageName: "Dashboard", path: "/dashboard" },
          { pageName: "Reports", path: "/dashboard/reports" },
        ]}
      />
      <h1 className="text-2xl font-bold mb-4">Reports Analytics</h1>

      {(inventoryLoading || ordersLoading) && (
        <Card className="mb-6">
          <CardContent className="py-6 text-muted-foreground">
            Loading live report data...
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="emergency">Emergency</SelectItem>
            <SelectItem value="surgery">Surgery</SelectItem>
            <SelectItem value="pediatrics">Pediatrics</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" className="w-[180px]" />
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> More Filters
        </Button>
      </div>

      {/* Real-time Inventory Status Overview */}
      <RTCGraphs />

      {/* Trend Graphs */}
      <TrendsGraphs />

      {/* Expiry Analytics */}
      <ExpiryAnalytics />

      {/* Demand Analytics */}
      <DemandAnalytics />

      {/* Order History and Efficiency */}
      <OrderHistory />

      {/* Export and Sharing */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Report
        </Button>

        {isClient ? (
          <BlobProvider document={<PDFReport data={reportData} />}>
            {({ url, loading, error }) => (
              <DownloadButton url={url} loading={loading} error={error} />
            )}
          </BlobProvider>
        ) : (
          <Button disabled>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        )}
      </div>
    </div>
  );
}
