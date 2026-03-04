import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import { useNavigate } from "react-router-dom"
import auth_bg from "../assets/auth_bg.png"
import logo from "../assets/logo.png"

export default function AuthForm() {
  const [email, setEmail] = useState("") 
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [mode, setMode] = useState("login")
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (mode === "register" && password != confirmPassword) {
      setMessage("Passwords do not match!")
      setMessageType("error")
      return
    }

    if (mode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage(error.message)
        setMessageType("error")
        return 
      }
      setMessage("Logged in successfully!")
      setMessageType("success")
      navigate("/home")
    } 
    
    else {
      const { data:authData, error:authError } = await supabase.auth.signUp({ email, password })
      if (authError) { 
        setMessage(authError.message)
        setMessageType("error")
        return }


    // debugging
    console.log("USER:", authData.user) 
    console.log("SESSION:", authData.session)
    const userId = authData.user.id


    // insert to profiles table
    const { error:profileError } = await supabase.from("profiles").insert([{ id: userId, email}])
    if (profileError) {
      setMessage(profileError.message)
      setMessageType("error")
      return
    }

    // insert to customers table
    const { error:customerError } = await supabase.from("customers").insert([
      {
        id: userId,
        first_name: firstName,
        last_name: lastName,
      }
    ])

    if (customerError) {
      setMessage(customerError.message)
      setMessageType("error")
      return
    }
    setMessage("Registration successful!")
    setMessageType("success")
    navigate("/home")

    //clears the form
    setEmail(""); 
    setPassword(""); 
    setConfirmPassword(""); 
    setFirstName(""); 
    setLastName("");
  }
}
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"style={{ backgroundImage: `url(${auth_bg})` }}>
      <div className="relative w-full max-w-sm p-6 bg-gray-50 rounded-2xl shadow2xl">
        <div className="absolute -top-15 right-0 w-38 h-38 md:-top-18 md:right-3 md:w-40 md:h-40">
          <img src={logo} alt="Logo" className="w-full h-auto object-contain"/>
        </div>
        <h2 className="text-left uppercase text-[#74abcf] text-xl font-bold mb-6 tracking-tighter">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
            required
          />

          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
                required
              />
              <input 
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
                required
              />
            </>
          )}

          {mode ==="login" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-2 text-[#93b5cc] border-[#74abcf] rounded"
              required
            />
          )}
          
          <button type="submit" className="w-full bg-[#74abcf] text-white p-2 rounded">
            {mode === "login" ? "Login" : "Register"}
          </button>
        </form>

        <p className="mt-3 text-center text-sm text-[#93b5cc]">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Register Now" : "Login"}
          </button>
        </p>

        {message && (
          <p className={`mt-2 text-center ${messageType === "success" ? "text-green-600" : "text-red-500"}`}>{message}</p>)}
      </div>
    </div>
  )
}