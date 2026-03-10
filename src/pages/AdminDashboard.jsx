import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Check, X, TrendingUp, Clock, Package, BarChart3 } from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);

  const [pendingCount, setPendingCount] = useState(0);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);

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
        customers(first_name, last_name),
        service_types(service_name),
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
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-8 md:p-10 flex flex-col gap-8">

        <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">
          Dashboard Overview
        </h1>

        {/* QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50">
              <Clock size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Pending Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{pendingCount}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50">
              <Package size={120} strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Ongoing Orders</h3>
              <p className="text-5xl font-black text-[#74abcf]">{ongoingCount}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
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
        <div className="bg-white border-2 border-[#e1f0fa] rounded-4xl p-6 md:p-8 flex-1 flex flex-col">

          <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mb-4 flex items-center gap-3">
            <span className="bg-[#f4faff] p-2 rounded-xl text-[#97d5fc]"><Clock size={24} strokeWidth={3} /></span>
            Action Required: Pending Orders
          </h2>

          <hr className="border-[#e1f0fa] mb-6" />

          {loading ? (
            <div className="flex-1 flex justify-center items-center">
              <p className="text-[#97d5fc] font-bold text-lg animate-pulse">Loading pending orders...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex-1 bg-[#f4faff] border-2 border-dashed border-[#e1f0fa] rounded-3xl flex justify-center items-center p-10">
              <p className="text-[#5a98bd] font-bold text-lg text-center">You're all caught up!<br/><span className="text-[#97d5fc] text-sm">No pending orders require your attention.</span></p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm hover:shadow-md transition-shadow">

                  <div className="space-y-1 text-[#5a98bd] font-medium text-sm">
                    <div className="mb-2">
                       <span className="bg-white text-[#74abcf] font-black px-3 py-1 rounded-full border border-[#e1f0fa] text-xs uppercase tracking-widest">
                          #{order.id.toString().slice(0, 8)}
                        </span>
                    </div>

                    <p>
                      Customer: <span className="font-bold text-[#74abcf] text-base">{order.customers?.first_name} {order.customers?.last_name}</span>
                    </p>

                    <p>
                      Service: <span className="font-bold text-[#74abcf] text-base">{order.service_types?.service_name}</span>
                    </p>

                    <p className="flex gap-4">
                      <span>Weight: <span className="font-bold text-[#74abcf] text-base">{order.weight_kg} kg</span></span>
                      <span>Date: <span className="font-bold text-[#74abcf] text-base">{new Date(order.dropoff_date || order.date).toLocaleDateString()}</span></span>
                    </p>

                    {order.addresses && (
                      <p className="pt-2">
                        Address: <span className="font-bold text-[#74abcf]">
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

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <button
                      onClick={() => handleAccept(order.id)}
                      className="flex-1 sm:flex-none bg-emerald-400 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Check size={18} strokeWidth={3} /> Accept
                    </button>

                    <button
                      onClick={() => {
                        if(window.confirm("Are you sure you want to deny and cancel this order?")) {
                          handleDeny(order.id);
                        }
                      }}
                      className="flex-1 sm:flex-none bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-400 px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <X size={18} strokeWidth={3} /> Deny
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}