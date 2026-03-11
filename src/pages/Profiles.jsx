import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import { User, ArrowLeft, Save, Mail, MapPin, ShieldCheck, Trash2, Edit2, Plus, X, CheckCircle, AlertTriangle, Lock, Key } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("account");

  // account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // security (password)
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

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

  // UI Polish: Notifications & Modals
  const [notification, setNotification] = useState(null); // { type: 'success' | 'error', message: '' }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // fetch profile and addresses
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      setEmail(user.email);

      // fetch active addresses
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

  // Execute actual deletion after confirmation
  const executeDeleteAddress = async (addressId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: linkedOrders, error: orderCheckError } = await supabase
      .from("orders")
      .select("id, order_status")
      .eq("address_id", addressId);

    if (orderCheckError) {
      showNotification("Unable to check orders. Try again.", "error");
      return;
    }

    if (linkedOrders && linkedOrders.length > 0) {
      const activeStatuses = ["Pending", "In Progress", "Out for Delivery", "Ready for Pickup"];
      const hasActive = linkedOrders.some(order => activeStatuses.includes(order.order_status));

      if (hasActive) {
        showNotification("Cannot delete this address. It is linked to an active order.", "error");
        return;
      }

      // Soft delete for historical orders
      const { error: softDeleteError } = await supabase
        .from("addresses")
        .update({ is_active: false })
        .eq("id", addressId)
        .eq("customer_id", user.id);

      if (!softDeleteError) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
        showNotification("Address removed successfully.", "success");
      } else {
        showNotification("Failed to remove address.", "error");
      }

    } else {
      // Hard delete
      const { error: hardDeleteError } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addressId)
        .eq("customer_id", user.id);

      if (!hardDeleteError) {
        setAddresses(addresses.filter(addr => addr.id !== addressId));
        showNotification("Address deleted successfully.", "success");
      } else {
        showNotification("Failed to delete address.", "error");
      }
    }
  };

  const handleDeleteAddress = (addressId) => {
    setConfirmDialog({
      title: "Delete Address",
      message: "Are you sure you want to remove this address? This action cannot be undone.",
      onConfirm: () => executeDeleteAddress(addressId)
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    // UPDATE ACCOUNT INFO
    if (activeTab === "account") {
      const { error } = await supabase
        .from("customers")
        .update({ 
          first_name: firstName, 
          last_name: lastName,
        })
        .eq("id", user.id);

      setLoading(false);
      if (!error) {
        showNotification("Account info updated successfully!", "success");
      } else {
        showNotification("Failed to update profile.", "error");
      }
    }

    // UPDATE PASSWORD
    if (activeTab === "security") {
      if (newPassword !== confirmNewPassword) {
        showNotification("New passwords do not match.", "error");
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        showNotification("Password must be at least 6 characters.", "error");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      setLoading(false);
      if (!error) {
        showNotification("Password updated successfully!", "success");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        showNotification(error.message, "error");
      }
    }

    // ADD OR EDIT ADDRESS
    if (activeTab === "addresses") {
      if (editingAddressId) {
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

        if (!error) showNotification("Address updated successfully!", "success");
        else showNotification("Failed to update address.", "error");

        setEditingAddressId(null);
        setShowAddAddressForm(false);
      } else {
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
          
        if (!error) showNotification("Address added successfully!", "success");
        else showNotification("Failed to add address.", "error");
      }

      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setAddresses(data);

      setAddressName(""); setBuildingNo(""); setStreet(""); setCity(""); setZipCode(""); setProvince("");
      setShowAddAddressForm(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#abddfc] p-4 md:p-10 font-sans">
      
      {/* CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-[#5a98bd]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-4xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center gap-4 border-2 border-[#e1f0fa] animate-in zoom-in-95 duration-200">
            <div className="bg-rose-50 text-rose-400 p-4 rounded-full mb-2">
              <AlertTriangle size={36} strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-[#74abcf] uppercase tracking-tighter">{confirmDialog.title}</h3>
            <p className="text-[#5a98bd] font-medium text-sm leading-relaxed">{confirmDialog.message}</p>
            <div className="flex w-full gap-3 mt-4">
              <button 
                onClick={() => setConfirmDialog(null)} 
                className="flex-1 bg-white border-2 border-[#e1f0fa] hover:bg-[#f4faff] text-[#97d5fc] px-4 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95"
              >
                Cancel
              </button>
              <button 
                onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} 
                className="flex-1 bg-rose-400 hover:bg-rose-500 text-white px-4 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-5xl min-h-150 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-2 border-[#e1f0fa]">

        {/* LEFT SIDEBAR */}
        <div className="flex w-full md:w-2/5 flex-col items-center justify-start bg-[#f4faff] p-8 md:p-10 border-r-2 border-[#e1f0fa]">
          
          <div className="w-24 h-24 md:w-32 md:h-32 bg-[#97d5fc] rounded-4xl flex items-center justify-center text-white shadow-inner mb-6 transform rotate-3 transition-transform hover:rotate-0">
            <User size={50} strokeWidth={2} />
          </div>

          <h3 className="text-[#74abcf] text-2xl font-black uppercase tracking-tighter mb-2 text-center">
            {firstName}'s Profile
          </h3>
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
              onClick={() => { setActiveTab("security"); setShowAddAddressForm(false); setEditingAddressId(null); }}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${
                activeTab === "security" ? "bg-[#74abcf] text-white shadow-md scale-105" : "bg-white text-[#97d5fc] hover:text-[#74abcf] hover:bg-[#e1f0fa] border-2 border-[#e1f0fa]"
              }`}
            >
              <Lock size={18} strokeWidth={2.5} /> Security
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

          <form onSubmit={handleUpdate} className="flex-1 flex flex-col justify-center mt-12 md:mt-4">

            {/* NOTIFICATION BANNER */}
            {notification && (
              <div className={`mb-6 p-4 rounded-2xl border-2 flex items-center gap-3 text-sm font-bold animate-in slide-in-from-top-2 fade-in ${
                notification.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-rose-50 border-rose-200 text-rose-500"
              }`}>
                {notification.type === "success" ? <CheckCircle size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
                <p>{notification.message}</p>
              </div>
            )}

            {/* ================= ACCOUNT INFO TAB ================= */}
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
                      <input 
                        type="text" 
                        value={firstName} 
                        onChange={(e) => setFirstName(e.target.value)} 
                        className="w-full px-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm" 
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Last Name</label>
                      <input 
                        type="text" 
                        value={lastName} 
                        onChange={(e) => setLastName(e.target.value)} 
                        className="w-full px-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm" 
                        required
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-8 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] disabled:active:scale-100 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95">
                  <Save size={18} strokeWidth={2.5} />
                  {loading ? "Saving Changes..." : "Update Information"}
                </button>
              </div>
            )}

            {/* ================= SECURITY TAB ================= */}
            {activeTab === "security" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-3xl font-black text-[#74abcf] uppercase tracking-tighter mb-8">Security</h2>
                
                <div className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">New Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={18} strokeWidth={2.5} />
                      <input 
                        type="password" 
                        placeholder="Enter new password"
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm placeholder:text-[#b8dcf2] placeholder:font-medium" 
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={18} strokeWidth={2.5} />
                      <input 
                        type="password" 
                        placeholder="Re-enter new password"
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                        className="w-full pl-12 pr-4 py-3 border-2 border-[#e1f0fa] rounded-2xl text-[#5a98bd] font-bold outline-none focus:border-[#abddfc] focus:bg-[#f4faff] transition-colors shadow-sm placeholder:text-[#b8dcf2] placeholder:font-medium" 
                        required
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 mt-8 bg-[#74abcf] hover:bg-[#5a98bd] disabled:bg-[#e1f0fa] disabled:active:scale-100 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95">
                  <Save size={18} strokeWidth={2.5} />
                  {loading ? "Updating..." : "Change Password"}
                </button>
              </div>
            )}

            {/* ================= ADDRESSES TAB ================= */}
            {activeTab === "addresses" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">

                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-3xl font-black text-[#74abcf] uppercase tracking-tighter leading-none">Saved Addresses</h2>
                  
                  {!showAddAddressForm && editingAddressId === null && (
                    <button
                      type="button"
                      onClick={() => setShowAddAddressForm(true)}
                      className="flex items-center gap-1 bg-white border-2 border-[#abddfc] hover:bg-[#f4faff] text-[#74abcf] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={16} strokeWidth={3} /> Add New
                    </button>
                  )}
                </div>

                {/* Saved Addresses List */}
                {addresses.length > 0 && !showAddAddressForm && editingAddressId === null && (
                  <div className="space-y-4 mb-6">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="bg-[#f4faff] border-2 border-[#e1f0fa] hover:border-[#abddfc] rounded-2xl p-5 flex justify-between items-start transition-colors group"
                      >
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
                          <button
                            type="button"
                            onClick={() => {
                              setAddressName(addr.name);
                              setBuildingNo(addr.building_no);
                              setStreet(addr.street);
                              setCity(addr.city);
                              setZipCode(addr.zip_code || "");
                              setProvince(addr.province);
                              setEditingAddressId(addr.id);
                              setShowAddAddressForm(true);
                            }}
                            className="bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] text-[#74abcf] p-2 rounded-xl transition-all shadow-sm active:scale-90"
                            title="Edit Address"
                          >
                            <Edit2 size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="bg-white border-2 border-rose-100 hover:border-rose-300 text-rose-400 p-2 rounded-xl transition-all shadow-sm active:scale-90"
                            title="Delete Address"
                          >
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
                    <h3 className="text-[#74abcf] font-black uppercase tracking-widest text-sm mb-2">
                      {editingAddressId ? "Edit Address" : "New Address Details"}
                    </h3>
                    
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
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] text-white px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95"
                      >
                        <Save size={16} strokeWidth={3} />
                        {loading ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddAddressForm(false);
                          setEditingAddressId(null);
                          setAddressName("");
                          setBuildingNo("");
                          setStreet("");
                          setCity("");
                          setZipCode("");
                          setProvince("");
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border-2 border-[#e1f0fa] hover:bg-gray-50 text-gray-400 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95"
                      >
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