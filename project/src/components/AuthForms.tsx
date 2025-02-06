import React, { useState } from 'react';

interface AuthFormsProps {
  onLogin: (wallet: string, password: string) => Promise<void>;
  onRegister: (wallet: string, password: string) => Promise<void>;
}

export function AuthForms({ onLogin, onRegister }: AuthFormsProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [wallet, setWallet] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await onLogin(wallet, password);
      } else {
        await onRegister(wallet, password);
      }
      setWallet('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Login' : 'Registration'} 
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="wallet" className="block text-sm font-medium text-gray-700">
            Wallet Address
          </label>
          <input
            type="text"
            id="wallet"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      <button
        onClick={() => setIsLogin(!isLogin)}
        className="mt-4 w-full text-sm text-blue-600 hover:text-blue-800"
      >
        {isLogin ? 'Need an account? Registration' : 'Already have an account? Login'}
      </button>
    </div>
  );
}