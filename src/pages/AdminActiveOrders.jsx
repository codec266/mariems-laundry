import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { 
  User, Home, ShoppingCart, LogOut, Check, X, Edit2, 
  ChevronDown, BarChart3, RefreshCw, FileText, MapPin, 
  CreditCard, Clock, Plus, Minus, ExternalLink 
} from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminActiveOrders() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- INLINE EDITING STATES ---
  const [editingOrderId, setEditingOrderId] = useState(null);
  
  // For Per Load (Weight)
  const [editedWeight, setEditedWeight] = useState(0);

  // For Per Item (Dry Cleaning)
  const [isFetchingItems, setIsFetchingItems] = useState(false);
  const [availableServiceItems, setAvailableServiceItems] = useState([]); 
  const [editedItems, setEditedItems] = useState({}); 

  // Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  // Fetch orders and admin info
  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }

    const { data: adminData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();

    if (adminData) setFirstName(adminData.first_name);

    // Added payment_proof_url to the query
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id,
        date,
        weight_kg,
        total_amount,
        delivery_fee,
        order_status,
        service_type_id,
        is_accepted,
        order_method,
        payment_status,
        payment_proof_url,
        payments(payment_method),
        service_types(service_name, base_price, pricing_model),
        customers(first_name,last_name),
        addresses(building_no,street,city,province,zip_code),
        order_items(id, service_item_id, quantity, unit_price, service_items(item_name))
      `)
      .eq("is_accepted", true)
      .not("order_status", "in", '("Claimed","Cancelled")')
      .order("date", { ascending: false });

    if (!error && ordersData) setOrders(ordersData);
    
    setLoading(false);
    if (isManualRefresh) setTimeout(() => setIsRefreshing(false), 500); 
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // --- PAYMENT VERIFICATION LOGIC ---
  const handlePaymentAction = async (orderId, newStatus) => {
    // If rejecting, we clear the URL so the customer can upload a new one
    const updatePayload = { payment_status: newStatus };
    if (newStatus === "Unpaid") {
       if(!window.confirm("Are you sure you want to reject this payment proof? The customer will be asked to upload again.")) return;
       updatePayload.payment_proof_url = null;
    }

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId);

    if (!error) {
      fetchOrders();
    } else {
      alert("Failed to update payment status.");
    }
  };

  // --- EDITING LOGIC ---
  const startEditing = async (order) => {
    setEditingOrderId(order.id);
    const isPerItem = order.service_types?.pricing_model === 'per_item';

    if (isPerItem) {
      setIsFetchingItems(true);
      const { data } = await supabase
        .from("service_items")
        .select("*")
        .eq("service_type_id", order.service_type_id);
      
      setAvailableServiceItems(data || []);

      const currentItems = {};
      if (order.order_items) {
        order.order_items.forEach(item => {
          currentItems[item.service_item_id] = item.quantity;
        });
      }
      setEditedItems(currentItems);
      setIsFetchingItems(false);
    } else {
      setEditedWeight(order.weight_kg || 1);
    }
  };

  const handleItemQuantityChange = (itemId, delta) => {
    setEditedItems(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return { ...prev, [itemId]: newQty };
    });
  };

  const saveChanges = async (order) => {
    const isPerItem = order.service_types?.pricing_model === 'per_item';
    const deliveryFee = Number(order.delivery_fee || 0);

    if (isPerItem) {
      const itemsToInsert = availableServiceItems
        .map(item => ({
          order_id: order.id,
          service_item_id: item.id,
          quantity: editedItems[item.id] || 0,
          unit_price: item.price
        }))
        .filter(item => item.quantity > 0); 

      if (itemsToInsert.length === 0) {
        alert("Order must have at least one item. If you want to cancel, use the Cancel button.");
        return;
      }

      const servicePrice = itemsToInsert.reduce((sum, item) => sum + (item.quantity * Number(item.unit_price)), 0);
      const newTotal = servicePrice + deliveryFee;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ total_amount: newTotal })
        .eq("id", order.id);

      if (orderError) { alert("Failed to update order total."); return; }

      await supabase.from("order_items").delete().eq("order_id", order.id);
      await supabase.from("order_items").insert(itemsToInsert);

      setEditingOrderId(null);
      fetchOrders();

    } else {
      const weight = Math.max(1, Number(editedWeight) || 1);
      const basePrice = Number(order.service_types?.base_price || 165);
      const blocks = Math.ceil(weight / 8);
      const servicePrice = blocks * basePrice;
      const newTotal = servicePrice + deliveryFee;

      const { error } = await supabase
        .from("orders")
        .update({ weight_kg: weight, total_amount: newTotal })
        .eq("id", order.id);

      if (!error) {
        setEditingOrderId(null);
        fetchOrders();
      } else {
        alert("Failed to update weight.");
      }
    }
  };

  const updateStatus = async (orderId, status) => {
    const { error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("id", orderId);

    if (!error) fetchOrders();
  };

  const cancelOrder = async (orderId) => {
    if(!window.confirm("Are you sure you want to cancel this order?")) return;
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "Cancelled" })
      .eq("id", orderId);

    if (!error) fetchOrders();
  };

  // Badge Helpers
  const getDisplayStatus = (order) => {
    if (order.order_status === "Pending" && !order.is_accepted) return "Pending Approval";
    if (order.order_status === "Pending" && order.is_accepted) return "Accepted — Waiting for Processing";
    return order.order_status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    let colorClass = "bg-[#f4faff] text-[#74abcf]";

    if (order.order_status === "Pending" && !order.is_accepted) colorClass = "bg-orange-100 text-orange-700";
    else if (order.order_status === "Pending" && order.is_accepted) colorClass = "bg-blue-100 text-blue-700";
    else if (order.order_status === "In Progress") colorClass = "bg-purple-100 text-purple-700";
    else if (["Ready for Pickup", "Out for Delivery"].includes(order.order_status)) colorClass = "bg-teal-100 text-teal-700";
    else if (["Claimed", "Completed"].includes(order.order_status)) colorClass = "bg-emerald-100 text-emerald-700";
    else if (order.order_status === "Cancelled") colorClass = "bg-rose-100 text-rose-700";

    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${colorClass} text-center shadow-sm border border-white/50`}>
        {displayStatus}
      </span>
    );
  };

  const getPaymentBadge = (status) => {
    let colorClass = "bg-rose-100 text-rose-700"; // Unpaid
    if (status === "Verifying") colorClass = "bg-blue-100 text-blue-700";
    if (status === "Paid") colorClass = "bg-emerald-100 text-emerald-700";

    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${colorClass} text-center shadow-sm border border-white/50`}>
        Payment: {status || "Unpaid"}
      </span>
    );
  }

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
            <p className="text-[#97d5fc] font-bold text-lg animate-pulse py-10">Loading active orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[#f4faff] border-2 border-dashed border-[#e1f0fa] rounded-3xl p-10 flex justify-center items-center">
            <p className="text-[#5a98bd] font-bold text-lg text-center">All caught up! No active orders.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map(order => {
              const isEditing = editingOrderId === order.id;
              const isPerItem = order.service_types?.pricing_model === 'per_item';
              const deliveryFee = Number(order.delivery_fee || 0);

              let servicePrice = 0;
              let totalPrice = 0;

              if (isEditing) {
                if (isPerItem) {
                  servicePrice = availableServiceItems.reduce((sum, item) => {
                    const qty = editedItems[item.id] || 0;
                    return sum + (Number(item.price) * qty);
                  }, 0);
                  totalPrice = servicePrice + deliveryFee;
                } else {
                  const basePrice = Number(order.service_types?.base_price || 165);
                  const safeWeight = Math.max(1, Number(editedWeight) || 0);
                  const blocks = Math.ceil(safeWeight / 8);
                  servicePrice = blocks * basePrice;
                  totalPrice = servicePrice + deliveryFee;
                }
              } else {
                servicePrice = Number(order.total_amount) - deliveryFee;
                totalPrice = Number(order.total_amount);
              }

              return (
                <div
                  key={order.id}
                  className={`border-2 rounded-4xl p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between gap-6 md:gap-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                    order.payment_status === 'Verifying' ? 'bg-[#f0f9ff] border-[#bce3ff]' : 'bg-[#f4faff] border-[#e1f0fa]'
                  }`}
                >
                  {/* Left Side: Information */}
                  <div className="flex-1 flex flex-col justify-between gap-4 relative z-10 w-full">
                    
                    <div className="space-y-1 text-[#5a98bd] font-medium">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                        <span className="bg-white text-[#74abcf] font-black px-3 sm:px-4 py-1.5 rounded-full border border-[#e1f0fa] shadow-sm text-xs sm:text-sm uppercase tracking-widest shrink-0">
                          #{order.id.toString().slice(0, 8)}
                        </span>
                        {getStatusBadge(order)}
                        {getPaymentBadge(order.payment_status)}
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

                    {/* --- DYNAMIC EDITING UI (WEIGHT OR ITEMS) --- */}
                    {isEditing ? (
                      isPerItem ? (
                        <div className="mt-4 bg-white border border-[#e1f0fa] rounded-2xl p-4 shadow-sm animate-in fade-in duration-200">
                          <h4 className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-3 border-b-2 border-dashed border-[#e1f0fa] pb-2">
                            Edit Order Items
                          </h4>
                          {isFetchingItems ? (
                            <p className="text-sm font-bold text-[#97d5fc] animate-pulse">Loading items...</p>
                          ) : (
                            <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2">
                              {availableServiceItems.map(item => {
                                const qty = editedItems[item.id] || 0;
                                return (
                                  <div key={item.id} className="flex justify-between items-center bg-[#f4faff] p-2.5 rounded-xl border border-[#e1f0fa]">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-[#74abcf]">{item.item_name}</span>
                                      <span className="text-[10px] font-black text-[#97d5fc]">₱{Number(item.price).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => handleItemQuantityChange(item.id, -1)} className="bg-white text-[#74abcf] p-1.5 rounded-lg border border-[#e1f0fa] hover:bg-[#e1f0fa] transition-colors active:scale-95">
                                        <Minus size={14} strokeWidth={3}/>
                                      </button>
                                      <span className="font-black text-[#74abcf] w-4 text-center tabular-nums text-sm">{qty}</span>
                                      <button onClick={() => handleItemQuantityChange(item.id, 1)} className="bg-[#97d5fc] text-white p-1.5 rounded-lg border border-[#97d5fc] hover:bg-[#74abcf] transition-colors active:scale-95">
                                        <Plus size={14} strokeWidth={3}/>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-[#e1f0fa] shadow-sm self-start w-full sm:w-auto animate-in fade-in duration-200">
                          <span className="text-sm font-bold text-[#97d5fc] uppercase tracking-widest ml-2">Edit Weight:</span>
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
                        </div>
                      )
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-[#e1f0fa] shadow-sm self-start w-full sm:w-auto">
                        <span className="text-sm font-bold text-[#97d5fc] uppercase tracking-widest ml-2">Volume:</span>
                        {isPerItem ? (
                           <span className="font-black text-[#74abcf] text-lg pr-2">Per Item</span>
                        ) : (
                          <span className="font-black text-[#74abcf] text-xl pr-2">{order.weight_kg || 0} kg</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Side: Total & Controls */}
                  <div className="flex flex-col gap-4 w-full lg:w-64 relative z-10 shrink-0">
                    
                    {/* Price Tag */}
                    <div className="bg-white border-2 border-[#e1f0fa] text-[#74abcf] rounded-2xl p-4 text-center shadow-sm w-full transition-all">
                      <p className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-2">Total Amount</p>
                      
                      <div className="text-xs font-bold text-[#5a98bd] mb-2 flex flex-col gap-1 bg-[#f4faff] p-2 rounded-xl border border-[#e1f0fa]">
                        <div className="flex justify-between px-1"><span>Service:</span> <span>₱{servicePrice.toFixed(2)}</span></div>
                        {deliveryFee > 0 && <div className="flex justify-between px-1"><span>Delivery:</span> <span>₱{deliveryFee.toFixed(2)}</span></div>}
                      </div>

                      <p className="text-3xl font-black tracking-tighter mt-1 transition-all">
                        ₱{totalPrice.toFixed(2)}
                      </p>
                    </div>

                    {/* --- PAYMENT VERIFICATION UI --- */}
                    {order.payment_status === "Verifying" && order.payment_proof_url && (
                      <div className="bg-white border-2 border-blue-200 rounded-2xl p-3 flex flex-col gap-2 shadow-sm">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest text-center">Verify Payment</p>
                        <a 
                          href={order.payment_proof_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink size={14} strokeWidth={2.5}/> View Receipt
                        </a>
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => handlePaymentAction(order.id, "Paid")}
                            className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white py-2 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                            title="Approve Payment"
                          >
                            <Check size={18} strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => handlePaymentAction(order.id, "Unpaid")}
                            className="flex-1 bg-rose-400 hover:bg-rose-500 text-white py-2 rounded-xl flex items-center justify-center transition-colors shadow-sm"
                            title="Reject Payment"
                          >
                            <X size={18} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Standard Action Controls */}
                    <div className="flex flex-col gap-3 flex-1 justify-end w-full">
                      
                      {/* Hide edit buttons entirely if the order is already Paid */}
                      {!isEditing && order.payment_status !== "Paid" && (
                        <button
                          onClick={() => startEditing(order)}
                          className="w-full bg-white border-2 border-[#abddfc] hover:bg-[#f9fcff] text-[#74abcf] px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 flex justify-center items-center gap-2"
                        >
                          <Edit2 size={16} /> {isPerItem ? "Edit Items" : "Edit Weight"}
                        </button>
                      )}

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
                            onClick={() => { setSelectedDetailsOrder(order); setShowDetailsModal(true); }}
                            className="w-full bg-white border-2 border-[#e1f0fa] hover:bg-[#f4faff] hover:border-[#abddfc] text-[#97d5fc] hover:text-[#74abcf] px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                          >
                            <FileText size={16} strokeWidth={3}/> View Details
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

                          {/* Disabled if Paid, otherwise clickable */}
                          <button
                            onClick={() => {
                              if (order.payment_status !== "Paid") {
                                cancelOrder(order.id);
                              }
                            }}
                            disabled={order.payment_status === "Paid"}
                            title={order.payment_status === "Paid" ? "Cannot cancel a paid order" : ""}
                            className={`w-full border-2 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm lg:mt-auto ${
                              order.payment_status === "Paid" 
                                ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed" 
                                : "bg-white border-rose-200 hover:bg-rose-50 text-rose-400 active:scale-95"
                            }`}
                          >
                            {order.payment_status === "Paid" ? "Cannot Cancel (Paid)" : "Cancel Order"}
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

      {/* ================= ORDER DETAILS MODAL (Read-Only) ================= */}
      {showDetailsModal && selectedDetailsOrder && (
        <div className="fixed inset-0 bg-[#5a98bd]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-4xl shadow-2xl p-6 md:p-8 max-w-lg w-full relative flex flex-col gap-6 border-2 border-[#e1f0fa] animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            
            <button
              className="absolute top-4 right-4 md:top-6 md:right-6 text-[#97d5fc] hover:text-[#74abcf] transition-colors bg-[#f4faff] p-2 rounded-full"
              onClick={() => setShowDetailsModal(false)}
            >
              <X size={20} strokeWidth={3} />
            </button>

            <div>
              <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mb-1">Order Details</h2>
              <p className="text-[#97d5fc] font-bold text-sm">#{selectedDetailsOrder.id.toString().slice(0, 8)}</p>
            </div>

            {/* Status Row */}
            <div className="flex gap-2">
              {getStatusBadge(selectedDetailsOrder)}
              <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider text-center shadow-sm border border-white/50 ${
                selectedDetailsOrder.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                Payment: {selectedDetailsOrder.payment_status}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-[#f4faff] p-4 rounded-2xl border border-[#e1f0fa]">
              <div className="col-span-2">
                <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1"><User size={12}/> Customer</p>
                <p className="font-bold text-[#5a98bd] text-sm mt-1">
                  {selectedDetailsOrder.customers?.first_name} {selectedDetailsOrder.customers?.last_name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> Date</p>
                <p className="font-bold text-[#5a98bd] text-sm mt-1">{new Date(selectedDetailsOrder.date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1"><CreditCard size={12}/> Payment Method</p>
                <p className="font-bold text-[#5a98bd] text-sm mt-1">
                  {selectedDetailsOrder.payments?.[0]?.payment_method || "N/A"}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1"><MapPin size={12}/> Method & Location</p>
                <p className="font-bold text-[#5a98bd] text-sm mt-1">
                  {selectedDetailsOrder.order_method} 
                  {selectedDetailsOrder.addresses && ` • ${[
                      selectedDetailsOrder.addresses.building_no,
                      selectedDetailsOrder.addresses.street,
                      selectedDetailsOrder.addresses.city
                    ].filter(Boolean).join(", ")}`}
                </p>
              </div>
            </div>

            {/* Items / Volume Details */}
            <div className="bg-white border-2 border-[#e1f0fa] rounded-2xl p-4">
              <h4 className="text-xs font-black text-[#74abcf] uppercase tracking-widest mb-3 border-b-2 border-dashed border-[#e1f0fa] pb-2">
                Service Volume
              </h4>
              
              {selectedDetailsOrder.service_types?.pricing_model === 'per_item' ? (
                selectedDetailsOrder.order_items && selectedDetailsOrder.order_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDetailsOrder.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-bold text-[#5a98bd] text-sm">
                        <span>{item.quantity}x {item.service_items?.item_name || "Unknown Item"}</span>
                        <span>₱{(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[#97d5fc]">No items detailed.</p>
                )
              ) : (
                <div className="flex justify-between font-bold text-[#5a98bd] text-sm">
                   <span>Total Weight</span>
                   <span>{selectedDetailsOrder.weight_kg || 0} kg</span>
                </div>
              )}
            </div>

            {/* Summary Breakdown */}
            <div className="bg-[#f9fcff] p-4 rounded-2xl border border-[#e1f0fa]">
              <div className="w-full flex flex-col gap-1.5 mb-3 text-sm font-bold text-[#5a98bd]">
                <div className="flex justify-between">
                  <span>Service Cost:</span>
                  <span>₱{(Number(selectedDetailsOrder.total_amount) - Number(selectedDetailsOrder.delivery_fee || 0)).toFixed(2)}</span>
                </div>
                {Number(selectedDetailsOrder.delivery_fee || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>₱{Number(selectedDetailsOrder.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <hr className="my-3 border-[#e1f0fa] border-dashed" />
              <p className="font-black text-[#5a98bd] text-lg flex justify-between items-center">
                Total Amount: <span className="text-[#74abcf] text-2xl">₱{Number(selectedDetailsOrder.total_amount).toFixed(2)}</span>
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}