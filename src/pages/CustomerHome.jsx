import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { User, PlusCircle, ShoppingCart, LogOut } from "lucide-react"; 
import logo from "../assets/logo.png";

export default function CustomerHome() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("first_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setFirstName(data.first_name);
      }
    };
    getUserData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#abddfc] p-4 md:p-8 font-sans">
      
      <div className="bg-white w-full max-w-5xl min-h-150 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-2 border-[#e1f0fa]">
        
        {/* LEFT PANEL: Branding */}
        <div className="w-full md:w-2/5 bg-[#f4faff] border-b-2 md:border-b-0 md:border-r-2 border-[#e1f0fa] flex flex-col items-center justify-center p-10 md:p-12">
          <img 
            src={logo} 
            alt="Mariem's Laundry Logo" 
            className="w-48 md:w-64 h-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* RIGHT PANEL: Content & Actions */}
        <div className="w-full md:w-3/5 p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          
          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-black text-[#74abcf] uppercase tracking-tighter mb-3 leading-none">
              Welcome back{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-[#5a98bd] font-medium text-sm md:text-base">
              We're here to make your laundry day easy and worry-free. What would you like to do today?
            </p>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 md:mb-12">
            
            {/* Profile Button */}
            <button 
              onClick={() => navigate("/profile")}
              className="bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] hover:bg-[#f9fcff] rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-95 group"
            >
              <div className="bg-[#f4faff] p-3 rounded-2xl group-hover:bg-[#abddfc] transition-colors">
                <User size={32} strokeWidth={2.5} className="text-[#74abcf] group-hover:text-white transition-colors" />
              </div>
              <span className="font-black text-[#5a98bd] group-hover:text-[#74abcf] text-[11px] uppercase tracking-widest text-center transition-colors">Profile</span>
            </button>

            {/* Place Order Button (Primary Emphasis) */}
            <button 
              onClick={() => navigate("/place-order")}
              className="bg-[#97d5fc] hover:bg-[#74abcf] border-2 border-[#97d5fc] hover:border-[#74abcf] rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg active:scale-95 group"
            >
              <div className="bg-white/20 p-3 rounded-2xl">
                <PlusCircle size={32} strokeWidth={2.5} className="text-white" />
              </div>
              <span className="font-black text-white text-[11px] uppercase tracking-widest text-center leading-tight">Place Order</span>
            </button>

            {/* Orders Button */}
            <button 
              onClick={() => navigate("/orders")}
              className="bg-white border-2 border-[#e1f0fa] hover:border-[#abddfc] hover:bg-[#f9fcff] rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-95 group"
            >
              <div className="bg-[#f4faff] p-3 rounded-2xl group-hover:bg-[#abddfc] transition-colors">
                <ShoppingCart size={32} strokeWidth={2.5} className="text-[#74abcf] group-hover:text-white transition-colors" />
              </div>
              <span className="font-black text-[#5a98bd] group-hover:text-[#74abcf] text-[11px] uppercase tracking-widest text-center transition-colors">Orders</span>
            </button>

          </div>

          {/* Logout */}
          <div className="mt-auto md:mt-0 flex justify-center md:justify-end">
            <button 
              onClick={handleLogout} 
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-white border-2 border-rose-100 hover:bg-rose-50 text-rose-400 px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-sm active:scale-95"
            >
              <LogOut size={18} strokeWidth={3} /> Logout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}