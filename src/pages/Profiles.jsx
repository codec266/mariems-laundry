import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { User, ArrowLeft, Save, Mail, MapPin, ShieldCheck, Trash2, Edit2, Plus, X, Phone } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("account");

  // account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // <-- ADDED PHONE STATE FOR UI
  const [loading, setLoading] = useState(false);

  // addresses
  const [addressName, setAddressName] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [buildingNo, setBuildingNo] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [province, setProvince] = useState("");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  // fetch profile and addresses
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      setEmail(user.email);

      // fetch only active addresses
      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (addressData) setAddresses(addressData);

      // fetch customer name
      const { data } = await supabase
        .from("customers")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setPhone(data.phone || "");
      }

      if (location.state?.tab) {
        setActiveTab(location.state.tab);
        if (location.state.tab === "addresses" && (!addressData || addressData.length === 0)) {
          setShowAddAddressForm(true);
        }
      }
    };
    fetchProfile();
  }, [navigate, location.state]);

  // soft-delete address
  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if this address is used in any order
    const { data: linkedOrders, error: orderCheckError } = await supabase
      .from("orders")
      .select("id, order_status")
      .eq("address_id", addressId);

    if (orderCheckError) {
      console.error("Order check error:", orderCheckError.message);
      alert("Unable to check orders. Try again.");
      return;
    }

    if (linkedOrders && linkedOrders.length > 0) {
      // If linked to active orders, prevent deletion
      const activeStatuses = ["Pending", "In Progress", "Out for Delivery", "Ready for Pickup"];
      const hasActive = linkedOrders.some(order => activeStatuses.includes(order.order_status));

      if (hasActive) {
        alert("Cannot delete this address. It is linked to an active order.");
        return;
      }

      // Otherwise, soft delete for historical orders
      const { error: softDeleteError } = await supabase
        .from("addresses")
        .update({ is_active: false })
        .eq("id", addressId)
        .eq("customer_id", user.id);

      if (!softDeleteError) {
        setAddresses(addresses.filter(addr => addr.id !== addressId)); // remove from UI
        alert("Address removed successfully.");
      } else {
        console.error("Soft delete error:", softDeleteError.message);
        alert("Failed to remove address. See console.");
      }

    } else {
      // No orders linked — safe to hard delete
      const { error: hardDeleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("customer_id", user.id);

      if (!hardDeleteError) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
        alert("Address deleted successfully.");
      } else {
        console.error("Hard delete error:", hardDeleteError.message);
        alert("Failed to delete address. See console.");
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // update account info
    if (activeTab === "account") {
      const { error } = await supabase
        .from("customers")
        .update({ 
          first_name: firstName, 
          last_name: lastName,
          phone: phone // <-- ADDED PHONE TO UPDATE PAYLOAD
        })
        .eq("id", user.id);

      setLoading(false);
      if (!error) alert("Account info updated successfully!");
    }

    // add or edit address
    if (activeTab === "addresses") {
      if (editingAddressId) {
        // UPDATE
        const { error } = await supabase
          .from("addresses")
          .update({
            name: addressName,
            building_no: buildingNo,
            street: street,
            city: city,
            zip_code: zipCode || null,
            province: province,
            is_active: true
          })
          .eq("id", editingAddressId)
          .eq("customer_id", user.id);

        if (!error) alert("Address updated successfully!");
        else console.error("Update error:", error.message);

        setEditingAddressId(null);
        setShowAddAddressForm(false);
      } else {
        // INSERT
        const { error } = await supabase
          .from("addresses")
          .insert([{
            customer_id: user.id,
            name: addressName,
            building_no: buildingNo,
            street: street,
            city: city,
            zip_code: zipCode || null,
            province: province,
            is_active: true
          }]);
        if (!error) alert("Address added successfully!");
      }

      // refresh active addresses
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setAddresses(data);

      // reset form
      setAddressName("");
      setBuildingNo("");
      setStreet("");
      setCity("");
      setZipCode("");
      setProvince("");
      setShowAddAddressForm(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#abddfc] p-4 md:p-10 font-sans">
      <div className="bg-white w-full max-w-5xl min-h-150 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-2 border-[#e1f0fa]">

        {/* LEFT SIDEBAR */}
        <div className="flex w-full md:w-2/5 flex-col items-center justify-start bg-[#f4faff] p-8 md:p-10 border-r-2 border-[#e1f0fa]">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-[#97d5fc] rounded-4xl flex items-center justify-center text-white shadow-inner mb-6 transform rotate-3 transition-transform hover:rotate-0">
            <User size={50} strokeWidth={2} />
          </div>
          <h3 className="text-[#74abcf] text-2xl font-black uppercase tracking-tighter mb-2 text-center">{firstName}'s Profile</h3>
          <p className="text-[#97d5fc] font-bold text-sm mb-8 text-center truncate w-full px-4">{email}</p>

          {/* Tabs */}
          <div className="w-full space-y-3 mt-auto md:mt-0">
            <button 
              onClick={() => { setActiveTab("account"); setShowAddAddressForm(false); setEditingAddressId(null); }}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                activeTab === "account" ? "bg-[#74abcf] text-white shadow-md scale-105" : "bg-white text-[#97d5fc] hover:text-[#74abcf] hover:bg-[#e1f0fa] border-2 border-[#e1f0fa]"
              }`}
            >
              <ShieldCheck size={18} strokeWidth={2.5} /> Account Info
            </button>
            <button 
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                activeTab === "addresses" ? "bg-[#74abcf] text-white shadow-md scale-105" : "bg-white text-[#97d5fc] hover:text-[#74abcf] hover:bg-[#e1f0fa] border-2 border-[#e1f0fa]"
              }`}
            >
              <MapPin size={18} strokeWidth={2.5} /> Saved Addresses
            </button>
          </div>
        </div>

        {/* RIGHT SIDE: MAIN CONTENT */}
        <div className="w-full md:w-3/5 flex flex-col p-8 md:p-12 bg-white relative">
          <button 
            type="button"
            onClick={() => navigate("/home")}
            className="absolute top-8 left-8 md:top-10 md:left-12 flex items-center gap-2 text-[#97d5fc] hover:text-[#74abcf] font-bold transition-all hover:-translate-x-1"
          > 
            <ArrowLeft size={24} strokeWidth={3} />
          </button>

          <form onSubmit={handleUpdate} className="flex-1 flex flex-col justify-center mt-12 md:mt-8">

            {/* ACCOUNT INFO */}
            {activeTab === "account" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-3xl font-black text-[#74abcf] uppercase tracking-tighter mb-8">Account Info</h2>
                
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b8dcf2]" size={18} strokeWidth={2.5} />
                      <input type="text" value={email} disabled className="w-full pl-12 pr-4 py-3 bg-[#f9fcff] border-2 border-[#e1f0fa] rounded-2xl text-[#97d5fc] font-bold cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">First Name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Last Name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm" required />
                    </div>
                  </div>

                  {/* PRETTY PHONE UI */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="flex shadow-sm rounded-2xl focus-within:ring-4 focus-within:ring-[#abddfc]/20 transition-all">
                      <div className="flex items-center justify-center bg-[#f4faff] border-2 border-r-0 border-[#e1f0fa] rounded-l-2xl px-4 text-[#74abcf] font-black text-sm select-none">
                        +63
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b8dcf2]" size={18} strokeWidth={2.5} />
                        <input 
                          type="tel" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                          placeholder="912 345 6789"
                          className="w-full pl-4 pr-10 py-3 border-2 border-[#e1f0fa] rounded-r-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors placeholder:text-[#b8dcf2] placeholder:font-medium" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-8 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95">
                  <Save size={18} strokeWidth={2.5} /> {loading ? "Saving Changes..." : "Update Information"}
                </button>
              </div>
            )}

            {/* ADDRESSES */}
            {activeTab === "addresses" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">

                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-3xl font-black text-[#74abcf] uppercase tracking-tighter leading-none">Saved Addresses</h2>
                  {!showAddAddressForm && editingAddressId === null && (
                    <button type="button" onClick={() => setShowAddAddressForm(true)} className="flex items-center gap-1 bg-white border-2 border-[#abddfc] hover:bg-[#f4faff] text-[#74abcf] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95">
                      <Plus size={16} strokeWidth={3} /> Add New
                    </button>
                  )}
                </div>

                {/* Addresses List */}
                {addresses.length > 0 && !showAddAddressForm && editingAddressId === null && (
                  <div className="space-y-4 mb-6">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="bg-[#f4faff] border-2 border-[#e1f0fa] hover:border-[#abddfc] rounded-2xl p-5 flex justify-between items-start transition-colors group">
                        <div>
                          <p className="font-black text-[#74abcf] text-lg uppercase tracking-tight mb-1 flex items-center gap-2">
                            <MapPin size={16} className="text-[#97d5fc]"/> {addr.name}
                          </p>
                          <p className="text-[#5a98bd] font-medium text-sm leading-relaxed pl-6">
                            {addr.building_no}, {addr.street} <br/>
                            {addr.city}, {addr.province} {addr.zip_code}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button type="button" onClick={() => {
                            setAddressName(addr.name);
                            setBuildingNo(addr.building_no);
                            setStreet(addr.street);
                            setCity(addr.city);
                            setZipCode(addr.zip_code || "");
                            setProvince(addr.province);
                            setEditingAddressId(addr.id);
                            setShowAddAddressForm(true);
                          }} className="bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] p-2 rounded-xl transition-all shadow-sm active:scale-90" title="Edit Address">
                            <Edit2 size={16} strokeWidth={2.5} />
                          </button>
                          <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="bg-white border-2 border-rose-100 hover:border-rose-300 text-rose-400 p-2 rounded-xl transition-all shadow-sm active:scale-90" title="Delete Address">
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {addresses.length === 0 && !showAddAddressForm && editingAddressId === null && (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-[#e1f0fa] rounded-3xl bg-[#f9fcff]">
                    <MapPin size={48} className="text-[#e1f0fa] mb-4" />
                    <p className="text-[#97d5fc] font-bold text-center">You haven't saved any addresses yet.</p>
                  </div>
                )}

                {/* Add/Edit Form */}
                {(showAddAddressForm || editingAddressId !== null) && (
                  <div className="bg-[#f4faff] border-2 border-[#e1f0fa] rounded-3xl p-6 space-y-4 shadow-inner">
                    <h3 className="text-[#74abcf] font-black uppercase tracking-widest text-sm mb-2">{editingAddressId ? "Edit Address" : "New Address Details"}</h3>
                    <div className="space-y-1">
                      <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">Label (e.g., Home, Office)</label>
                      <input type="text" value={addressName} onChange={(e) => setAddressName(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">Building / Unit No.</label>
                        <input type="text" value={buildingNo} onChange={(e) => setBuildingNo(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">Street</label>
                        <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">City</label>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">Province</label>
                        <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" required />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-[#97d5fc] text-[10px] font-black uppercase tracking-widest ml-1">ZIP Code (Optional)</label>
                        <input type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full px-4 py-3 border-2 border-white focus:border-[#abddfc] text-[#5a98bd] font-bold rounded-2xl outline-none shadow-sm transition-colors" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95">
                        <Save size={16} strokeWidth={3} /> {loading ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                      <button type="button" onClick={() => {
                        setShowAddAddressForm(false);
                        setEditingAddressId(null);
                        setAddressName("");
                        setBuildingNo("");
                        setStreet("");
                        setCity("");
                        setZipCode("");
                        setProvince("");
                      }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-2 border-[#e1f0fa] hover:bg-gray-50 text-gray-400 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95">
                        <X size={16} strokeWidth={3} /> Cancel
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}