import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsivePie } from "@nivo/pie";

type StatusSlice = { id: string; value: number };

const defaultSlices: StatusSlice[] = [{ id: "No Data", value: 1 }];

const OrderStatusChart = ({ data }: { data?: StatusSlice[] }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status</CardTitle>
        <CardDescription>Pending, Fulfilled, Cancelled</CardDescription>
      </CardHeader>
      <CardContent>
        <PieChart className="aspect-[4/3]" data={data} />
      </CardContent>
    </Card>
  );
};

function PieChart(props: { className?: string; data?: StatusSlice[] }) {
  const slices = props.data && props.data.length > 0 ? props.data : defaultSlices;

  return (
    <div className={props.className}>
      <ResponsivePie
        data={slices}
        sortByValue
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        cornerRadius={0}
        padAngle={0}
        borderWidth={1}
        borderColor={"#ffffff"}
        enableArcLinkLabels={false}
        arcLabel={(d:any) => `${d.id}`}
        arcLabelsTextColor={"#ffffff"}
        arcLabelsRadiusOffset={0.65}
        colors={["#2563eb", "#16a34a", "#dc2626", "#7c3aed"]}
        theme={{
          labels: {
            text: {
              fontSize: "18px",
            },
          },
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
        }}
        role="application"
      />
    </div>
  );
}

export default OrderStatusChart;