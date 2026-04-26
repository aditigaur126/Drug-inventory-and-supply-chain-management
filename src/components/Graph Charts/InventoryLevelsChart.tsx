import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import { ResponsiveBar } from "@nivo/bar";

type InventoryBar = { name: string; count: number };

const defaultBars: InventoryBar[] = [
  { name: "No Data", count: 0 },
];

const InventoryLevelsChart = ({ data }: { data?: InventoryBar[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Levels</CardTitle>
        <CardDescription>Top 5 products</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart className="aspect-[4/3]" data={data} />
      </CardContent>
    </Card>
  );
};

function BarChart(props: { className?: string; data?: InventoryBar[] }) {
  const bars = props.data && props.data.length > 0 ? props.data : defaultBars;

  return (
    <div className={props.className}>
      <ResponsiveBar
        data={bars}
        keys={["count"]}
        indexBy="name"
        margin={{ top: 0, right: 0, bottom: 40, left: 40 }}
        padding={0.3}
        colors={["#2563eb"]}
        axisBottom={{
          tickSize: 0,
          tickPadding: 16,
        }}
        axisLeft={{
          tickSize: 0,
          tickValues: 4,
          tickPadding: 16,
        }}
        gridYValues={4}
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
        tooltipLabel={({ id }: { id: any }) => `${id}`}
        enableLabel={false}
        role="application"
        ariaLabel="A bar chart showing data"
      />
    </div>
  );
}

export default InventoryLevelsChart;
