import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, X } from "lucide-react";
import logo from "../assets/logo.png";
import gcash from "../assets/gcash.jpg";

export default function Orders() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    // fetch customer
    const { data: userData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();
    if (userData) setFirstName(userData.first_name);

    // fetch orders
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id, 
        date,
        weight_kg,
        total_amount,
        order_status,
        is_accepted,
        service_types(service_name),
        payment_status,
        payments(payment_method),
        addresses(building_no, street, city, province, zip_code, name)
      `)
      .eq("customer_id", user.id)
      .order("date", { ascending: false });

    if (!error && ordersData) {
      setPendingOrders(ordersData.filter(o => !["Claimed", "Cancelled", "Completed"].includes(o.order_status)));
      setOrderHistory(ordersData.filter(o => ["Claimed", "Cancelled", "Completed"].includes(o.order_status)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleCancelOrder = async (orderId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("customer_id", user.id);

    if (!error) {
      alert("Order canceled successfully!");
      fetchOrders(); 
    } else {
      console.error("Cancel order error:", error.message);
      alert("Failed to cancel order. See console for details.");
    }
  };

  const getDisplayStatus = (order) => {
    if (order.order_status === "Pending" && !order.is_accepted) return "Pending Approval";
    if (order.order_status === "Pending" && order.is_accepted) return "Accepted — Waiting for Processing";
    return order.order_status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    let colorClass = "bg-gray-100 text-gray-700"; // default

    if (order.order_status === "Pending" && !order.is_accepted) {
      colorClass = "bg-orange-100 text-orange-700";
    } else if (order.order_status === "Pending" && order.is_accepted) {
      colorClass = "bg-blue-100 text-blue-700";
    } else if (order.order_status === "In Progress") {
      colorClass = "bg-purple-100 text-purple-700";
    } else if (["Ready for Pickup", "Out for Delivery"].includes(order.order_status)) {
      colorClass = "bg-teal-100 text-teal-700";
    } else if (["Claimed", "Completed"].includes(order.order_status)) {
      colorClass = "bg-emerald-100 text-emerald-700";
    } else if (order.order_status === "Cancelled") {
      colorClass = "bg-rose-100 text-rose-700";
    }

    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${colorClass} text-center`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#abddfc] p-4 md:p-8 flex flex-col md:flex-row gap-6 font-sans">
      
      {/* Left Sidebar */}
      <div className="w-full md:w-64 shrink-0 flex flex-col">
        <div className="flex justify-center md:justify-start mb-6 px-4">
          <img src={logo} alt="Mariem's Laundry Logo" className="w-48 h-auto object-contain drop-shadow-sm" />
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 text-[#74abcf] font-black text-lg shadow-sm mb-4">
          <div className="bg-[#97d5fc] rounded-full p-2 text-white">
            <User size={24} strokeWidth={2.5} />
          </div>
          <span>{firstName}</span>
        </div>
        <div className="bg-white rounded-3xl p-6 flex flex-col gap-6 text-[#74abcf] font-black text-xl shadow-sm">
          <button onClick={() => navigate("/home")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors">
            <Home size={28} strokeWidth={2.5} /> Home
          </button>
          <button className="flex items-center gap-4 text-[#97d5fc] transition-colors">
            <ShoppingCart size={28} strokeWidth={2.5} /> Orders
          </button>
          <hr className="border-blue-50" />
          <button onClick={handleLogout} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors mt-2">
            <LogOut size={28} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-5 md:p-10 flex flex-col gap-8 overflow-hidden">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">Orders</h1>
          <button onClick={() => navigate("/place-order")} className="w-full md:w-auto bg-[#97d5fc] hover:bg-[#74abcf] text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-md active:scale-95">
            Place Order +
          </button>
        </div>

        {/* Active Orders */}
        <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8">
          <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mb-4">Active Orders</h2>
          <hr className="border-[#e1f0fa] border rounded-full mb-6" />

          {loading ? (
            <p className="text-[#97d5fc] font-bold animate-pulse text-center py-4">Loading active orders...</p>
          ) : pendingOrders.length === 0 ? (
            <p className="text-[#5a98bd] font-bold text-center py-4">No pending orders.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white border-2 border-[#e1f0fa] rounded-2xl p-5 md:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                  
                  <div className="space-y-2 text-[#5a98bd] font-medium text-sm md:text-base w-full">
                    <p>Order Date: <span className="font-bold text-[#74abcf]">{new Date(order.date).toLocaleDateString()}</span></p>
                    <p>Service: <span className="font-bold text-[#74abcf]">{order.service_types?.service_name}</span></p>
                    <p>Laundry Weight: <span className="font-bold text-[#74abcf]">{order.weight_kg} kg</span></p>
                    {order.addresses && (
                    <p className="wrap-break-word">Address: <span className="font-bold text-[#74abcf]">
                      {[
                        order.addresses.building_no,
                        order.addresses.street,
                        order.addresses.city,
                        order.addresses.province,
                        order.addresses.zip_code
                      ].filter(Boolean).join(", ")}
                    </span></p>
                  )}
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <span>Status:</span> {getStatusBadge(order)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 w-full lg:w-auto shrink-0">
                    <div className="border-2 border-[#e1f0fa] text-[#74abcf] rounded-xl px-6 py-3 text-lg font-black bg-[#f4faff] w-full text-center lg:text-right">
                      Total: ₱{order.total_amount.toFixed(2)}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full lg:justify-end">
                      {order.order_status === "Pending" && !order.is_accepted && (
                        <button type="button" onClick={() => handleCancelOrder(order.id)} 
                          className="w-full sm:w-auto sm:flex-none bg-rose-400 hover:bg-rose-500 text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors shadow-sm active:scale-95">
                          Cancel
                        </button>
                      )}
                      {order.order_status === "Pending" &&
                        order.is_accepted &&
                        order.payment_status === "Unpaid" &&
                        order.payments?.some(p => p.payment_method === "GCash") && (
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowPaymentModal(true);
                            }}
                            className="w-full sm:w-auto sm:flex-none bg-[#74abcf] hover:bg-[#5a98bd] text-white px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-widest transition-colors shadow-sm active:scale-95">
                            Pay Now
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order History */}
        <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8 flex-1">
          <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mb-4">Order History</h2>
          <hr className="border-[#e1f0fa] border rounded-full mb-6" />

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e1f0fa] shadow-sm bg-white">
            <table className="w-full min-w-125 text-left text-[#5a98bd] text-sm">
              <thead className="bg-[#e1f0fa]/50 text-[#74abcf] uppercase font-black tracking-wider text-xs border-b border-[#e1f0fa]">
                <tr>
                  <th className="py-4 px-4 md:px-6">Date</th>
                  <th className="py-4 px-4 md:px-6">Service</th>
                  <th className="py-4 px-4 md:px-6 text-center">Weight</th>
                  <th className="py-4 px-4 md:px-6 text-center">Total</th>
                  <th className="py-4 px-4 md:px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[#97d5fc] font-bold animate-pulse">Loading past orders...</td></tr>
                ) : orderHistory.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-[#5a98bd] font-bold">No past orders.</td></tr>
                ) : (
                  orderHistory.map(order => (
                    <tr key={order.id} className="border-b border-[#e1f0fa] hover:bg-[#f4faff] transition-colors last:border-0">
                      <td className="py-4 px-4 md:px-6 font-bold text-[#74abcf] whitespace-nowrap">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 md:px-6 whitespace-nowrap">{order.service_types?.service_name}</td>
                      <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">{order.weight_kg} kg</td>
                      <td className="py-4 px-4 md:px-6 text-center font-bold text-[#74abcf] whitespace-nowrap">₱{order.total_amount.toFixed(2)}</td>
                      <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                        {getStatusBadge(order)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-[#5a98bd]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-4xl shadow-2xl p-6 md:p-8 max-w-md w-full relative flex flex-col items-center gap-4 border-2 border-[#e1f0fa] animate-in fade-in zoom-in duration-200">
              
              <button
                className="absolute top-4 right-4 md:top-6 md:right-6 text-[#97d5fc] hover:text-[#74abcf] transition-colors bg-[#f4faff] p-2 rounded-full"
                onClick={() => setShowPaymentModal(false)}
              >
                <X size={20} strokeWidth={3} />
              </button>

              <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mt-2">Pay with GCash</h2>
              <p className="text-[#5a98bd] text-center font-medium text-sm px-4">
                Scan the QR code below to pay for your order.
              </p>

              <div className="bg-[#f4faff] p-6 rounded-3xl border-2 border-[#e1f0fa] shadow-inner mt-2 w-full flex justify-center">
                <img
                  src={gcash}
                  alt="GCash QR Code"
                  className="w-40 h-40 md:w-48 md:h-48 object-contain rounded-xl mix-blend-multiply"
                />
              </div>

              <div className="text-center w-full bg-[#f9fcff] p-4 rounded-2xl border border-[#e1f0fa] mt-2">
                <p className="font-medium text-[#5a98bd] text-sm flex justify-between">
                  Order ID: <span className="font-bold text-[#74abcf]">#{selectedOrder.id.toString().slice(0,8)}</span>
                </p>
                <hr className="my-2 border-[#e1f0fa]" />
                <p className="font-black text-[#5a98bd] text-lg flex justify-between items-center">
                  Total Amount: <span className="text-[#74abcf] text-2xl">₱{selectedOrder.total_amount.toFixed(2)}</span>
                </p>
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="mt-2 w-full bg-[#97d5fc] hover:bg-[#74abcf] text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-md"
              >
                Done Scanning
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}