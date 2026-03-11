import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Check, X, TrendingUp, Clock, Package, BarChart3, RefreshCw, FileText, MapPin, CreditCard } from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);

  const [pendingCount, setPendingCount] = useState(0);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/");
      return;
    }

    // fetch admin data
    const { data: adminData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();

    if (adminData) setFirstName(adminData.first_name);

    // Updated Query: Added order_items, pricing_model, and order_method
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id,
        date,
        weight_kg,
        total_amount,
        delivery_fee,
        order_status,
        order_method,
        is_accepted,
        payment_status,
        payments(payment_method),
        customers(first_name, last_name),
        service_types(service_name, base_price, pricing_model),
        addresses(building_no, street, city, province, zip_code),
        order_items(quantity, unit_price, service_items(item_name))
      `)
      .order("date", { ascending: false });

    if (!error && ordersData) {
      const pending = ordersData.filter(o => o.order_status === "Pending" && !o.is_accepted);
      const ongoing = ordersData.filter(o => ["In Progress", "Ready for Pickup", "Out for Delivery"].includes(o.order_status));
      const completed = ordersData.filter(o => o.order_status === "Claimed");

      setPendingOrders(pending);
      setPendingCount(pending.length);
      setOngoingCount(ongoing.length);

      const revenue = completed.reduce((sum, order) => sum + Number(order.total_amount), 0);
      setTotalRevenue(revenue);
    }

    setLoading(false);
    if (isManualRefresh) {
      setTimeout(() => setIsRefreshing(false), 500); 
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleAccept = async (orderId) => {
    const { error } = await supabase
      .from("orders")
      .update({ 
        is_accepted: true 
      })
      .eq("id", orderId);

    if (!error) {
      fetchDashboardData();
    }
  };

  const handleDeny = async (orderId) => {
    if(!window.confirm("Are you sure you want to deny and cancel this order?")) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "Cancelled" })
      .eq("id", orderId);

    if (!error) {
      fetchDashboardData();
    }
  };

  const getStatusBadge = (order) => {
    let colorClass = "bg-gray-100 text-gray-700";
    if (order.order_status === "Pending" && !order.is_accepted) colorClass = "bg-orange-100 text-orange-700";
    else if (order.order_status === "Pending" && order.is_accepted) colorClass = "bg-blue-100 text-blue-700";
    else if (order.order_status === "In Progress") colorClass = "bg-purple-100 text-purple-700";
    else if (["Ready for Pickup", "Out for Delivery"].includes(order.order_status)) colorClass = "bg-teal-100 text-teal-700";
    else if (["Claimed", "Completed"].includes(order.order_status)) colorClass = "bg-emerald-100 text-emerald-700";
    else if (order.order_status === "Cancelled") colorClass = "bg-rose-100 text-rose-700";

    return (
      <span className={`px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider ${colorClass} text-center shadow-sm border border-white/50`}>
        {order.order_status === "Pending" && !order.is_accepted ? "Pending Approval" : order.order_status}
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
          <button className="flex items-center gap-4 text-[#97d5fc]">
            <Home size={28} strokeWidth={2.5} /> Dashboard
          </button>
          <button onClick={() => navigate("/admin-active-orders")} className="flex items-center gap-4 text-[#5a98bd] hover:text-[#97d5fc] transition-colors">
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

        <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">
          Dashboard Overview
        </h1>

        {/* QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><Clock size={120} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Pending Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{pendingCount}</p>
            </div>
          </div>
          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><Package size={120} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Active Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{ongoingCount}</p>
            </div>
          </div>
          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><TrendingUp size={120} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Total Revenue</h3>
              <p className="text-4xl md:text-5xl font-black text-[#74abcf] tracking-tighter">₱{Number(totalRevenue).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* PENDING ORDERS */}
        <div className="bg-white border-2 border-[#e1f0fa] rounded-4xl p-5 md:p-8 flex-1 flex flex-col">

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter flex items-center gap-3">
              <span className="bg-[#f4faff] p-2 rounded-xl text-[#97d5fc]"><Clock size={24} strokeWidth={3} /></span>
              Action Required
            </h2>
            <button 
              onClick={() => fetchDashboardData(true)} 
              disabled={isRefreshing || loading}
              className="flex items-center justify-center gap-2 bg-[#f4faff] border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} strokeWidth={2.5} />
              <span>Refresh</span>
            </button>
          </div>

          <hr className="border-[#e1f0fa] mb-6" />

          {loading && !isRefreshing ? (
            <div className="flex-1 flex justify-center items-center">
              <p className="text-[#97d5fc] font-bold text-lg animate-pulse py-10">Loading pending orders...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex-1 bg-[#f4faff] border-2 border-dashed border-[#e1f0fa] rounded-3xl flex justify-center items-center p-10">
              <p className="text-[#5a98bd] font-bold text-lg text-center">You're all caught up!<br/><span className="text-[#97d5fc] text-sm">No pending orders require your attention.</span></p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {pendingOrders.map(order => {
                const deliveryFee = Number(order.delivery_fee || 0);
                const servicePrice = Number(order.total_amount) - deliveryFee;

                return (
                  <div key={order.id} className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start gap-6 md:gap-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">

                    {/* Left: Info */}
                    <div className="space-y-2 text-[#5a98bd] font-medium text-sm w-full lg:flex-1">
                      <div className="mb-4">
                         <span className="bg-white text-[#74abcf] font-black px-4 py-1.5 rounded-full border border-[#e1f0fa] text-xs uppercase tracking-widest shadow-sm">
                            #{order.id.toString().slice(0, 8)}
                          </span>
                      </div>

                      <p className="text-sm">
                        Customer: <span className="font-bold text-[#74abcf] text-base">{order.customers?.first_name} {order.customers?.last_name}</span>
                      </p>
                      <p className="text-sm">
                        Service: <span className="font-bold text-[#74abcf] text-base">{order.service_types?.service_name}</span>
                      </p>
                      <p className="text-sm">
                        Volume: <span className="font-bold text-[#74abcf] text-base">
                          {order.service_types?.pricing_model === 'per_item' ? 'Per Item (See Details)' : `${order.weight_kg || 0} kg`}
                        </span>
                      </p>
                      <p className="text-sm">
                         Date: <span className="font-bold text-[#74abcf] text-base">{new Date(order.date).toLocaleDateString()}</span>
                      </p>

                      {order.addresses && (
                        <p className="pt-2 text-sm wrap-break-word mb-4">
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

                    {/* Right Side: Total Breakdown & Controls */}
                    <div className="flex flex-col gap-4 w-full lg:w-64 shrink-0 mt-2 lg:mt-0">
                    
                      <div className="bg-white border-2 border-[#e1f0fa] text-[#74abcf] rounded-2xl p-4 text-center shadow-sm w-full">
                        <p className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-2">Estimated Amount</p>
                        
                        <div className="text-xs font-bold text-[#5a98bd] mb-2 flex flex-col gap-1 bg-[#f4faff] p-2 rounded-xl border border-[#e1f0fa]">
                          <div className="flex justify-between px-1"><span>Service:</span> <span>₱{servicePrice.toFixed(2)}</span></div>
                          {deliveryFee > 0 && <div className="flex justify-between px-1"><span>Delivery:</span> <span>₱{deliveryFee.toFixed(2)}</span></div>}
                        </div>

                        <p className="text-3xl font-black tracking-tighter mt-1">
                          ₱{Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>

                      {/* Action Buttons with Details */}
                      <div className="flex flex-col gap-2 w-full justify-end">
                        <button 
                          onClick={() => { setSelectedDetailsOrder(order); setShowDetailsModal(true); }}
                          className="w-full bg-white border-2 border-[#e1f0fa] hover:bg-[#f4faff] hover:border-[#abddfc] text-[#97d5fc] hover:text-[#74abcf] px-4 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                          <FileText size={16} strokeWidth={3}/> View Details
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(order.id)}
                            className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <Check size={16} strokeWidth={3} /> Accept
                          </button>
                          <button
                            onClick={() => handleDeny(order.id)}
                            className="flex-1 bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-400 px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <X size={16} strokeWidth={3} /> Deny
                          </button>
                        </div>
                      </div>
                      
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ================= ORDER DETAILS MODAL ================= */}
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
    </div>
  );
}