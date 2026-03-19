import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import AppRoutes from './routes';
import { setUser, setInitialized } from './store/slices/authSlice';
import api from './services/api';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.get('/auth/me')
        .then(response => {
          dispatch(setUser(response.data));
        })
        .catch(err => {
          console.error('Failed to restore user:', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          dispatch(setInitialized());
        });
    } else {
      dispatch(setInitialized());
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
