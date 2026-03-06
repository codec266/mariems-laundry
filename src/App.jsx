import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AuthForm from "./components/AuthForm"
import CustomerHome from "./pages/CustomerHome"
import Profiles from "./pages/Profiles"
import Orders from "./pages/Orders"
import PlaceOrder from "./pages/PlaceOrder"
import AdminDashboard from "./pages/AdminDashboard"

export default function App() {
  return(
    <Router>
      <Routes>
        <Route path ="/" element={<AuthForm />} />
        <Route path ="/home" element={(<CustomerHome />)} />
        <Route path ="/admin" element={<AdminDashboard />} />
        <Route path ="/profile" element={(<Profiles />)} />
        <Route path ="/orders" element={(<Orders />)}/>
        <Route path ="/place-order" element={<PlaceOrder />} />
      </Routes>
    </Router>
  )
}