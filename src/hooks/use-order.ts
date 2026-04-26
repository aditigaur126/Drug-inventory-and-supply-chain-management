import { Order, OrderItem } from "@/lib/interfaces";
import { useState, useCallback } from "react";
import { getApiErrorMessage } from "@/lib/apiError";

export const useOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);

  const createOrder = useCallback(async (order: Order) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Unable to create order."));
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Unable to fetch orders."));
      }

      const data = await response.json();
      setOrders(data);
      return data;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateOrderItems = useCallback(
    async (orderId: string, updatedItems: OrderItem[]) => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderItems: updatedItems,
          }),
        });

        if (!response.ok) {
          setError(await getApiErrorMessage(response, "Failed to update order items."));
          return;
        }

        const updatedOrder = await response.json();
        setOrders(
          (orders || []).map((order) =>
            order.id === orderId ? updatedOrder : order
          )
        );
      } catch (error) {
        console.error("Error updating order items:", error);
      } finally {
        setLoading(false);
      }
    },
    [orders]
  );

  const cancelOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify( {status: "CANCELLED" }),
      });

      if (!response.ok) {
        setError(await getApiErrorMessage(response, "Failed to cancel order."));
        return;
      }

      const updatedOrder = await response.json();
      setOrders(
        (orders || []).map((order) => (order.id === id ? updatedOrder : order))
      );
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const deleteOrder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Unable to delete order."));
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    orders,
    createOrder,
    fetchOrders,
    updateOrderItems,
    cancelOrder,
    deleteOrder,
  };
};
