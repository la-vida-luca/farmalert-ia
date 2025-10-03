import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type ApiSuccess = { success?: boolean; token?: string };

function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      console.log('[Auth] submit', { isLogin, email, endpoint, API_URL });
      const response = await axios.post<ApiSuccess>(`${API_URL}${endpoint}`, { email, password });
      console.log('[Auth] response', response?.status, response?.data);

      if (isLogin) {
        if (response?.data?.token) {
          localStorage.setItem('token', response.data.token as string);
          setIsAuthenticated(true);
          setMessage('Connexion réussie.');
        } else {
