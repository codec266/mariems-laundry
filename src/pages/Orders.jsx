import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { User, Home, ShoppingCart, LogOut, X, RefreshCw, FileText, MapPin, CreditCard, Clock, Send, UploadCloud, CheckCircle, ExternalLink } from "lucide-react";
import logo from "../assets/logo.png";
import gcash from "../assets/gcash.jpg";

export default function Orders() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [pendingOrders, setPendingOrders] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Payment Submission state (Updated for File Upload)
  const [paymentFile, setPaymentFile] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);

  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data: userData } = await supabase
      .from("customers")
      .select("first_name")
      .eq("id", user.id)
      .single();
    if (userData) setFirstName(userData.first_name);

    // Fetch Orders
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
        payment_proof_url,
        service_types(service_name, base_price, pricing_model),
        payment_status,
        payments(payment_method),
        addresses(building_no, street, city, province, zip_code, name),
        order_items(quantity, unit_price, service_items(item_name))
      `)
      .eq("customer_id", user.id)
      .order("date", { ascending: false });

    if (!error && ordersData) {
      setPendingOrders(ordersData.filter(o => !["Claimed", "Cancelled", "Completed"].includes(o.order_status)));
      setOrderHistory(ordersData.filter(o => ["Claimed", "Cancelled", "Completed"].includes(o.order_status)));
    }
    
    setLoading(false);
    if (isManualRefresh) {
      setTimeout(() => setIsRefreshing(false), 500); 
    }
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

  // --- SUBMIT PAYMENT WITH FILE UPLOAD LOGIC ---
  const handlePaymentSubmit = async () => {
    if (!paymentFile) {
      alert("Please upload a screenshot of your payment receipt.");
      return;
    }

    setIsSubmittingPayment(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Generate a unique file path: userId/orderId-timestamp.ext
      const fileExt = paymentFile.name.split('.').pop();
      const fileName = `${selectedOrder.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // 2. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(filePath, paymentFile);

      if (uploadError) throw uploadError;

      // 3. Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(filePath);

      // 4. Update the order with the URL and new status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ 
          payment_status: "Verifying", 
          payment_proof_url: publicUrl 
        })
        .eq("id", selectedOrder.id);

      if (updateError) throw updateError;

      alert("Payment screenshot submitted! Our staff will verify it shortly.");
      setShowPaymentModal(false);
      setPaymentFile(null);
      fetchOrders(); // Refresh to update UI badges

    } catch (error) {
      console.error("Payment upload error:", error);
      alert("Failed to submit payment screenshot. Please try again.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getDisplayStatus = (order) => {
    if (order.order_status === "Pending" && !order.is_accepted) return "Pending Approval";
    if (order.order_status === "Pending" && order.is_accepted) return "Accepted — Waiting for Processing";
    return order.order_status;
  };

  const getStatusBadge = (order) => {
    const displayStatus = getDisplayStatus(order);
    let colorClass = "bg-gray-100 text-gray-700";

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

  // Helper for Payment Status Badge
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
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter">Active Orders</h2>
            <button 
              onClick={() => fetchOrders(true)} 
              disabled={isRefreshing || loading}
              className="flex items-center justify-center gap-2 bg-[#f4faff] border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} strokeWidth={2.5} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <hr className="border-[#e1f0fa] border rounded-full mb-6" />

          {loading && !isRefreshing ? (
            <div className="flex-1 flex justify-center items-center">
              <p className="text-[#97d5fc] font-bold text-lg animate-pulse py-10">Loading active orders...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="flex-1 bg-white border-2 border-dashed border-[#e1f0fa] rounded-3xl flex justify-center items-center p-10">
              <p className="text-[#5a98bd] font-bold text-lg text-center">No pending orders.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {pendingOrders.map(order => {
                const deliveryFee = Number(order.delivery_fee || 0);
                const servicePrice = Number(order.total_amount) - deliveryFee;

                return (
                  <div key={order.id} className="bg-white border-2 border-[#e1f0fa] rounded-4xl p-5 sm:p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start gap-6 md:gap-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    
                    <div className="space-y-2 text-[#5a98bd] font-medium text-sm w-full lg:flex-1">
                      <div className="mb-4">
                         <span className="bg-[#f4faff] text-[#74abcf] font-black px-4 py-1.5 rounded-full border border-[#e1f0fa] text-xs uppercase tracking-widest shadow-sm">
                            #{order.id.toString().slice(0, 8)}
                          </span>
                      </div>

                      <p className="text-sm">
                        Date: <span className="font-bold text-[#74abcf] text-base">{new Date(order.date).toLocaleDateString()}</span>
                      </p>

                      <p className="text-sm">
                        Service: <span className="font-bold text-[#74abcf] text-base">{order.service_types?.service_name}</span>
                      </p>

                      <p className="text-sm">
                        Volume: <span className="font-bold text-[#74abcf] text-base">
                          {order.weight_kg ? `${order.weight_kg} kg` : 'Per Item Breakdown'}
                        </span>
                      </p>

                      <div className="pt-4 flex flex-wrap items-center gap-2">
                        {getStatusBadge(order)}
                        {getPaymentBadge(order.payment_status)}
                      </div>
                    </div>

                    {/* Breakdown & Controls */}
                    <div className="flex flex-col gap-4 w-full lg:w-72 shrink-0 mt-2 lg:mt-0">
                      
                      <div className="bg-[#f4faff] border-2 border-[#e1f0fa] text-[#74abcf] rounded-2xl p-4 text-center shadow-sm w-full">
                        <p className="text-xs font-black text-[#97d5fc] uppercase tracking-widest mb-2">Total Amount</p>
                        
                        <div className="text-xs font-bold text-[#5a98bd] mb-2 flex flex-col gap-1 bg-white p-2 rounded-xl border border-[#e1f0fa]">
                          <div className="flex justify-between px-1"><span>Service:</span> <span>₱{servicePrice.toFixed(2)}</span></div>
                          {deliveryFee > 0 && <div className="flex justify-between px-1"><span>Delivery:</span> <span>₱{deliveryFee.toFixed(2)}</span></div>}
                        </div>

                        <p className="text-3xl font-black tracking-tighter mt-1">
                          ₱{Number(order.total_amount).toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full justify-end">
                        <button 
                          onClick={() => { setSelectedDetailsOrder(order); setShowDetailsModal(true); }}
                          className="flex-1 bg-white border-2 border-[#e1f0fa] hover:bg-[#f4faff] hover:border-[#abddfc] text-[#97d5fc] hover:text-[#74abcf] px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <FileText size={16} strokeWidth={2.5}/> Details
                        </button>
                        
                        {order.order_status === "Pending" && !order.is_accepted && (
                          <button type="button" onClick={() => handleCancelOrder(order.id)} 
                            className="flex-1 bg-white border-2 border-rose-200 hover:bg-rose-50 text-rose-400 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] sm:text-xs tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center">
                            Cancel
                          </button>
                        )}
                        {/* Only show Pay Now if it's accepted, unpaid, and uses GCash */}
                        {order.order_status === "Pending" &&
                          order.is_accepted &&
                          order.payment_status === "Unpaid" &&
                          order.payments?.some(p => p.payment_method === "GCash") && (
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowPaymentModal(true);
                              }}
                              className="flex-1 bg-[#74abcf] hover:bg-[#5a98bd] text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] sm:text-xs tracking-widest transition-colors shadow-sm active:scale-95 flex items-center justify-center">
                              Pay Now
                            </button>
                          )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Order History */}
        <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8 flex-1">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter">Order History</h2>
          </div>
          
          <hr className="border-[#e1f0fa] border rounded-full mb-6" />

          <div className="w-full overflow-x-auto rounded-2xl border border-[#e1f0fa] shadow-sm bg-white">
            <table className="w-full min-w-150 text-left text-[#5a98bd] text-sm">
              <thead className="bg-[#e1f0fa]/50 text-[#74abcf] uppercase font-black tracking-wider text-xs border-b border-[#e1f0fa]">
                <tr>
                  <th className="py-4 px-4 md:px-6">Date</th>
                  <th className="py-4 px-4 md:px-6">Service</th>
                  <th className="py-4 px-4 md:px-6 text-center">Volume</th>
                  <th className="py-4 px-4 md:px-6 text-center">Total</th>
                  <th className="py-4 px-4 md:px-6 text-center">Status</th>
                  <th className="py-4 px-4 md:px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="font-medium">
                {loading && !isRefreshing ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#97d5fc] font-bold animate-pulse">Loading past orders...</td></tr>
                ) : orderHistory.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-[#5a98bd] font-bold bg-[#f4faff]">No past orders.</td></tr>
                ) : (
                  orderHistory.map(order => (
                    <tr key={order.id} className="border-b border-[#e1f0fa] hover:bg-[#f4faff] transition-colors last:border-0">
                      <td className="py-4 px-4 md:px-6 font-bold text-[#74abcf] whitespace-nowrap">{new Date(order.date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 md:px-6 whitespace-nowrap">{order.service_types?.service_name}</td>
                      <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">{order.weight_kg ? `${order.weight_kg} kg` : 'Per Item'}</td>
                      <td className="py-4 px-4 md:px-6 text-center font-bold text-[#74abcf] whitespace-nowrap">₱{Number(order.total_amount).toFixed(2)}</td>
                      <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                        {getStatusBadge(order)}
                      </td>
                      <td className="py-4 px-4 md:px-6 text-center whitespace-nowrap">
                        <button 
                          onClick={() => { setSelectedDetailsOrder(order); setShowDetailsModal(true); }}
                          className="bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] p-2 rounded-xl transition-all shadow-sm active:scale-90"
                          title="View Details"
                        >
                          <FileText size={18} strokeWidth={2.5}/>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
                {getPaymentBadge(selectedDetailsOrder.payment_status)}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-[#f4faff] p-4 rounded-2xl border border-[#e1f0fa]">
                <div>
                  <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1"><Clock size={12}/> Date & Time</p>
                  <p className="font-bold text-[#5a98bd] text-sm mt-1">{new Date(selectedDetailsOrder.date).toLocaleString()}</p>
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
                {/* Show Link to Screenshot if provided */}
                {selectedDetailsOrder.payment_proof_url && (
                  <div className="col-span-2 bg-white p-3 rounded-xl border border-[#e1f0fa] flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-[#97d5fc] uppercase tracking-widest flex items-center gap-1">Payment Proof</p>
                      <p className="font-bold text-[#74abcf] text-sm mt-0.5">Screenshot Attached</p>
                    </div>
                    <a 
                      href={selectedDetailsOrder.payment_proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-[#f4faff] hover:bg-[#abddfc] text-[#74abcf] hover:text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} strokeWidth={2.5}/> View
                    </a>
                  </div>
                )}
              </div>

              {/* Items / Volume Details */}
              <div className="bg-white border-2 border-[#e1f0fa] rounded-2xl p-4">
                <h4 className="text-xs font-black text-[#74abcf] uppercase tracking-widest mb-3 border-b-2 border-dashed border-[#e1f0fa] pb-2">
                  Service Volume
                </h4>
                
                {selectedDetailsOrder.weight_kg ? (
                   <div className="flex justify-between font-bold text-[#5a98bd] text-sm">
                     <span>Total Weight</span>
                     <span>{selectedDetailsOrder.weight_kg} kg</span>
                   </div>
                ) : selectedDetailsOrder.order_items && selectedDetailsOrder.order_items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDetailsOrder.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between font-bold text-[#5a98bd] text-sm">
                        <span>{item.quantity}x {item.service_items?.item_name}</span>
                        <span>₱{(item.quantity * item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-[#97d5fc]">No items detailed.</p>
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

        {/* ================= NEW FILE UPLOAD PAYMENT MODAL ================= */}
        {showPaymentModal && selectedOrder && (
          <div className="fixed inset-0 bg-[#5a98bd]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-4xl shadow-2xl p-6 md:p-8 max-w-sm w-full relative flex flex-col items-center gap-4 border-2 border-[#e1f0fa] animate-in fade-in zoom-in duration-200">
              
              <h2 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter mt-2">Pay with GCash</h2>
              <p className="text-[#5a98bd] text-center font-medium text-sm px-4">
                Scan the QR code below, then upload a screenshot of your receipt.
              </p>

              <div className="bg-[#f4faff] p-4 rounded-3xl border-2 border-[#e1f0fa] shadow-inner mt-2 w-full flex justify-center">
                <img
                  src={gcash}
                  alt="GCash QR Code"
                  className="w-36 h-36 md:w-44 md:h-44 object-contain rounded-xl mix-blend-multiply"
                />
              </div>

              {/* Total Summary */}
              <div className="text-center w-full bg-[#f9fcff] p-4 rounded-2xl border border-[#e1f0fa]">
                <p className="font-medium text-[#5a98bd] text-sm flex justify-between">
                  Order ID: <span className="font-bold text-[#74abcf]">#{selectedOrder.id.toString().slice(0,8)}</span>
                </p>
                <hr className="my-2 border-[#e1f0fa] border-dashed" />
                <p className="font-black text-[#5a98bd] text-sm flex justify-between items-center">
                  Total to Pay: <span className="text-[#74abcf] text-xl">₱{Number(selectedOrder.total_amount).toFixed(2)}</span>
                </p>
              </div>

              {/* File Upload Box */}
              <div className="w-full mt-2 relative border-2 border-dashed border-[#abddfc] rounded-2xl p-4 flex flex-col items-center justify-center bg-[#f9fcff] hover:bg-[#f4faff] transition-colors cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPaymentFile(e.target.files[0]);
                    }
                  }}
                />
                {paymentFile ? (
                   <div className="flex flex-col items-center pointer-events-none">
                     <CheckCircle size={24} className="text-emerald-400 mb-1" strokeWidth={2.5}/>
                     <span className="text-sm font-bold text-[#74abcf] text-center px-2 truncate w-48">{paymentFile.name}</span>
                     <span className="text-[10px] text-[#97d5fc] font-black uppercase tracking-widest mt-1">Click to change</span>
                   </div>
                ) : (
                   <div className="flex flex-col items-center text-[#97d5fc] group-hover:text-[#74abcf] transition-colors pointer-events-none">
                     <UploadCloud size={28} strokeWidth={2.5} className="mb-2" />
                     <span className="text-xs font-black uppercase tracking-widest">Upload Screenshot</span>
                     <span className="text-[10px] font-bold mt-1">JPG, PNG</span>
                   </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex w-full gap-3 mt-2">
                <button
                  onClick={() => { setShowPaymentModal(false); setPaymentFile(null); }}
                  className="flex-1 bg-white border-2 border-[#e1f0fa] hover:bg-[#f4faff] text-[#97d5fc] px-4 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  disabled={isSubmittingPayment}
                  className="flex-2 flex justify-center items-center gap-2 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] text-white px-4 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-md"
                >
                  {isSubmittingPayment ? "Uploading..." : <><Send size={16} strokeWidth={3}/> Submit</>}
                </button>
              </div>

            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}