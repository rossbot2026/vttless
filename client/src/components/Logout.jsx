import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../providers/AuthProvider';
import AuthService from '../providers/AuthService';

const Logout = () => {
    const navigate = useNavigate();
    const {setUser} = useAuth();

    useEffect(() => {
        AuthService.logout();
        setUser(null);
        navigate('/login');
    }, [navigate, setUser]);

    return <div>Logging out...</div>;
}

export default Logout;