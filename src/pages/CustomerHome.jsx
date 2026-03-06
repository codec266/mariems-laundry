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
        return
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
    <div className="min-h-screen flex items-center justify-center bg-[#abddfc] p-4 md:p-10">
      <div className="bg-white w-full max-w-6xl min-h-150 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row border-4 border-white">
        
        {/* left */}
        <div className="flex w-full md:w-1/2 items-center justify-center p-6">
          <div className="max-w-62.5 md:max-w-xl w-full">
            <img 
              src={logo} 
              alt="Mariem's Laundry Logo" 
              className="w-full h-auto object-contain drop-shadow-sm"
            />
          </div>
        </div>

        {/* right */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8 bg-white">
          <div className="max-w-md w-full text-center md:text-left">
            <header className="mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#74abcf] uppercase tracking-tighter leading-tight">
                Welcome to <br />
                <span className="text-[#74abcf]">Mariem's Laundry!</span>
              </h2>
              <p className="text-[#74abcf] mt-2 font-medium">
                We're here to make your laundry day easy and worry-free.
              </p>
            </header>

            {/* action grid */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              <button 
                onClick={() => navigate("/profile")}
                className="flex flex-col items-center justify-center aspect-square bg-[#97d5fc] hover:bg-[#74abcf] transition-colors rounded-xl p-4 text-white group">
                
                <User size={40} strokeWidth={2} className="mb-2" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Profile</span>
              </button>

              <button 
                onClick={() => navigate("/orders")}
                className="flex flex-col items-center justify-center aspect-square bg-[#97d5fc] hover:bg-[#74abcf] transition-colors rounded-xl p-4 text-white group">
                
                <PlusCircle size={40} strokeWidth={2} className="mb-2" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-center leading-tight">Place Order</span>
              </button>

              <button className="flex flex-col items-center justify-center aspect-square bg-[#97d5fc] hover:bg-[#74abcf] transition-colors rounded-xl p-4 text-white group">
                <ShoppingCart size={40} strokeWidth={2} className="mb-2" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Orders</span>
              </button>
            </div>

            {/* logout */}
            <div className="flex justify-center md:justify-end">
              <button onClick={handleLogout} className="flex items-center gap-2 bg-[#74abcf] hover:bg-[#97d5fc] text-white px-6 py-3 rounded-lg font-bold transition-all">
                <LogOut size={20} />Logout</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}