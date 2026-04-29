"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BreadCrumb from "@/components/BreadCrumb";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  AlertTriangle,
  Ambulance,
  ArrowLeftRight,
  Check,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import SearchInputField from "@/components/SearchInputField";

interface Medicine {
  id: string;
  itemId: string;
  name: string;
  stock: number;
  branchId: string;
  branchName: string;
  state: string;
  pincode: string;
  capacity: number;
  critical: number;
}

interface Branch {
  id: string;
  name: string;
  state: string;
  pincode: string;
  region?: string;
}

interface TransferHistory {
  id: string;
  fromHospitalId: string;
  toHospitalId: string;
  from: string;
  to: string;
  itemId?: string | null;
  medicine: string;
  quantity: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  date: string;
  reviewedAt?: string | null;
}

interface BranchesResponse {
  hospitals: Array<{
    id: string;
    hospitalName: string;
    state: string;
    pincode: string;
    region?: string;
  }>;
  inventory: Medicine[];
  transferHistory: Array<{
    id: string;
    fromHospitalId: string;
    toHospitalId: string;
    from: string;
    to: string;
    itemId?: string | null;
    medicine: string;
    quantity: number;
    status: "APPROVED" | "PENDING" | "REJECTED";
    date: string;
    reviewedAt?: string | null;
  }>;
  currentHospitalId: string;
  currentHospitalName?: string;
}

const estimateDistanceKm = (from: Branch, to: Branch) => {
  if (from.id === to.id) return 0;
  const fromPin = Number.parseInt(from.pincode || "0", 10);
  const toPin = Number.parseInt(to.pincode || "0", 10);
  const pinDistance =
    Number.isFinite(fromPin) && Number.isFinite(toPin)
      ? Math.abs(fromPin - toPin) / 10
      : 0;
  const statePenalty = from.state === to.state ? 35 : 320;
  return Math.round(statePenalty + pinDistance);
};

const matchesDistanceFilter = (
  km: number,
  filter: "all" | "near" | "medium" | "far"
) => {
  if (filter === "all") return true;
  if (filter === "near") return km <= 150;
  if (filter === "medium") return km > 150 && km <= 500;
  return km > 500;
};

