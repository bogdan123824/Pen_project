import React, { useState, useEffect } from 'react';
import { Pen, AuthState } from './types';
import { PenCard } from './components/PenCard';
import { SearchBar } from './components/SearchBar';
import { AuthForms } from './components/AuthForms';
import { PenForm } from './components/PenForm';
import { Pen as PenIcon, Plus, LogOut } from 'lucide-react';

function App() {
  const [pens, setPens] = useState<Pen[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [showPenForm, setShowPenForm] = useState(false);
  const [editingPen, setEditingPen] = useState<Pen | null>(null);

  useEffect(() => {
    fetchPens();
  }, [search]);

  const fetchPens = async () => {
    try {
      const url = search
        ? `http://localhost:8000/search_pen_by_name?name=${encodeURIComponent(search)}`
        : 'http://localhost:8000/all_pens/';
      
      const response = await fetch(url);
      const data = await response.json();
      setPens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pens:', error);
      setPens([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (wallet: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('wallet_address', wallet);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/login_seller', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      setAuth({
        user: { id: data.seller_id, wallet_address: wallet, role: 'seller' },
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  const handleRegister = async (wallet: string, password: string) => {
    try {
      const formData = new FormData();
      formData.append('wallet_address', wallet);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/register_seller', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Registration failed');

      const data = await response.json();
      setAuth({
        user: { id: data.seller_id, wallet_address: wallet, role: 'seller' },
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Registration error:', error);
      alert('Registration failed. Please try again.');
    }
  };

  const handleCreatePen = async (formData: FormData) => {
    try {
      if (!auth.user) return;
      formData.append('seller_id', auth.user.id.toString());

      const response = await fetch('http://localhost:8000/add_pen', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to create pen');

      fetchPens();
      setShowPenForm(false);
    } catch (error) {
      console.error('Error creating pen:', error);
      alert('Failed to create pen. Please try again.');
    }
  };

  const handleUpdatePen = async (formData: FormData) => {
    try {
      if (!editingPen) return;

      const response = await fetch(`http://localhost:8000/edit_pen/${editingPen.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to update pen');

      fetchPens();
      setEditingPen(null);
    } catch (error) {
      console.error('Error updating pen:', error);
      alert('Failed to update pen. Please try again.');
    }
  };

  const handleDeletePen = async (penId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/delete_pen/${penId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete pen');

      fetchPens();
    } catch (error) {
      console.error('Error deleting pen:', error);
      alert('Failed to delete pen. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PenIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Pen Market</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-96">
                <SearchBar value={search} onChange={setSearch} />
              </div>
              {auth.isAuthenticated && (
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowPenForm(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Pen</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!auth.isAuthenticated ? (
          <AuthForms onLogin={handleLogin} onRegister={handleRegister} />
        ) : showPenForm || editingPen ? (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">
              {editingPen ? 'Edit Pen' : 'Add New Pen'}
            </h2>
            <PenForm
              pen={editingPen || undefined}
              onSubmit={editingPen ? handleUpdatePen : handleCreatePen}
              onCancel={() => {
                setShowPenForm(false);
                setEditingPen(null);
              }}
            />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : pens.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pens.map((pen) => (
              <PenCard
                key={pen.id}
                pen={pen}
                isOwner={auth.user?.id === pen.seller_id}
                onEdit={setEditingPen}
                onDelete={handleDeletePen}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <PenIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pens found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try again later for new listings
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
