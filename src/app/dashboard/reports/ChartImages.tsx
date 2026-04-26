"use client";

import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

export function InventoryStatusChart() {
  const data = {
    labels: ["In Stock", "Low Stock", "Out of Stock"],
    datasets: [
      {
        data: [300, 50, 10],
        backgroundColor: ["#10B981", "#FBBF24", "#EF4444"],
      },
    ],
  };

  return <Pie data={data} />;
}

export function InventoryStatusChartLive({
  inStock,
  lowStock,
  outOfStock,
}: {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}) {
  const data = {
    labels: ["In Stock", "Low Stock", "Out of Stock"],
    datasets: [
      {
        data: [inStock, lowStock, outOfStock],
        backgroundColor: ["#10B981", "#FBBF24", "#EF4444"],
      },
    ],
  };

  return <Pie data={data} />;
}

export function DemandAnalyticsChart() {
  const data = {
    labels: ["Paracetamol", "Ibuprofen", "Cough Syrup", "Disprin", "Oximeter"],
    datasets: [
      {
        label: "Demand",
        data: [12, 19, 3, 5, 2],
        backgroundColor: "#8B5CF6",
      },
    ],
  };

  return <Bar data={data} />;
}

export function DemandAnalyticsChartLive({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const safeLabels = labels.length > 0 ? labels : ["No Data"];
  const safeValues = values.length > 0 ? values : [0];

  const data = {
    labels: safeLabels,
    datasets: [
      {
        label: "Demand",
        data: safeValues,
        backgroundColor: "#8B5CF6",
      },
    ],
  };

  return <Bar data={data} />;
}

export function StockUsageTrendsChart() {
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Stock Usage",
        data: [65, 59, 80, 81, 56, 55],
        borderColor: "#3B82F6",
        tension: 0.1,
      },
    ],
  };

  return <Line data={data} />;
}

export function StockUsageTrendsChartLive({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const safeLabels = labels.length > 0 ? labels : ["No Data"];
  const safeValues = values.length > 0 ? values : [0];

  const data = {
    labels: safeLabels,
    datasets: [
      {
        label: "Stock Usage",
        data: safeValues,
        borderColor: "#3B82F6",
        tension: 0.1,
      },
    ],
  };

  return <Line data={data} />;
}
