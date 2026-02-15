import { useLocation } from 'react-router-dom';
import { useEffect, useCallback } from 'react';
import AuthService from './AuthService';


const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (e) {
        return null;
    }
}

const AuthVerify = () => {
    let location = useLocation();

    const logOut = useCallback(() => {
        AuthService.logout();
        // Use window.location to force full page reload and clear state
        window.location.href = '/login';
    }, []);

    useEffect(() => {
        const userJson = localStorage.getItem("vttless-user");
        
        if (userJson) {
            const user = JSON.parse(userJson);
            
            // Check if accessToken exists before trying to parse it
            if (user && user.accessToken) {
                const decodedJwt = parseJwt(user.accessToken);

                // Check if JWT is expired
                if (decodedJwt && decodedJwt.exp * 1000 < Date.now()) {
                    logOut();
                }
            }
        }
    }, [location, logOut]);
    
    return null;
};

export default AuthVerify;