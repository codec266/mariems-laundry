import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Check, X, TrendingUp, Clock, Package, BarChart3, RefreshCw } from "lucide-react";
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

    // fetch orders (Added delivery_fee and price_per_8kg for the breakdown)
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
        customers(first_name, last_name),
        service_types(service_name, price_per_8kg),
        addresses(building_no, street, city, province, zip_code)
      `)
      .order("date", { ascending: false });

    if (!error && ordersData) {
      const pending = ordersData.filter(o => o.order_status === "Pending" && !o.is_accepted);
      const ongoing = ordersData.filter(o => ["In Progress", "Ready for Pickup", "Out for Delivery"].includes(o.order_status));
      const completed = ordersData.filter(o => o.order_status === "Claimed");

      setPendingOrders(pending);
      setPendingCount(pending.length);
      setOngoingCount(ongoing.length);

      const revenue = completed.reduce((sum, order) => sum + order.total_amount, 0);
      setTotalRevenue(revenue);
    }

    setLoading(false);
    if (isManualRefresh) {
      setTimeout(() => setIsRefreshing(false), 500); // Small delay to show spin animation
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

    if (!error) fetchDashboardData();
  };

  const handleDeny = async (orderId) => {
    if(!window.confirm("Are you sure you want to deny and cancel this order?")) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ order_status: "Cancelled" })
      .eq("id", orderId);

    if (!error) fetchDashboardData();
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
            <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50">
              <Clock size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Pending Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50">
              <Package size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Active Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{ongoingCount}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50">
              <TrendingUp size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Total Revenue</h3>
              <p className="text-4xl md:text-5xl font-black text-[#74abcf] tracking-tighter">₱{totalRevenue.toFixed(2)}</p>
            </div>
          </div>

        </div>

        {/* PENDING ORDERS */}
        <div className="bg-white border-2 border-[#e1f0fa] rounded-4xl p-5 md:p-8 flex-1 flex flex-col">

          {/* Header & Refresh Button */}
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
              <p className="text-[#97d5fc] font-bold text-lg animate-pulse">Loading pending orders...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex-1 bg-[#f4faff] border-2 border-dashed border-[#e1f0fa] rounded-3xl flex justify-center items-center p-10">
              <p className="text-[#5a98bd] font-bold text-lg text-center">You're all caught up!<br/><span className="text-[#97d5fc] text-sm">No pending orders require your attention.</span></p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {pendingOrders.map(order => {
                // Calculate Breakdown
                const pricePer8kg = Number(order.service_types?.price_per_8kg || 165);
                const blocks = Math.ceil(order.weight_kg / 8);
                const servicePrice = blocks * pricePer8kg;
                const deliveryFee = Number(order.delivery_fee || 0);
                const totalPrice = servicePrice + deliveryFee;

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

                      <p className="text-sm flex gap-4">
                        <span>Weight: <span className="font-bold text-[#74abcf] text-base">{order.weight_kg} kg</span></span>
                      </p>
                      
                      <p className="text-sm flex gap-4">
                         <span>Date: <span className="font-bold text-[#74abcf] text-base">{new Date(order.date).toLocaleDateString()}</span></span>
                      </p>

                      {order.addresses && (
                        <p className="pt-2 text-sm wrap-break-word">
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
                    
                      {/* Polished Price Tag */}
                      <div className="bg-white border-2 border-[#e1f0fa] text-[#74abcf] rounded-2xl p-4 text-center shadow-sm w-full">
                        <p className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-2">Estimated Amount</p>
                        
                        <div className="text-xs font-bold text-[#5a98bd] mb-2 flex flex-col gap-1 bg-[#f4faff] p-2 rounded-xl border border-[#e1f0fa]">
                          <div className="flex justify-between px-1"><span>Service:</span> <span>₱{servicePrice.toFixed(2)}</span></div>
                          {deliveryFee > 0 && <div className="flex justify-between px-1"><span>Delivery:</span> <span>₱{deliveryFee.toFixed(2)}</span></div>}
                        </div>

                        <p className="text-3xl font-black tracking-tighter mt-1">
                          ₱{totalPrice.toFixed(2)}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 w-full justify-end">
                        <button
                          onClick={() => handleAccept(order.id)}
                          className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Check size={16} strokeWidth={3} /> Accept
                        </button>

                        <button
                          onClick={() => handleDeny(order.id)}
                          className="flex-1 bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-400 px-4 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                        >
                          <X size={16} strokeWidth={3} /> Deny
                        </button>
                      </div>
                      
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}