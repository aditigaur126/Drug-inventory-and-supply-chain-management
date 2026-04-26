import { Truck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

const DashboardSupplyChainCard = ({
  onTimeDeliveryRate,
}: {
  onTimeDeliveryRate: number;
}) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Supply Chain</CardTitle>
        <CardDescription>
          View the overall health of your supply chain.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{onTimeDeliveryRate}%</h3>
              <p className="text-muted-foreground">On-Time Delivery</p>
            </div>
            <Truck className="h-8 w-8 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardSupplyChainCard;
