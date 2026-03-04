import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import AuthForm from "./components/AuthForm"
import CustomerHome from "./pages/CustomerHome"
import Profiles from "./pages/Profiles"

export default function App() {
  return(
    <Router>
      <Routes>
        <Route path ="/" element={<AuthForm />} />
        <Route path ="/home" element={(<CustomerHome />)} />
        <Route path ="/profile" element={(<Profiles />)} />
      </Routes>
    </Router>
  )
}