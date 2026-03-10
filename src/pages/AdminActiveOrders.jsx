import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Check, X, Edit2, ChevronDown, BarChart3, RefreshCw } from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminActiveOrders() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Added refresh state

  // For inline editing
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editedWeight, setEditedWeight] = useState(0);

  // Fetch orders and admin info
  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }

    // Admin name
    const { data: adminData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();

    if (adminData) setFirstName(adminData.first_name);

    // Active orders
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id,
        date,
        weight_kg,
        total_amount,
        delivery_fee,
        order_status,
        is_accepted,
        order_method,
        service_types(service_name, price_per_8kg),
        customers(first_name,last_name),
        addresses(building_no,street,city,province,zip_code)
      `)
      .eq("is_accepted", true)
      .not("order_status", "in", '("Claimed","Cancelled")')
      .order("date", { ascending: false });

    if (!error && ordersData) setOrders(ordersData);
    
    setLoading(false);
    if (isManualRefresh) {
      // Small timeout so the spin animation has time to be seen
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Save weight & price changes
  const saveChanges = async (order) => {
    const weight = Number(editedWeight);
    const pricePer8kg = Number(order.service_types?.price_per_8kg || 165);
    const blocks = Math.ceil(weight / 8);
    const servicePrice = blocks * pricePer8kg;
    const deliveryFee = Number(order.delivery_fee || 0);
    const newTotal = servicePrice + deliveryFee;

    const { error } = await supabase
      .from("orders")
      .update({ weight_kg: weight, total_amount: newTotal })
      .eq("id", order.id);

    if (!error) {
      setEditingOrderId(null);
      fetchOrders();
    }
  };

  // Update order status
  const updateStatus = async (orderId, status) => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("id", orderId);

    if (!error) fetchOrders();
  };

  // Cancel order
  const cancelOrder = async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "Cancelled" })
      .eq("id", orderId);

    if (!error) fetchOrders();
  };

  // Status badge helper
  const getDisplayStatus = (order) => {
    if (order.order_status === "Pending" && !order.is_accepted) return "Pending Approval";
    if (order.order_status === "Pending" && order.is_accepted) return "Accepted — Waiting for Processing";
    return order.order_status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    let colorClass = "bg-gray-100 text-gray-700"; // default

    if (order.order_status === "Pending" && !order.is_accepted) colorClass = "bg-orange-100 text-orange-700";
    else if (order.order_status === "Pending" && order.is_accepted) colorClass = "bg-blue-100 text-blue-700";
    else if (order.order_status === "In Progress") colorClass = "bg-purple-100 text-purple-700";
    else if (["Ready for Pickup", "Out for Delivery"].includes(order.order_status)) colorClass = "bg-teal-100 text-teal-700";
    else if (["Claimed", "Completed"].includes(order.order_status)) colorClass = "bg-emerald-100 text-emerald-700";
    else if (order.order_status === "Cancelled") colorClass = "bg-rose-100 text-rose-700";

    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${colorClass} text-center`}>
        {displayStatus}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#abddfc] p-4 md:p-8 flex flex-col md:flex-row gap-6 font-sans">
      
      {/* Sidebar */}
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
          <button onClick={() => navigate("/admin")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors">
            <Home size={28} strokeWidth={2.5} /> Dashboard
          </button>
          <button className="flex items-center gap-4 text-[#97d5fc]">
            <ShoppingCart size={28} strokeWidth={2.5} /> Active Orders
          </button>
          <button onClick={() => navigate("/admin-order-history")} className="flex items-center gap-4 text-[#5a98bd] hover:text-[#97d5fc] transition-colors">
            <ShoppingCart size={28} strokeWidth={2.5} /> Order History
          </button>

          <button onClick={() => navigate("/admin-sales-report")} className="flex items-center gap-4 text-[#5a98bd] hover:text-[#97d5fc] transition-colors">
            <BarChart3 size={28} strokeWidth={2.5} /> Sales Report
          </button>
          
          <hr className="border-[#e1f0fa]" />
          <button onClick={handleLogout} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors">
            <LogOut size={28} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-5 md:p-10 flex flex-col gap-8 overflow-hidden">
        
        {/* Header with Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-2">
          <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">
            Active Orders
          </h1>
          <button 
            onClick={() => fetchOrders(true)} 
            disabled={isRefreshing || loading}
            className="flex items-center justify-center gap-2 bg-[#f4faff] border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
          >
            <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} strokeWidth={3} />
            <span>Refresh</span>
          </button>
        </div>

        {loading && !isRefreshing ? (
          <div className="flex-1 flex justify-center items-center">
            <p className="text-[#97d5fc] font-bold text-lg animate-pulse">Loading active orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#f4faff] border-2 border-dashed border-[#e1f0fa] rounded-3xl p-10 flex justify-center items-center">
            <p className="text-[#5a98bd] font-bold text-lg text-center">All caught up! No active orders.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map(order => {
              const isEditing = editingOrderId === order.id;
              const pricePer8kg = Number(order.service_types?.price_per_8kg || 165);
              const displayedWeight = isEditing ? Number(editedWeight) : order.weight_kg;
              const blocks = Math.ceil(displayedWeight / 8);
              const servicePrice = blocks * pricePer8kg;
              const deliveryFee = Number(order.delivery_fee || 0);
              const totalPrice = servicePrice + deliveryFee;

              return (
                <div
                  key={order.id}
                  className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between gap-6 md:gap-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  {/* Left Side: Information */}
                  <div className="flex-1 flex flex-col justify-between gap-4 relative z-10 w-full">
                    
                    <div className="space-y-1 text-[#5a98bd] font-medium">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                        <span className="bg-white text-[#74abcf] font-black px-3 sm:px-4 py-1.5 rounded-full border border-[#e1f0fa] shadow-sm text-xs sm:text-sm uppercase tracking-widest shrink-0">
                          #{order.id.toString().slice(0, 8)}
                        </span>
                        {getStatusBadge(order)}
                      </div>

                      <p className="text-sm">
                        Customer: <span className="font-bold text-[#74abcf] text-base">{order.customers?.first_name} {order.customers?.last_name}</span>
                      </p>
                      <p className="text-sm">
                        Service: <span className="font-bold text-[#74abcf] text-base">{order.service_types?.service_name}</span>
                      </p>
                      <p className="text-sm">
                        Date: <span className="font-bold text-[#74abcf] text-base">{new Date(order.date).toLocaleDateString()}</span>
                      </p>

                      {order.addresses && (
                        <p className="text-sm pt-2 wrap-break-word">
                          Address: <span className="font-bold text-[#74abcf] text-base">
                            {[
                              order.addresses.building_no,
                              order.addresses.street,
                              order.addresses.city,
                              order.addresses.province,
                              order.addresses.zip_code
                            ].filter(Boolean).join(", ")}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-[#e1f0fa] shadow-sm self-start w-full sm:w-auto">
                      <span className="text-sm font-bold text-[#97d5fc] uppercase tracking-widest ml-2">Weight:</span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={editedWeight}
                            onChange={e => setEditedWeight(e.target.value)}
                            className="border-2 border-[#abddfc] focus:border-[#74abcf] outline-none px-3 py-1.5 rounded-xl w-20 sm:w-24 text-center font-black text-[#74abcf] transition-colors"
                          />
                          <span className="font-bold text-[#5a98bd]">kg</span>
                        </div>
                      ) : (
                        <span className="font-black text-[#74abcf] text-xl pr-2">{order.weight_kg} kg</span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Total & Controls */}
                  <div className="flex flex-col gap-4 w-full lg:w-64 relative z-10 shrink-0">
                    
                    {/* Polished Price Tag */}
                    <div className="bg-white border-2 border-[#e1f0fa] text-[#74abcf] rounded-2xl p-4 text-center shadow-sm w-full">
                      <p className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-2">Total Amount</p>
                      
                      <div className="text-xs font-bold text-[#5a98bd] mb-2 flex flex-col gap-1 bg-[#f4faff] p-2 rounded-xl border border-[#e1f0fa]">
                        <div className="flex justify-between px-1"><span>Service:</span> <span>₱{servicePrice.toFixed(2)}</span></div>
                        {deliveryFee > 0 && <div className="flex justify-between px-1"><span>Delivery:</span> <span>₱{deliveryFee.toFixed(2)}</span></div>}
                      </div>

                      <p className="text-3xl font-black tracking-tighter mt-1">
                        ₱{totalPrice.toFixed(2)}
                      </p>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-col gap-3 flex-1 justify-end w-full">
                      {isEditing ? (
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => setEditingOrderId(null)}
                            className="w-12 sm:w-auto sm:flex-1 bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-400 px-2 sm:px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex justify-center items-center shrink-0"
                          >
                            <X size={18} />
                          </button>
                          <button
                            onClick={() => saveChanges(order)}
                            className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 flex justify-center items-center gap-2"
                          >
                            <Check size={16} strokeWidth={3} /> Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingOrderId(order.id);
                              setEditedWeight(order.weight_kg);
                            }}
                            className="w-full bg-white border-2 border-[#abddfc] hover:bg-[#f9fcff] text-[#74abcf] px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 flex justify-center items-center gap-2"
                          >
                            <Edit2 size={16} /> Edit Weight
                          </button>

                          <div className="relative w-full">
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#97d5fc] pointer-events-none" size={20} />
                            <select
                              value={order.order_status}
                              onChange={e => updateStatus(order.id, e.target.value)}
                              className="w-full bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#5a98bd] font-bold px-4 py-3 rounded-xl text-sm appearance-none cursor-pointer transition-colors shadow-sm focus:outline-none focus:border-[#74abcf]"
                            >
                              <option value="Pending">Status: Pending</option>
                              <option value="In Progress">Status: In Progress</option>
                              {order.order_method === "Walk-in" && (
                                <option value="Ready for Pickup">Status: Ready for Pickup</option>
                              )}
                              {order.order_method === "Delivery" && (
                                <option value="Out for Delivery">Status: Out for Delivery</option>
                              )}
                              <option value="Claimed">Status: Claimed</option>
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              if(window.confirm("Are you sure you want to cancel this order?")) {
                                cancelOrder(order.id);
                              }
                            }}
                            className="w-full bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-400 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 lg:mt-auto"
                          >
                            Cancel Order
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}