import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
    const { user, isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    
    if (roles) {
        const userRole = user.role?.toLowerCase();
        const allowedRoles = roles.map(r => r.toLowerCase());
        if (!allowedRoles.includes(userRole)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }
    
    return <>{children}</>;
}
