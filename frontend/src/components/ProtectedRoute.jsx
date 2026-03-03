import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from './Header';

export default function ProtectedRoute({ children, roles }) {
    const { user, isLoggedIn } = useAuth();
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return (
        <div className="pt-14"> {/* Add padding top so children don't hide behind fixed header */}
            <Header />
            {children}
        </div>
    );
}
