import { Routes, Route } from 'react-router-dom'
import Categories from '../pages/Categories'
import Dashboard from '../pages/Dashboard'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Expenses from '../pages/Expenses'
import Family from '../pages/Family'
import PrivateRoute from './PrivateRoute'

function AppRoutes(){
    return(
        <Routes>
            <Route path='/' element= {
                <Login />
            }/> 
            <Route path='/register' element={
                <Register />
            }/>
            <Route path='/dashboard' element= {
               <PrivateRoute>
                   <Dashboard />
               </PrivateRoute>
            }/> 
            <Route path='/categories' element= {
               <PrivateRoute>
                   <Categories />
               </PrivateRoute>
            }/> 
            <Route path='/expenses' element= {
               <PrivateRoute>
                   <Expenses />
               </PrivateRoute>
            }/>
            <Route path='/family' element= {
               <PrivateRoute>
                   <Family />
               </PrivateRoute>
            }/>
        </Routes>
    )
}

export default AppRoutes