import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import { ResponsiveLine } from "@nivo/line";

type SupplierPoint = { x: string; y: number };
type SupplierSeries = { id: string; data: SupplierPoint[] };

const defaultSeries: SupplierSeries[] = [
  {
    id: "No Data",
    data: [
      { x: "Week 1", y: 0 },
      { x: "Week 2", y: 0 },
      { x: "Week 3", y: 0 },
      { x: "Week 4", y: 0 },
    ],
  },
];

const SupplierPerformanceChart = ({
  data,
}: {
  data?: SupplierSeries[];
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Supplier Performance</CardTitle>
        <CardDescription>Top 5 suppliers</CardDescription>
      </CardHeader>
      <CardContent>
        <LineChart className="aspect-[4/3]" data={data} />
      </CardContent>
    </Card>
  );
};

function LineChart(props: { className?: string; data?: SupplierSeries[] }) {
  const series = props.data && props.data.length > 0 ? props.data : defaultSeries;

  return (
    <div className={props.className}>
      <ResponsiveLine
        data={series}
        margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
        xScale={{
          type: "point",
        }}
        yScale={{
          type: "linear",
        }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 16,
        }}
        axisLeft={{
          tickSize: 0,
          tickValues: 5,
          tickPadding: 16,
        }}
        colors={["#2563eb", "#e11d48"]}
        pointSize={6}
        useMesh={true}
        gridYValues={6}
        theme={{
          tooltip: {
            chip: {
              borderRadius: "9999px",
            },
            container: {
              fontSize: "12px",
              textTransform: "capitalize",
              borderRadius: "6px",
            },
          },
          grid: {
            line: {
              stroke: "#f3f4f6",
            },
          },
        }}
        role="application"
      />
    </div>
  );
}

export default SupplierPerformanceChart;
