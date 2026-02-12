
import React, { useState, useEffect } from 'react';
import { TransactionRecord } from '../../types';
import { storageService } from '../../services/storage';

const AdminTransactions: React.FC = () => {
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storageService.getTransactions().then(res => {
      setTxs(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 animate-pulse font-black text-slate-300">Loading History...</div>;

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Revenue Log</h3>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{txs.length} successful transactions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
              <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {txs.map(tx => (
              <tr key={tx.razorpay_payment_id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-6 whitespace-nowrap text-xs font-bold text-slate-500">
                  {new Date(tx.created_at || '').toLocaleDateString()}
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <p className="text-xs font-black text-slate-800">{tx.user_email}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap gap-1">
                    {tx.items.map((it, i) => (
                      <span key={i} className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full uppercase">{it}</span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap text-xs font-black text-slate-900">
                  {storageService.getCurrencySymbol()} {tx.amount}
                </td>
                <td className="px-8 py-6 whitespace-nowrap text-[9px] font-mono text-slate-400">
                  {tx.razorpay_payment_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTransactions;
