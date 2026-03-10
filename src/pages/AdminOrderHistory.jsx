import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, Search, Filter, BarChart3 } from "lucide-react";
import logo from "../assets/logo.png";

export default function AdminOrderHistory() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCustomer, setFilterCustomer] = useState("");

  const fetchOrderHistory = async () => {
    setLoading(true);

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

    const { data: ordersData, error } = await supabase
      .from("orders")
      .select(`
        id,
        date,
        weight_kg,
        total_amount,
        order_status,
        is_accepted,
        customers(first_name,last_name),
        service_types(service_name),
        addresses(building_no,street,city,province,zip_code)
      `)
      .order("date", { ascending: false });

    if (!error && ordersData) {
      const history = ordersData.filter(
        o => ["Claimed", "Cancelled"].includes(o.order_status)
      );
      setOrders(history);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrderHistory();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getDisplayStatus = (order) => {
    if (order.order_status === "Pending" && !order.is_accepted) return "Pending Approval";
    if (order.order_status === "Pending" && order.is_accepted) return "Accepted — Waiting for Processing";
    return order.order_status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    let colorClass = "bg-[#f4faff] text-[#74abcf]"; // Default soft blue

    if (order.order_status === "Pending" && !order.is_accepted) {
      colorClass = "bg-orange-100 text-orange-700";
    } else if (order.order_status === "Pending" && order.is_accepted) {
      colorClass = "bg-blue-100 text-blue-700";
    } else if (order.order_status === "In Progress") {
      colorClass = "bg-purple-100 text-purple-700";
    } else if (["Ready for Pickup", "Out for Delivery"].includes(order.order_status)) {
      colorClass = "bg-teal-100 text-teal-700";
    } else if (["Claimed"].includes(order.order_status)) {
      colorClass = "bg-emerald-100 text-emerald-700";
    } else if (order.order_status === "Cancelled") {
      colorClass = "bg-rose-100 text-rose-700";
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>
        {displayStatus}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === "All" || order.order_status === filterStatus;
    const customerName = `${order.customers?.first_name} ${order.customers?.last_name}`.toLowerCase();
    const matchesCustomer = customerName.includes(filterCustomer.toLowerCase());

    return matchesStatus && matchesCustomer;
  });

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

          <button onClick={() => navigate("/admin-active-orders")} className="flex items-center gap-4 text-[#5a98bd] hover:text-[#97d5fc] transition-colors">
            <ShoppingCart size={28} strokeWidth={2.5} /> Active Orders
          </button>

          <button className="flex items-center gap-4 text-[#97d5fc] transition-colors">
            <ShoppingCart size={28} strokeWidth={2.5} /> Order History
          </button>

          <button onClick={() => navigate("/admin-sales-report")} className="flex items-center gap-4 text-[#5a98bd] hover:text-[#97d5fc] transition-colors">
            <BarChart3 size={28} strokeWidth={2.5} /> Sales Report
          </button>

          <hr className="border-blue-50" />

          <button onClick={handleLogout} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors">
            <LogOut size={28} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-5 md:p-10 flex flex-col overflow-hidden">
        <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter mb-8">
          Order History
        </h1>

        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-4 mb-8 items-start xl:items-center bg-[#f4faff] p-5 rounded-3xl border border-[#e1f0fa]">
          
          <div className="relative w-full xl:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} />
            <input
              type="text"
              placeholder="Search by customer name..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-white focus:border-[#abddfc] focus:outline-none text-[#5a98bd] shadow-sm font-medium placeholder-[#b8dcf2] transition-colors"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
            />
          </div>

          <div className="relative w-full xl:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} />
            <select
              className="w-full pl-12 pr-4 py-3 rounded-2xl border-2 border-white focus:border-[#abddfc] focus:outline-none text-[#5a98bd] shadow-sm font-medium appearance-none cursor-pointer bg-white transition-colors"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Claimed">Claimed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto rounded-2xl border border-[#e1f0fa] shadow-sm bg-white">
          <table className="w-full min-w-150 text-left text-sm text-[#5a98bd]">
            <thead className="bg-[#f4faff] text-[#74abcf] uppercase font-black tracking-wider text-xs border-b border-[#e1f0fa]">
              <tr>
                <th className="py-4 px-4 md:px-6">Customer</th>
                <th className="py-4 px-4 md:px-6">Service</th>
                <th className="py-4 px-4 md:px-6 text-center">Weight</th>
                <th className="py-4 px-4 md:px-6 text-center">Total</th>
                <th className="py-4 px-4 md:px-6 text-center">Status</th>
                <th className="py-4 px-4 md:px-6">Date</th>
                <th className="py-4 px-4 md:px-6">Address</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#97d5fc] font-bold animate-pulse">
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-[#5a98bd] font-bold bg-[#f4faff]">
                    No orders found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-[#e1f0fa] hover:bg-[#f9fcff] transition-colors last:border-0">
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-bold whitespace-nowrap">
                      {order.customers?.first_name} {order.customers?.last_name}
                    </td>
                    <td className="py-4 px-4 md:px-6 whitespace-nowrap">
                      {order.service_types?.service_name}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                      {order.weight_kg} kg
                    </td>
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-bold text-center whitespace-nowrap">
                      ₱{order.total_amount.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                      {getStatusBadge(order)}
                    </td>
                    <td className="py-4 px-4 md:px-6 text-[#74abcf] font-bold whitespace-nowrap">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
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