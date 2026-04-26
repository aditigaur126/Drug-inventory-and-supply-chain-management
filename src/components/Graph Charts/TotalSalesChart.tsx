import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ResponsiveLine } from "@nivo/line";
import React from "react";

type SalesPoint = { x: string; y: number };

const defaultSeries: SalesPoint[] = [
  { x: "Mon", y: 0 },
  { x: "Tue", y: 0 },
  { x: "Wed", y: 0 },
  { x: "Thu", y: 0 },
  { x: "Fri", y: 0 },
  { x: "Sat", y: 0 },
  { x: "Sun", y: 0 },
];

const TotalSalesChart = ({ data }: { data?: SalesPoint[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total Sales</CardTitle>
        <CardDescription>This month</CardDescription>
      </CardHeader>
      <CardContent>
        <TimeseriesChart className="aspect-[4/3]" data={data} />
      </CardContent>
    </Card>
  );
};

function TimeseriesChart(props: { className?: string; data?: SalesPoint[] }) {
  const series = props.data && props.data.length > 0 ? props.data : defaultSeries;

  return (
    <div className={props.className}>
      <ResponsiveLine
        data={[
          {
            id: "Total Sales",
            data: series,
          },
        ]}
        margin={{ top: 10, right: 20, bottom: 40, left: 40 }}
        xScale={{
          type: "point",
        }}
        yScale={{
          type: "linear",
          min: 0,
          max: "auto",
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
        colors={["#2563eb"]}
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

export default TotalSalesChart
