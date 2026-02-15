// Respond to 401 Unauthorized error globally to redirect to login page if user is unauthorized.
import axios from 'axios';

// Set default parameters for axios operation.
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_BASE_URL;
axios.defaults.headers = {'Content-Type': 'application/json'};
axios.defaults.withCredentials = true;

export const api = axios.create({
    
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use((config) => {
    const user = JSON.parse(localStorage.getItem("vttless-user"));
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((res) => {
    // if there was no error, then just return the response.
    return Promise.resolve(res);
}, (error) => {
    // Handle 401 unauthorized errors
    if (error.response && error.response.status === 401) {
        localStorage.removeItem("vttless-user");
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
