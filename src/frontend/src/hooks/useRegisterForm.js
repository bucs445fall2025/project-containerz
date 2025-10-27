import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useRegisterForm() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await signUp(formState);
      login(response.token, response.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    user,
    loading,
    formState,
    submitting,
    error,
    handleChange,
    handleSubmit
  };
}
