import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/auth-context";

function PrivateRoute({ children }){
    const { authenticated, loading } = useContext(AuthContext)

    if (loading) {
        return <p>Carregando...</p>
    }

    if (!authenticated){
        return <Navigate to="/"/>
    }

    return children
}
export default PrivateRoute