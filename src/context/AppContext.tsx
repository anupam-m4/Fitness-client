import { createContext, useContext, useEffect, useState } from "react";
import { initialState, type ActivityEntry, type Credentials, type FoodEntry, type User } from "../types";
import { useNavigate } from "react-router-dom";
import api from "../configs/api";
import toast from "react-hot-toast";

const AppContext = createContext(initialState);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>(null);
  const [isUserFetched, setIsUserFetched] = useState(localStorage.getItem('token') ? false : true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [allFoodLogs, setAllFoodLogs] = useState<FoodEntry[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityEntry[]>([]);

  // Helper to set auth header
  const setAuthToken = (token: string) => {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const signup = async (credentials: Credentials) => {
    try {
      const { data } = await api.post('/api/auth/local/register', credentials);
      const token = data.jwt;
      setUser({ ...data.user, token });
      localStorage.setItem('token', token);
      setAuthToken(token);
      if (data?.user?.age && data?.user?.weight && data?.user?.goal) {
        setOnboardingCompleted(true);
      }
      // After signup, fetch logs (though new user may have none)
      await fetchFoodLogs();
      await fetchActivityLogs();
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const login = async (credentials: Credentials) => {
    try {
      const { data } = await api.post('/api/auth/local', { identifier: credentials.email, password: credentials.password });
      const token = data.jwt;
      setUser({ ...data.user, token });
      localStorage.setItem('token', token);
      setAuthToken(token);
      if (data?.user?.age && data?.user?.weight && data?.user?.goal) {
        setOnboardingCompleted(true);
      }
      // After login, fetch logs
      await fetchFoodLogs();
      await fetchActivityLogs();
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const fetchUser = async (token: string) => {
    try {
      const { data } = await api.get('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      setUser({ ...data, token });
      if (data?.age && data?.weight && data?.goal) {
        setOnboardingCompleted(true);
      }
      setAuthToken(token);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
    setIsUserFetched(true);
  };

  const fetchFoodLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await api.get('/api/food-logs', { headers: { Authorization: `Bearer ${token}` } });
      setAllFoodLogs(data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const fetchActivityLogs = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await api.get('/api/activity-logs', { headers: { Authorization: `Bearer ${token}` } });
      setAllActivityLogs(data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.error?.message || error?.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setOnboardingCompleted(false);
    setAllActivityLogs([]);
    setAllFoodLogs([]);
    api.defaults.headers.common['Authorization'] = '';
    navigate('/');
  };

  // Initial fetch if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      (async () => {
        await fetchUser(token);
        await fetchFoodLogs();
        await fetchActivityLogs();
      })();
    }
  }, []);

  const value = {
    user, setUser, isUserFetched, fetchUser,
    signup, login, logout,
    onboardingCompleted, setOnboardingCompleted,
    allFoodLogs, allActivityLogs,
    setAllFoodLogs, setAllActivityLogs,
    fetchFoodLogs, fetchActivityLogs,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);