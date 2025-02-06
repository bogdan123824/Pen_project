import { useState } from 'react';
import Web3 from 'web3';
import { Pen } from '../types';
import { Pen as PenIcon, Edit, Trash2, X, CheckCircle, AlertTriangle } from 'lucide-react';

interface PenCardProps {
  pen: Pen;
  isOwner?: boolean;
  onEdit?: (pen: Pen) => void;
  onDelete?: (penId: number) => void;
}

export function PenCard({ pen, isOwner, onEdit, onDelete }: PenCardProps) {
  const [isBuying, setIsBuying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false); 
  const [walletAddress, setWalletAddress] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000); 
  };

  const buyPen = async () => {
    if (!walletAddress) {
      showNotification('Please enter your wallet address!', 'error');
      return;
    }

    try {
      const web3 = new Web3('http://127.0.0.1:7545');
      const accounts = await web3.eth.getAccounts();
      const recipient = accounts[0];

      const amountInWei = web3.utils.toWei(pen.price.toString(), 'ether');

      const balanceWei = await web3.eth.getBalance(walletAddress);
      if (BigInt(balanceWei) < BigInt(amountInWei)) {
        showNotification('Insufficient balance!', 'error');
        return;
      }

      setIsBuying(true);
      await web3.eth.sendTransaction({
        from: walletAddress,
        to: recipient,
        value: amountInWei,
        gas: 21000,
      });

      showNotification('Transaction successful!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Transaction failed:', error);
      showNotification('Transaction failed!', 'error');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
        <div className="aspect-square relative" onClick={() => setIsDetailsModalOpen(true)}>
          {pen.image ? (
            <img
              src={`http://localhost:8000/static/${pen.image}`}
              alt={pen.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <PenIcon className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {pen.price} ETH
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{pen.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">{pen.description}</p>
          <div className="flex justify-between items-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Buy
            </button>
            {isOwner && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit?.(pen)}
                  className="p-2 text-gray-600 hover:text-blue-600"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete?.(pen.id)}
                  className="p-2 text-gray-600 hover:text-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDetailsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative z-50">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setIsDetailsModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">{pen.name}</h2>
            {pen.image && (
              <div className="w-full h-64 mb-4 overflow-hidden">
                <img
                  src={`http://localhost:8000/static/${pen.image}`}
                  alt={pen.name}
                  className="w-full h-full object-contain"  
                />
              </div>
            )}
            <p className="text-gray-600 mb-4">{pen.description}</p>
            <p className="text-gray-600 mb-4">Price: {pen.price} ETH</p>
            <div className="flex justify-between items-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Buy
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative z-50">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold mb-4">Buy Pen</h2>
            <p className="text-gray-600 mb-4">Enter your wallet</p>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full p-2 border rounded-md mb-4"
              placeholder="0xYourWalletAddress"
            />
            <button
              onClick={buyPen}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              disabled={isBuying}
            >
              {isBuying ? 'Processing...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {notification && (
        <div className={`fixed top-5 right-5 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2
          ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}
    </>
  );
}
