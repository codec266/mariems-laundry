import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AuthForm from "./components/AuthForm"
import CustomerHome from "./pages/CustomerHome"
import Profiles from "./pages/Profiles"
import Orders from "./pages/Orders"
import PlaceOrder from "./pages/PlaceOrder"
import AdminDashboard from "./pages/AdminDashboard"
import AdminActiveOrders from "./pages/AdminActiveOrders"
import AdminOrderHistory from "./pages/AdminOrderHistory"
import AdminSalesReport from "./pages/AdminSalesReport"

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
        <Route path="/admin-active-orders" element={<AdminActiveOrders />} />
        <Route path="/admin-order-history" element={<AdminOrderHistory />} />
        <Route path="/admin-sales-report" element={<AdminSalesReport />} />
      </Routes>
    </Router>
  )
}