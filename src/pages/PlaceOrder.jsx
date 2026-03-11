import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  User, Home, ShoppingCart, LogOut, ArrowLeft, 
  Shirt, Sparkles, Truck, Store, Plus, Minus, MapPin, Banknote, Smartphone 
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/logo.png";

const orderMethods = [
  { id: "delivery", name: "PICK-UP & DELIVERY", icon: Truck },
  { id: "drop_off", name: "SELF DROP-OFF", icon: Store },
];

const serviceIcons = {
  wash_fold: Shirt,
  dry_clean: Sparkles,
};

export default function PlaceOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // UI States
  const [userName, setUserName] = useState("Your Name");
  const [orderMethod, setOrderMethod] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("cod"); 
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Service States
  const [services, setServices] = useState([]); 
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const activeService = services.find(s => s.id === selectedServiceId) || null;

  // Pricing Model States: Per Load (Weight)
  const [weight, setWeight] = useState(8); 

  // Pricing Model States: Per Item
  const [serviceItems, setServiceItems] = useState([]); // items available for the selected service
  const [orderItems, setOrderItems] = useState({}); // { item_id: quantity }

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // get customer name
      const { data: customer } = await supabase
        .from("customers")
        .select("first_name")
        .eq("id", user.id)
        .single();
      if (customer) setUserName(customer.first_name);

      // get addresses
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (addressData) {
        setAddresses(addressData);
        if (addressData.length > 0) setSelectedAddressId(addressData[0].id);
      }

      // get services
      const { data: serviceData } = await supabase.from("service_types").select("*");
      if (serviceData && serviceData.length > 0) {
        setServices(serviceData);
        setSelectedServiceId(serviceData[0].id); // Default to first service
      }
    };
    fetchData();
  }, [navigate]);

  // Fetch items when a 'per_item' service is selected
  useEffect(() => {
    const fetchItems = async () => {
      if (activeService && activeService.pricing_model === 'per_item') {
        const { data } = await supabase
          .from("service_items")
          .select("*")
          .eq("service_type_id", activeService.id);
        
        if (data) {
          setServiceItems(data);
          setOrderItems({}); // Reset cart when changing services
        }
      }
    };
    fetchItems();
  }, [activeService]);

  // Handlers for Per Item Cart
  const handleItemQuantityChange = (itemId, delta) => {
    setOrderItems(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const updated = { ...prev, [itemId]: newQty };
      if (newQty === 0) delete updated[itemId];
      return updated;
    });
  };

  // Dynamic Total Calculation
  const deliveryFee = orderMethod === "delivery" ? 40 : 0; 
  let serviceTotal = 0;

  if (activeService?.pricing_model === 'per_item') {
    // Sum up the specific items
    serviceTotal = Object.entries(orderItems).reduce((sum, [itemId, qty]) => {
      const item = serviceItems.find(i => i.id === itemId);
      return sum + (item ? Number(item.price) * qty : 0);
    }, 0);
  } else {
    // Default to per_load calculation (blocks of 8kg)
    const blocks = Math.ceil(weight / 8);
    serviceTotal = blocks * Number(activeService?.base_price || 0);
  }

  const calculatedTotal = serviceTotal + deliveryFee;
  const isOrderValid = activeService?.pricing_model === 'per_item' ? Object.keys(orderItems).length > 0 : true;

  // Place order
  const handleConfirmOrder = async () => {
    if (!isOrderValid) {
      alert("Please add at least one item to your order.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const isPerItem = activeService.pricing_model === 'per_item';

    // 1. Create the Main Order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders").insert([{
        customer_id: user.id,
        address_id: orderMethod === "delivery" ? selectedAddressId : null,
        service_type_id: selectedServiceId,
        weight_kg: isPerItem ? null : weight, // Nullable for per_item
        total_amount: calculatedTotal,
        delivery_fee: deliveryFee,        
        order_status: "Pending",
        payment_status: "Unpaid",
        date: new Date().toISOString(),
        order_method: orderMethod === "delivery" ? "Delivery" : "Walk-in",
      }])
      .select()
      .single();

    if (orderError) {
      setLoading(false);
      console.error("Order error:", orderError.message);
      alert("Failed to place order. See console.");
      return;
    }

    // 2. If Per Item, Insert Order Items
    if (isPerItem) {
      const itemsToInsert = Object.entries(orderItems).map(([itemId, qty]) => {
        const itemDef = serviceItems.find(i => i.id === itemId);
        return {
          order_id: newOrder.id,
          service_item_id: itemId,
          quantity: qty,
          unit_price: itemDef.price
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
      
      if (itemsError) {
        console.error("Items insert error:", itemsError.message);
        // Note: You might want to implement rollback logic here in a real production app
      }
    }

    // 3. Create Payment Record
    const { error: paymentError } = await supabase.from("payments").insert([{
      order_id: newOrder.id,
      amount_paid: calculatedTotal,
      payment_method: paymentMethod === "cod" ? "Cash" : "GCash"
    }]);

    setLoading(false);

    if (paymentError) {
      console.error("Payment error:", paymentError.message);
      alert("Order placed, but payment record failed. Check console.");
      return;
    }

    alert("Order placed successfully!");
    navigate("/orders");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
          <span>{userName}</span>
        </div>
        <div className="bg-white rounded-3xl p-6 flex flex-col gap-6 text-[#74abcf] font-black text-xl shadow-sm">
          <button onClick={() => navigate("/home")} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors">
            <Home size={28} strokeWidth={2.5} /> Home
          </button>
          <button onClick={() => navigate("/orders")} className="flex items-center gap-4 text-[#97d5fc] transition-colors">
            <ShoppingCart size={28} strokeWidth={2.5} /> Orders
          </button>
          <hr className="border-blue-50" />
          <button onClick={handleLogout} className="flex items-center gap-4 hover:text-[#97d5fc] transition-colors mt-2">
            <LogOut size={28} strokeWidth={2.5} /> Logout
          </button>
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="flex-1 bg-white rounded-[40px] shadow-2xl p-5 md:p-10 flex flex-col relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <button onClick={() => navigate("/orders")} className="text-[#97d5fc] hover:text-[#74abcf] hover:-translate-x-1 transition-all">
            <ArrowLeft size={32} strokeWidth={3}/>
          </button>
          <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter">
            Place Order
          </h1>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 space-y-6 md:space-y-8 pb-48 md:pb-32"> 

          {/* SECTION 1 & 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* Service Type */}
            <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8">
              <h2 className="text-[#74abcf] font-black uppercase tracking-tighter mb-4 text-lg md:text-xl">1. Service Type</h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {services.map(service => {
                  // Fallback icon based on name matching
                  const Icon = service.service_name.toLowerCase().includes('dry') ? Sparkles : Shirt;
                  const isActive = selectedServiceId === service.id;

                  return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 md:gap-3 transition-all border-4 shadow-sm active:scale-95 ${
                        isActive 
                          ? 'border-[#74abcf] text-[#74abcf] shadow-md bg-[#f9fcff]' 
                          : 'border-[#e1f0fa] text-[#97d5fc] hover:border-[#abddfc] hover:text-[#74abcf]'
                      }`}
                    >
                      <Icon size={36} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="font-black text-[11px] md:text-sm uppercase tracking-tight leading-tight">
                        {service.service_name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Method */}
            <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8">
              <h2 className="text-[#74abcf] font-black uppercase tracking-tighter mb-4 text-lg md:text-xl">2. Order Method</h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                {orderMethods.map(method => {
                  const Icon = method.icon;
                  const isActive = orderMethod === method.id;
                  return (
                    <button 
                      key={method.id} onClick={() => setOrderMethod(method.id)}
                      className={`bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 md:gap-3 transition-all border-4 shadow-sm active:scale-95 ${
                        isActive 
                          ? 'border-[#74abcf] text-[#74abcf] shadow-md bg-[#f9fcff]' 
                          : 'border-[#e1f0fa] text-[#97d5fc] hover:border-[#abddfc] hover:text-[#74abcf]'
                      }`}
                    >
                      <Icon size={36} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="font-black text-[11px] md:text-sm uppercase tracking-tight leading-tight">{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            
            {/* DYNAMIC SECTION: Weight OR Items based on Pricing Model */}
            {activeService?.pricing_model === 'per_item' ? (
              // PER ITEM UI (Dry Cleaning)
              <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8 flex flex-col">
                <h2 className="text-[#74abcf] font-black uppercase tracking-tighter mb-4 text-lg md:text-xl">3. Select Items</h2>
                <div className="flex-1 flex flex-col gap-3 max-h-64 overflow-y-auto pr-2">
                  {serviceItems.length === 0 ? (
                     <p className="text-[#97d5fc] font-bold text-center py-4">Loading items...</p>
                  ) : (
                    serviceItems.map(item => {
                      const qty = orderItems[item.id] || 0;
                      return (
                        <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border-2 border-[#e1f0fa] shadow-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#74abcf]">{item.item_name}</span>
                            <span className="text-xs font-black text-[#97d5fc]">₱{Number(item.price).toFixed(2)}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                             <button onClick={() => handleItemQuantityChange(item.id, -1)} className="bg-[#f4faff] text-[#74abcf] p-1.5 rounded-lg hover:bg-[#abddfc] hover:text-white transition-colors active:scale-90 border border-[#e1f0fa]">
                              <Minus size={16} strokeWidth={3}/>
                            </button>
                            <span className="font-black text-[#74abcf] w-4 text-center tabular-nums">{qty}</span>
                            <button onClick={() => handleItemQuantityChange(item.id, 1)} className="bg-[#97d5fc] text-white p-1.5 rounded-lg hover:bg-[#74abcf] transition-colors active:scale-90 border border-[#97d5fc]">
                              <Plus size={16} strokeWidth={3}/>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              // PER LOAD UI (Wash & Fold)
              <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8 flex flex-col">
                <h2 className="text-[#74abcf] font-black uppercase tracking-tighter mb-4 text-lg md:text-xl">3. Laundry Weight (kg)</h2>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 py-4">
                  <div className="flex items-center gap-4 sm:gap-6 bg-white py-3 px-4 sm:py-4 sm:px-6 rounded-full shadow-sm border-2 border-[#e1f0fa]">
                    <button onClick={() => setWeight(w => Math.max(1, w-1))} className="bg-[#f4faff] text-[#74abcf] p-3 sm:p-4 rounded-full hover:bg-[#abddfc] hover:text-white transition-colors active:scale-90 border-2 border-[#e1f0fa]">
                      <Minus size={20} strokeWidth={3}/>
                    </button>
                    <span className="text-4xl sm:text-5xl font-black text-[#74abcf] w-20 sm:w-24 text-center tabular-nums">{weight}</span>
                    <button onClick={() => setWeight(w => w+1)} className="bg-[#97d5fc] text-white p-3 sm:p-4 rounded-full hover:bg-[#74abcf] transition-colors active:scale-90 border-2 border-[#97d5fc]">
                      <Plus size={20} strokeWidth={3}/>
                    </button>
                  </div>
                  <p className="text-[10px] md:text-xs font-bold text-[#97d5fc] uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-[#e1f0fa]">
                    Min charge ₱{activeService?.base_price || 165} per 8kg
                  </p>
                </div>
              </div>
            )}

            {/* Address */}
            <div className={`rounded-3xl p-5 md:p-8 flex flex-col transition-all border ${
              orderMethod === 'delivery' 
                ? 'bg-[#f4faff] border-[#e1f0fa]' 
                : 'bg-white border-dashed border-[#e1f0fa] opacity-60'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#74abcf] font-black uppercase tracking-tighter text-lg md:text-xl">4. Address</h2>
                {orderMethod === 'drop_off' && (
                  <span className="text-[10px] font-black text-[#74abcf] uppercase bg-[#e1f0fa] px-3 py-1.5 rounded-lg tracking-widest">
                    Not Required
                  </span>
                )}
              </div>
              <div className="flex-1 flex flex-col gap-4">
                {addresses.length > 0 && orderMethod === 'delivery' ? (
                  addresses.map(addr => (
                    <div 
                      key={addr.id} 
                      className={`bg-white rounded-2xl p-4 sm:p-5 relative cursor-pointer transition-all ${
                        selectedAddressId === addr.id 
                          ? 'border-4 border-[#74abcf] shadow-md bg-[#f9fcff]' 
                          : 'border-2 border-[#e1f0fa] hover:border-[#abddfc] shadow-sm'
                      }`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={18} className={selectedAddressId === addr.id ? 'text-[#74abcf]' : 'text-[#97d5fc]'} />
                        <p className="font-black text-[#74abcf] text-base md:text-lg uppercase tracking-tight">{addr.name}</p>
                      </div>
                      <p className="text-[#5a98bd] font-medium text-xs md:text-sm leading-relaxed pl-6">
                        {addr.building_no}, {addr.street} <br/>
                        {addr.city}, {addr.province} <br/>
                        {addr.zip_code || ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex items-center justify-center py-6">
                    <p className="text-[#97d5fc] font-bold text-center text-sm md:text-base">No saved addresses</p>
                  </div>
                )}
                <button 
                  disabled={orderMethod === 'drop_off'} 
                  onClick={() => navigate("/profile", {state: {tab: "addresses" } })}
                  className="w-full bg-white border-2 border-[#abddfc] hover:bg-[#f4faff] disabled:border-[#e1f0fa] disabled:text-[#e1f0fa] disabled:bg-white text-[#74abcf] py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-sm active:scale-95 mt-auto"
                >
                  + Add New Address
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 5: PAYMENT */}
          <div className="bg-[#f4faff] border border-[#e1f0fa] rounded-3xl p-5 md:p-8">
            <h2 className="text-[#74abcf] font-black uppercase tracking-tighter mb-4 text-lg md:text-xl">5. Payment Method</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMethod("cod")}
                className={`bg-white rounded-2xl p-5 md:p-6 flex items-center justify-between transition-all border-4 shadow-sm active:scale-95 ${
                  paymentMethod === 'cod' 
                    ? 'border-[#74abcf] text-[#74abcf] shadow-md bg-[#f9fcff]' 
                    : 'border-[#e1f0fa] text-[#97d5fc] hover:border-[#abddfc] hover:text-[#74abcf]'
                }`}
              >
                <span className="font-black text-sm md:text-lg uppercase tracking-widest">Cash on Delivery</span>
                <Banknote size={28} strokeWidth={paymentMethod === 'cod' ? 2.5 : 2}/>
              </button>
              
              <button 
                onClick={() => setPaymentMethod("gcash")}
                className={`bg-white rounded-2xl p-5 md:p-6 flex items-center justify-between transition-all border-4 shadow-sm active:scale-95 ${
                  paymentMethod === 'gcash' 
                    ? 'border-[#74abcf] text-[#74abcf] shadow-md bg-[#f9fcff]' 
                    : 'border-[#e1f0fa] text-[#97d5fc] hover:border-[#abddfc] hover:text-[#74abcf]'
                }`}
              >
                <span className="font-black text-sm md:text-lg uppercase tracking-widest">GCash</span>
                <Smartphone size={28} strokeWidth={paymentMethod === 'gcash' ? 2.5 : 2}/>
              </button>
            </div>

            {/* Payment method description */}
            <div className="mt-4 bg-white rounded-2xl p-4 md:p-5 border-2 border-[#e1f0fa] shadow-sm flex items-start gap-3">
              <div className="text-[#97d5fc] pt-0.5">
                {paymentMethod === 'cod' ? <Banknote size={20} /> : <Smartphone size={20} />}
              </div>
              <div>
                {paymentMethod === "cod" && (
                  <p className="text-[#5a98bd] font-bold text-xs md:text-sm leading-relaxed">
                    Pay in cash when your laundry is delivered or picked up by our staff.
                  </p>
                )}

                {paymentMethod === "gcash" && (
                  <p className="text-[#5a98bd] font-bold text-xs md:text-sm leading-relaxed">
                    Please wait for staff confirmation before sending your payment via GCash. The QR code will be available in your Orders tab.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= STICKY SUMMARY BAR ================= */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-[#e1f0fa] p-5 md:p-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8 shadow-[0_-10px_40px_-15px_rgba(116,171,207,0.15)] rounded-b-[40px] z-20">
          
          {/* Price Details Container */}
          <div className="flex flex-col text-center md:text-left w-full md:w-auto">
            
            {/* Delivery Tag */}
            {orderMethod === "delivery" && (
              <div className="flex items-center justify-center md:justify-start gap-2 text-[#5a98bd] font-bold text-xs mb-1.5 md:mb-2">
                <span className="bg-[#f4faff] px-2 py-1 rounded-md border border-[#e1f0fa] tracking-wide text-[#74abcf]">
                  + Delivery Fee: ₱{deliveryFee.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex flex-col text-[#74abcf] leading-none">
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-1 md:mb-2 text-[#97d5fc]">
                Total Estimated Cost
              </span>
              <span className="text-3xl md:text-5xl font-black tracking-tighter">
                ₱ {calculatedTotal.toFixed(2)}
              </span>
            </div>
          </div>
          
          <button 
            onClick={handleConfirmOrder}
            disabled={loading || !isOrderValid || (orderMethod === 'delivery' && !selectedAddressId)}
            className="w-full md:w-auto bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] disabled:text-[#97d5fc] disabled:active:scale-100 text-white px-8 md:px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-base md:text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            {loading ? "Processing..." : "Confirm Order"}
          </button>

        </div>

      </div>
    </div>
  );
}