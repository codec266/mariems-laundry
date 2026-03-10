import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, UserPlus, Info } from "lucide-react";
import auth_bg from "../assets/auth_bg.png";
import logo from "../assets/logo.png";

export default function AuthForm() {
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mode, setMode] = useState("login");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (mode === "register" && password !== confirmPassword) {
      setMessage("Passwords do not match!");
      setMessageType("error");
      return;
    }

    setMessageType("loading");
    setMessage(mode === "login" ? "Logging in..." : "Creating account...");

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
        setMessageType("error");
        return; 
      }

      // fetch the user's role
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      
      if (profileError) {
        setMessage(profileError.message);
        setMessageType("error");
        return;
      }

      setMessage("Logged in successfully!");
      setMessageType("success");

      // redirect based on role
      if (profileData.role === "admin") navigate("/admin");
      else navigate("/home");

    } else {
      // signup flow
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
      if (authError) { 
        setMessage(authError.message);
        setMessageType("error");
        return;
      }

      const userId = authData.user.id;

      // insert profile with default role = 'customer'
      const { error: profileError } = await supabase.from("profiles").insert([{ id: userId, email, role: "customer" }]);
      if (profileError) {
        setMessage(profileError.message);
        setMessageType("error");
        return;
      }

      // insert customer data
      const { error: customerError } = await supabase.from("customers").insert([
        { id: userId, first_name: firstName, last_name: lastName }
      ]);
      if (customerError) {
        setMessage(customerError.message);
        setMessageType("error");
        return;
      }

      setMessage("Registration successful!");
      setMessageType("success");
      navigate("/home");

      // clear form
      setEmail(""); setPassword(""); setConfirmPassword(""); setFirstName(""); setLastName("");
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 sm:p-8 bg-cover bg-center bg-no-repeat bg-[#abddfc]/30"
      style={{ backgroundImage: `url(${auth_bg})`, backgroundColor: 'rgba(171, 221, 252, 0.4)', backgroundBlendMode: 'overlay' }}
    >
      <div className="relative w-full max-w-md p-8 md:p-10 bg-white rounded-[40px] shadow-2xl border-2 border-[#e1f0fa] mt-16 md:mt-0 animate-in fade-in zoom-in duration-500">
        
        {/* Floating Logo */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 bg-white rounded-4xl shadow-xl border-4 border-[#e1f0fa] flex items-center justify-center p-2 transform rotate-3 hover:rotate-0 transition-transform duration-300">
          <img src={logo} alt="Mariem's Laundry Logo" className="w-full h-auto object-contain drop-shadow-sm" />
        </div>

        <div className="mt-12 mb-8 text-center">
          <h2 className="uppercase text-[#74abcf] text-3xl font-black tracking-tighter">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-[#97d5fc] font-bold text-sm mt-1">
            {mode === "login" ? "Sign in to manage your laundry" : "Join us for easy laundry days"}
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-2xl border-2 flex items-start gap-3 text-sm font-bold animate-in slide-in-from-top-2 ${
            messageType === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-600" : 
            messageType === "loading" ? "bg-[#f4faff] border-[#abddfc] text-[#74abcf]" :
            "bg-rose-50 border-rose-200 text-rose-500"
          }`}>
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} strokeWidth={2.5} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#f4faff] border-2 border-[#e1f0fa] focus:border-[#abddfc] focus:bg-white rounded-2xl text-[#5a98bd] font-bold outline-none transition-colors shadow-sm placeholder:text-[#b8dcf2]"
              required
            />
          </div>

          {/* Register Only: Names */}
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} strokeWidth={2.5} />
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#f4faff] border-2 border-[#e1f0fa] focus:border-[#abddfc] focus:bg-white rounded-2xl text-[#5a98bd] font-bold outline-none transition-colors shadow-sm placeholder:text-[#b8dcf2]"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-4 bg-[#f4faff] border-2 border-[#e1f0fa] focus:border-[#abddfc] focus:bg-white rounded-2xl text-[#5a98bd] font-bold outline-none transition-colors shadow-sm placeholder:text-[#b8dcf2]"
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} strokeWidth={2.5} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[#f4faff] border-2 border-[#e1f0fa] focus:border-[#abddfc] focus:bg-white rounded-2xl text-[#5a98bd] font-bold outline-none transition-colors shadow-sm placeholder:text-[#b8dcf2]"
              required
            />
          </div>

          {/* Register Only: Confirm Password */}
          {mode === "register" && (
            <div className="relative animate-in slide-in-from-top-2">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#97d5fc]" size={20} strokeWidth={2.5} />
              <input 
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-[#f4faff] border-2 border-[#e1f0fa] focus:border-[#abddfc] focus:bg-white rounded-2xl text-[#5a98bd] font-bold outline-none transition-colors shadow-sm placeholder:text-[#b8dcf2]"
                required
              />
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={messageType === "loading"}
            className="w-full flex items-center justify-center gap-2 bg-[#97d5fc] hover:bg-[#74abcf] disabled:bg-[#e1f0fa] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-md active:scale-95 mt-6"
          >
            {mode === "login" ? (
              <><ArrowRight size={20} strokeWidth={3} /> Login</>
            ) : (
              <><UserPlus size={20} strokeWidth={3} /> Register</>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <p className="text-sm font-bold text-[#97d5fc]">
            {mode === "login" ? "Don't have an account yet?" : "Already part of the family?"}{" "}
            <button
              type="button"
              className="text-[#74abcf] hover:text-[#5a98bd] underline underline-offset-4 decoration-2 transition-colors ml-1"
              onClick={toggleMode}
            >
              {mode === "login" ? "Register Now" : "Login Here"}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}