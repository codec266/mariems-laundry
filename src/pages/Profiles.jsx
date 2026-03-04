import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { User, ArrowLeft, Save, Mail, MapPin, ShieldCheck, Trash2, Edit2 } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");

  // account info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
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

      const { data: addressData } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (addressData) setAddresses(addressData);

      const { data } = await supabase
        .from("customers")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFirstName(data.first_name);
        setLastName(data.last_name);
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleDeleteAddress = async (addressId) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("customer_id", user.id);

    if (!error) {
      setAddresses(addresses.filter(addr => addr.id !== addressId));
    } else {
      console.log("Delete error:", error.message);
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
        .update({ first_name: firstName, last_name: lastName })
        .eq("id", user.id);

      setLoading(false);
      if (!error) alert("Account info updated!");
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
            province: province
          })
          .eq("id", editingAddressId)
          .eq("customer_id", user.id);

        if (!error) alert("Address updated!");
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
            province: province
          }]);
        if (!error) alert("Address added!");
      }

      // refresh addresses
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("customer_id", user.id)
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
      <div className="bg-white w-full max-w-5xl min-h-150 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-4 border-white">

        {/* left side */}
        <div className="flex w-full md:w-2/5 flex-col items-center justify-start bg-[#f0f9ff] p-10">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-[#97d5fc] rounded-full flex items-center justify-center text-white shadow-inner mb-6">
            <User size={50} strokeWidth={1.5} />
          </div>

          <h3 className="text-[#74abcf] text-xl font-black uppercase tracking-tighter mb-8 text-center">
            {firstName}'s Profile
          </h3>

          {/* Tabs */}
          <div className="w-full space-y-3">
            <button 
              onClick={() => setActiveTab("account")}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === "account" ? "bg-[#74abcf] text-white shadow-md" : "text-[#74abcf] hover:bg-white"}`}
            >
              <ShieldCheck size={18} /> Account Info
            </button>
            <button 
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold uppercase text-xs tracking-widest transition-all ${activeTab === "addresses" ? "bg-[#74abcf] text-white shadow-md" : "text-[#74abcf] hover:bg-white"}`}
            >
              <MapPin size={18} /> Address
            </button>
          </div>
        </div>

        {/* right side */}
        <div className="w-full md:w-3/5 flex flex-col justify-center p-8 md:p-16 bg-white">
          <button 
            type="button"
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-[#74abcf] font-bold mb-8 hover:translate-x-[-4px] transition-transform text-sm"
          > 
            <ArrowLeft size={18} /> Back to Dashboard
          </button>

          <form onSubmit={handleUpdate} className="space-y-6">

            {/* Account Info */}
            {activeTab === "account" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-black text-[#74abcf] uppercase mb-6">Account Info</h2>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#abddfc]" size={16} />
                      <input type="text" value={email} disabled className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-400 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">First Name</label>
                      <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl outline-none focus:ring-4 focus:ring-[#abddfc]/20" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[#74abcf] text-[10px] font-black uppercase tracking-widest ml-1">Last Name</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl outline-none focus:ring-4 focus:ring-[#abddfc]/20" />
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 mt-6 bg-[#74abcf] hover:bg-[#5a98bd] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95"
                >
                  <Save size={18} />
                  {loading ? "Saving..." : "Update Info"}
                </button>
              </div>
            )}

            {/* Address Info */}
            {activeTab === "addresses" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">

                <h2 className="text-2xl font-black text-[#74abcf] uppercase mb-4">Saved Addresses</h2>

                {/* Saved Addresses */}
                {addresses.length > 0 && !showAddAddressForm && editingAddressId === null && (
                  <div className="space-y-3 mb-6">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="border-2 border-[#abddfc] rounded-2xl p-4 text-sm flex justify-between items-start"
                      >
                        <div>
                          <p className="font-bold">{addr.name}</p>
                          <p>{addr.building_no}, {addr.street}</p>
                          <p>{addr.city}, {addr.province} {addr.zip_code}</p>
                        </div>
                        <div className="flex gap-2">
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
                            className="text-blue-500 hover:text-blue-700"
                            title="Edit Address"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete Address"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Address Button */}
                {!showAddAddressForm && editingAddressId === null && (
                  <button
                    type="button"
                    onClick={() => setShowAddAddressForm(true)}
                    className="flex items-center gap-2 mb-4 bg-[#74abcf] hover:bg-[#5a98bd] text-white px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-widest"
                  >
                    <MapPin size={16} /> Add Address
                  </button>
                )}

                {/* No Addresses */}
                {addresses.length === 0 && !showAddAddressForm && editingAddressId === null && (
                  <p className="text-sm text-gray-400 mb-4">No addresses added yet.</p>
                )}

                {/* Add/Edit Form */}
                {(showAddAddressForm || editingAddressId !== null) && (
                  <div className="space-y-4 border-2 border-[#abddfc] rounded-2xl p-4">
                    <input
                      type="text"
                      placeholder="Address Name (e.g., Home, Office)"
                      value={addressName}
                      onChange={(e) => setAddressName(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Building / Unit No."
                      value={buildingNo}
                      onChange={(e) => setBuildingNo(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                      required
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                      required
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code (optional)"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[#abddfc] rounded-2xl"
                    />

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-[#74abcf] hover:bg-[#5a98bd] text-white px-6 py-2 rounded-2xl font-black uppercase text-xs tracking-widest"
                      >
                        <Save size={18} />
                        {loading ? "Saving..." : editingAddressId ? "Update Address" : "Add Address"}
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
                        className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white px-6 py-2 rounded-2xl font-black uppercase text-xs tracking-widest"
                      >
                        Cancel
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