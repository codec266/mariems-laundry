import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Search, Filter, Download, Printer, BarChart3, Package, TrendingUp, CreditCard } from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminSalesReport() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCustomer, setFilterCustomer] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filteredOrders, setFilteredOrders] = useState([]);
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0, avgOrder: 0 });
  const [serviceBreakdown, setServiceBreakdown] = useState({});

  // Fetch all claimed orders
  const fetchSales = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate("/");

    const { data: adminData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();
    if (adminData) setFirstName(adminData.first_name);

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id,
        date,
        weight_kg,
        delivery_fee,
        total_amount,
        order_status,
        customers(first_name,last_name),
        service_types(service_name),
        addresses(building_no,street,city,province,zip_code)
      `)
      .eq("order_status", "Claimed")
      .order("date", { ascending: false });

    if (!error && ordersData) {
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      calculateSummary(ordersData);
    }

    setLoading(false);
  };

  useEffect(() => { fetchSales(); }, []);

  // Apply customer and date filters
  const applyFilters = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be after end date.");
      return;
    }

    const filtered = orders.filter(order => {
      const customerName = `${order.customers?.first_name || ""} ${order.customers?.last_name || ""}`.toLowerCase();
      const matchesCustomer = customerName.includes(filterCustomer.toLowerCase());

      const orderDate = new Date(order.date);

      const start = startDate ? new Date(startDate) : null;
      if (start) start.setHours(0, 0, 0, 0);

      const end = endDate ? new Date(endDate) : null;
      if (end) end.setHours(23, 59, 59, 999);

      const matchesStart = !start || orderDate >= start;
      const matchesEnd = !end || orderDate <= end;

      return matchesCustomer && matchesStart && matchesEnd;
    });

    setFilteredOrders(filtered);
    calculateSummary(filtered);
  };

  // Calculate summary and service breakdown
  const calculateSummary = (data) => {
    const totalOrders = data.length;
    const totalRevenue = data.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;

    const breakdown = {};
    data.forEach(order => {
      const service = order.service_types?.service_name || "Other";
      if (!breakdown[service]) breakdown[service] = 0;
      breakdown[service] += Number(order.total_amount);
    });

    setSummary({ totalOrders, totalRevenue, avgOrder });
    setServiceBreakdown(breakdown);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/"); };
  const formatMoney = v => `₱${Number(v).toFixed(2)}`;

  // export csv
  const exportCSV = () => {
    const headers = ["Customer", "Service", "Weight", "Delivery Fee", "Total", "Date", "Address"];
    const rows = filteredOrders.map(o => {
      const customer = `${o.customers?.first_name || ""} ${o.customers?.last_name || ""}`;
      const service = o.service_types?.service_name || "Other";
      const delivery = o.delivery_fee || 0;
      const address = o.addresses ? [
        o.addresses.building_no,
        o.addresses.street,
        o.addresses.city,
        o.addresses.province,
        o.addresses.zip_code
      ].filter(Boolean).join(", ") : "";

      return [customer, service, o.weight_kg, delivery, o.total_amount, new Date(o.date).toLocaleDateString(), `"${address}"`];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales_report.csv";
    a.click();
  };

  const printReport = () => { window.print(); };

  return (
    <div className="min-h-screen bg-[#abddfc] p-4 md:p-8 flex flex-col md:flex-row gap-6 font-sans">

      {/* SIDEBAR (Hidden on Print) */}
      <div className="w-full md:w-64 shrink-0 flex flex-col print:hidden">
        <div className="flex justify-center md:justify-start mb-6 px-4">
          <img src={logo} alt="Mariem's Laundry Logo" className="w-48 h-auto object-contain drop-shadow-sm" />
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 text-[#74abcf] font-black text-lg shadow-sm mb-4">
          <div className="bg-[#97d5fc] rounded-full p-2 text-white"><User size={24} strokeWidth={2.5}/></div>
          <span>{firstName}</span>
        </div>
        <div className="bg-white rounded-3xl p-6 flex flex-col gap-6 text-[#74abcf] font-black text-xl shadow-sm">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors"><Home size={28} strokeWidth={2.5}/> Dashboard</button>
          <button onClick={() => navigate("/admin-active-orders")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors"><ShoppingCart size={28} strokeWidth={2.5}/> Active Orders</button>
          <button onClick={() => navigate("/admin-order-history")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors"><ShoppingCart size={28} strokeWidth={2.5}/> Order History</button>
          <button className="flex items-center gap-4 text-[#97d5fc]"><BarChart3 size={28} strokeWidth={2.5}/> Sales Report</button>
          <hr className="border-[#e1f0fa]" />
          <button onClick={handleLogout} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors"><LogOut size={28} strokeWidth={2.5}/> Logout</button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-5 md:p-10 flex flex-col print:shadow-none print:p-0 print:rounded-none overflow-hidden">
        
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">Sales Report</h1>
        </div>

        {/* FILTERS (Hidden on Print) */}
        <div className="print:hidden flex flex-col xl:flex-row gap-4 mb-8 items-start xl:items-center bg-[#f4faff] p-5 rounded-3xl border border-[#e1f0fa]">
          
          {/* Search */}
          <div className="relative w-full xl:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20}/>
            <input type="text" placeholder="Search customer..." className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-white focus:border-[#abddfc] focus:outline-none text-[#5a98bd] shadow-sm font-medium placeholder-[#b8dcf2] transition-colors" value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)}/>
          </div>

          {/* Dates */}
          <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs font-bold text-[#97d5fc] uppercase tracking-widest hidden sm:block">From</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border-2 border-white focus:border-[#abddfc] focus:outline-none text-[#74abcf] font-bold shadow-sm bg-white transition-colors text-sm"/>
            </div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs font-bold text-[#97d5fc] uppercase tracking-widest hidden sm:block">To</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 rounded-2xl border-2 border-white focus:border-[#abddfc] focus:outline-none text-[#74abcf] font-bold shadow-sm bg-white transition-colors text-sm"/>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap sm:flex-nowrap w-full xl:w-auto gap-2">
            <button onClick={applyFilters} className="flex-1 sm:flex-none bg-[#97d5fc] hover:bg-[#74abcf] text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-colors shadow-sm active:scale-95">
              <Filter size={16} strokeWidth={3}/> Apply
            </button>
            <button onClick={exportCSV} className="flex-1 sm:flex-none bg-emerald-400 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-colors shadow-sm active:scale-95">
              <Download size={16} strokeWidth={3}/> Export
            </button>
            <button onClick={printReport} className="flex-1 sm:flex-none w-full sm:w-auto bg-gray-300 hover:bg-gray-400 text-gray-700 px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest transition-colors shadow-sm active:scale-95">
              <Printer size={16} strokeWidth={3}/> Print
            </button>
          </div>

        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-2 -bottom-2 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><Package size={80} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Total Completed Orders</h3>
              <p className="text-4xl font-black text-[#74abcf]">{summary.totalOrders}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 shadow-sm relative overflow-hidden group">
             <div className="absolute -right-2 -bottom-2 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><TrendingUp size={80} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Total Revenue</h3>
              <p className="text-4xl font-black text-[#74abcf]">{formatMoney(summary.totalRevenue)}</p>
            </div>
          </div>

          <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-4xl p-6 shadow-sm relative overflow-hidden group sm:col-span-2 lg:col-span-1">
             <div className="absolute -right-2 -bottom-2 text-[#e1f0fa] group-hover:text-[#abddfc] transition-colors opacity-50"><CreditCard size={80} strokeWidth={1} /></div>
            <div className="relative z-10">
              <h3 className="text-[#97d5fc] font-black uppercase tracking-widest text-xs mb-2">Average Order Value</h3>
              <p className="text-4xl font-black text-[#74abcf]">{formatMoney(summary.avgOrder)}</p>
            </div>
          </div>

        </div>

        {/* SERVICE BREAKDOWN */}
        <div className="bg-white border-2 border-[#e1f0fa] rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
          <h2 className="text-xl font-black text-[#74abcf] uppercase tracking-tighter mb-4 flex items-center gap-2">
            <BarChart3 size={24} className="text-[#97d5fc]"/> Revenue Breakdown by Service
          </h2>
          
          {Object.keys(serviceBreakdown).length === 0 ? (
             <p className="text-[#97d5fc] font-medium py-2">No service data available for this period.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(serviceBreakdown).map(([service, amount]) => (
                <div key={service} className="flex justify-between items-center py-3 border-b-2 border-dashed border-[#e1f0fa] last:border-0 hover:bg-[#f4faff] px-4 rounded-xl transition-colors">
                  <span className="font-bold text-[#5a98bd] uppercase tracking-wide text-sm">{service}</span>
                  <span className="font-black text-[#74abcf] text-lg">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TABLE */}
        <div className="w-full overflow-x-auto rounded-2xl border border-[#e1f0fa] shadow-sm bg-white mb-8">
          <table className="w-full min-w-175 text-left text-sm text-[#5a98bd]">
            <thead className="bg-[#f4faff] text-[#74abcf] uppercase font-black text-xs border-b border-[#e1f0fa]">
              <tr>
                <th className="py-4 px-4 md:px-6">Customer</th>
                <th className="py-4 px-4 md:px-6">Service</th>
                <th className="py-4 px-4 md:px-6 text-center">Weight</th>
                <th className="py-4 px-4 md:px-6 text-center">Delivery</th>
                <th className="py-4 px-4 md:px-6 text-center">Total</th>
                <th className="py-4 px-4 md:px-6">Date</th>
                <th className="py-4 px-4 md:px-6">Address</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#97d5fc] font-bold animate-pulse">Loading report...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-[#5a98bd] font-bold bg-[#f4faff]">No sales records found for this period.</td></tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-[#e1f0fa] hover:bg-[#f9fcff] transition-colors last:border-0">
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-bold whitespace-nowrap">{order.customers?.first_name} {order.customers?.last_name}</td>
                    <td className="py-4 px-4 md:px-6 whitespace-nowrap">{order.service_types?.service_name}</td>
                    <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">{order.weight_kg} kg</td>
                    <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap text-[#97d5fc]">
                      ₱{Number(order.delivery_fee || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-black text-center whitespace-nowrap">
                      ₱{Number(order.total_amount).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-bold whitespace-nowrap">{new Date(order.date).toLocaleDateString()}</td>
                    <td className="py-4 px-4 md:px-6 text-xs text-[#97d5fc] truncate max-w-37.5 md:max-w-62.5" title={order.addresses && [
                        order.addresses.building_no,
                        order.addresses.street,
                        order.addresses.city,
                        order.addresses.province,
                        order.addresses.zip_code
                      ].filter(Boolean).join(", ")}>
                      {order.addresses && [
                        order.addresses.building_no,
                        order.addresses.street,
                        order.addresses.city,
                        order.addresses.province,
                        order.addresses.zip_code
                      ].filter(Boolean).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}