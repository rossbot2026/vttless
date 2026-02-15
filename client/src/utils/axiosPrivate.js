// client/src/utils/axiosPrivate.js
import axios from 'axios';

const axiosPrivate = axios.create();

axiosPrivate.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('vttless-user'));
        if (user && user.token) {
            config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default axiosPrivate;