export default function BranchesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [distanceFromBranch, setDistanceFromBranch] = useState("current");
  const [selectedDistanceFilter, setSelectedDistanceFilter] = useState<
    "all" | "near" | "medium" | "far"
  >("all");
  const [selectedStockFilter, setSelectedStockFilter] = useState("all");
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(
    null
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [transferHistory, setTransferHistory] = useState<TransferHistory[]>([]);
  const [currentHospitalId, setCurrentHospitalId] = useState<string | null>(null);
  const [currentHospitalName, setCurrentHospitalName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranchesData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/hospital/branches");
        const result = (await response.json()) as BranchesResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error || "Unable to load branches data.");
        }

        setBranches(
          result.hospitals.map((hospital) => ({
            id: hospital.id,
            name: hospital.hospitalName,
            state: hospital.state,
            pincode: hospital.pincode,
            region: hospital.region,
          }))
        );
        setInventory(result.inventory);
        setTransferHistory(result.transferHistory);
        setCurrentHospitalId(result.currentHospitalId);
        setCurrentHospitalName(result.currentHospitalName || "");
      } catch (error) {
        toast({
          title: "Unable to load branches",
          description:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading branches data.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBranchesData();
  }, []);

  const originBranch = useMemo(() => {
    if (distanceFromBranch !== "current") {
      return branches.find((branch) => branch.id === distanceFromBranch) ?? null;
    }
    return branches.find((branch) => branch.id === currentHospitalId) ?? null;
  }, [branches, distanceFromBranch, currentHospitalId]);

  const filteredInventory = inventory.filter((item) => {
    const branch = branches.find((candidate) => candidate.id === item.branchId);
    const distanceKm =
      branch && originBranch ? estimateDistanceKm(originBranch, branch) : 0;

    return (
      (selectedBranch === "all" || item.branchId === selectedBranch) &&
      (selectedStockFilter === "all" ||
        (selectedStockFilter === "stock" && item.stock > 0) ||
        (selectedStockFilter === "low-stock" &&
          item.stock > 0 &&
          item.stock <= item.critical) ||
        (selectedStockFilter === "over-stock" && item.stock > item.capacity) ||
        (selectedStockFilter === "non-stock" && item.stock <= 0)) &&
      matchesDistanceFilter(distanceKm, selectedDistanceFilter) &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStockLevelColor = (
    stock: number,
    capacity: number,
    critical: number
  ) => {
    const percentage = (stock / capacity) * 100;
    if (stock <= critical) return "bg-red-500";
    if (percentage < 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const emergencyAlerts = inventory.filter(
    (item) => item.stock <= item.critical
  );

  const pendingTransfers = transferHistory.filter(
    (transfer) => transfer.status === "PENDING"
  );

  const handleTransferRequest = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setTransferDialogOpen(true);
  };

  const handleTransferSubmit = async (
    fromBranch: string,
    _toBranch: string,
    quantity: number
  ) => {
    try {
      const response = await fetch("/api/hospital/branches/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          donor_hospital_id: fromBranch,
          item_id: selectedMedicine?.itemId,
          quantity_shared: quantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to create transfer request");
      }

      toast({
        title: "Transfer Request Submitted",
        description: `${quantity} units of ${selectedMedicine?.name} were requested successfully.`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Request Failed",
        description:
          error instanceof Error ? error.message : "Unable to create request.",
        variant: "destructive",
      });
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    try {
      const response = await fetch(
        `/api/hospital/branches/requests/${transferId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "APPROVE" }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to approve transfer");
      }

      toast({
        title: "Transfer Approved",
        description: result.message || "Stock was transferred successfully.",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Approval Failed",
        description:
          error instanceof Error ? error.message : "Unable to approve request.",
        variant: "destructive",
      });
    }
  };


  const handleRejectTransfer = async (transferId: string) => {
    try {
      const response = await fetch(
        `/api/hospital/branches/requests/${transferId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "REJECT" }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to reject transfer");
      }

      toast({
        title: "Transfer Rejected",
        description: result.message || "The request was rejected.",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description:
          error instanceof Error ? error.message : "Unable to reject request.",
        variant: "destructive",
      });
    }
  };
  return (
    <div className="p-4 w-full min-h-screen flex-1 overflow-y-auto space-y-4 md:p-6 bg-muted/40">
      <BreadCrumb
        paths={[
          { pageName: "Dashboard", path: "/dashboard" },
          { pageName: "Branches", path: "/dashboard/branches" },
        ]}
      />
      <h1 className="text-2xl font-bold mb-4">
        Hospital Branches Inventory Management
      </h1>

      <div className="flex justify-between items-center mb-4 ">
        <div className="flex items-center  space-x-2">
          <SearchInputField
            placeholder="Search Medicines..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
          />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedStockFilter}
            onValueChange={setSelectedStockFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select stock filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock States</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="over-stock">Over Stock</SelectItem>
              <SelectItem value="non-stock">Non Stock</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={distanceFromBranch}
            onValueChange={setDistanceFromBranch}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Distance from" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">From My Hospital</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={`origin-${branch.id}`} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedDistanceFilter}
            onValueChange={(value: "all" | "near" | "medium" | "far") =>
              setSelectedDistanceFilter(value)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Distance filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Distances</SelectItem>
              <SelectItem value="near">Near (0-150 km)</SelectItem>
              <SelectItem value="medium">Medium (151-500 km)</SelectItem>
              <SelectItem value="far">Far (&gt;500 km)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={alertsOpen} onOpenChange={setAlertsOpen}>
          <DialogTrigger asChild>
            <div className="relative">
              <Button variant="outline" size="icon">
                <Ambulance className="h-4 w-4" />
              </Button>
              {(emergencyAlerts.length > 0 || pendingTransfers.length > 0) && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Emergency Alerts & Pending Transfers</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="alerts" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="alerts">Emergency Alerts</TabsTrigger>
                <TabsTrigger value="transfers">Pending Transfers</TabsTrigger>
              </TabsList>
              <TabsContent value="alerts">
                <ScrollArea className="h-[300px]">
                  {emergencyAlerts.length > 0 ? (
                    emergencyAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="mb-4 p-2 bg-muted/40 rounded"
                      >
                        <p className="font-semibold">{alert.name}</p>
                        <p>
                          Branch:{" "}
                          {branches.find((b) => b.id === alert.branchId)?.name}
                        </p>
                        <p>
                          Current Stock: {alert.stock} (Critical level:{" "}
                          {alert.critical})
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No emergency alerts at this time.</p>
                  )}
                </ScrollArea>
              </TabsContent>
              <TabsContent value="transfers">
                <ScrollArea className="h-[300px]">
                  {pendingTransfers.length > 0 ? (
                    pendingTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="mb-4 p-2 bg-muted/40 rounded flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold">{transfer.medicine}</p>
                          <p>From: {transfer.from}</p>
                          <p>To: {transfer.to}</p>
                          <p>Quantity: {transfer.quantity}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApproveTransfer(transfer.id)}
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectTransfer(transfer.id)}
                          >
                            <X className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No pending transfers at this time.</p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          {loading ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Loading branches data...
              </CardContent>
            </Card>
          ) : filteredInventory.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No medicines found for the selected filters.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const branch = branches.find((b) => b.id === item.branchId);
                const distanceKm =
                  originBranch && branch
                    ? estimateDistanceKm(originBranch, branch)
                    : 0;
                const stockPercentage = (item.stock / item.capacity) * 100;
                const stockLevelColor = getStockLevelColor(
                  item.stock,
                  item.capacity,
                  item.critical
                );

                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden transition-transform transform hover:scale-105 duration-300"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex justify-between items-center">
                        <span>{item.name}</span>
                        {item.stock <= item.critical && (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {branch?.name} · {branch?.state}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Distance: {distanceKm} km from {originBranch?.name || "selected origin"}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Stock Level</span>
                          <span>
                            {item.stock} / {item.capacity}
                          </span>
                        </div>
                        <Progress
                          value={stockPercentage}
                          className={`h-2 ${stockLevelColor}`}
                          indicatorColor="#D0D0D0"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          {stockPercentage < 25
                            ? "Low Stock"
                            : stockPercentage > 75
                            ? "Well Stocked"
                            : "Adequate"}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransferRequest(item)}
                          disabled={item.branchId === currentHospitalId}
                        >
                          <ArrowLeftRight className="h-4 w-4 mr-2" />
                          Request
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferHistory.map((transfer) => (
                    <TableRow key={transfer.id}>
                      <TableCell>{new Date(transfer.date).toLocaleDateString()}</TableCell>
                      <TableCell>{transfer.from}</TableCell>
                      <TableCell>{transfer.to}</TableCell>
                      <TableCell>{transfer.medicine}</TableCell>
                      <TableCell>{transfer.quantity}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transfer.status === "APPROVED"
                              ? "success"
                              : transfer.status === "PENDING"
                              ? "pending"
                              : "destructive"
                          }
                        >
                          {transfer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <TransferDialog
        isOpen={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        selectedMedicine={selectedMedicine}
        branches={branches}
        currentHospitalName={currentHospitalName}
        onTransferSubmit={handleTransferSubmit}
      />
    </div>
  );
}
interface TransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMedicine: Medicine | null;
  branches: Branch[];
  currentHospitalName: string;
  onTransferSubmit: (
    fromBranch: string,
    toBranch: string,
    quantity: number
  ) => void;
}

const TransferDialog: React.FC<TransferDialogProps> = ({
  isOpen,
  onClose,
  selectedMedicine,
  branches,
  currentHospitalName,
  onTransferSubmit,
}) => {
  const [quantity, setQuantity] = useState<string>("");

  const handleSubmit = () => {
    if (selectedMedicine && quantity) {
      onTransferSubmit(
        selectedMedicine.branchId,
        currentHospitalName,
        parseInt(quantity)
      );
      onClose();
    } else {
      toast({
        title: "Error",
        description: "Please fill in the quantity",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request Stock</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {selectedMedicine ? (
            <>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Medicine:</span>
                <span>{selectedMedicine.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Current stock:</span>
                <span>{selectedMedicine.stock}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">From:</span>
                <span>
                  {
                    branches.find((b) => b.id === selectedMedicine.branchId)
                      ?.name
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">To:</span>
                <span>{currentHospitalName || "Your hospital"}</span>
              </div>
              <Input
                type="number"
                placeholder="Quantity to request"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                max={selectedMedicine.stock}
              />
            </>
          ) : (
            <p>No medicine selected</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Send Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
