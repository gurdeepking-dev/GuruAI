
import React, { useEffect, useState } from 'react';
import { UserActivity } from '../types';
import { supabase } from '../services/supabase';

const ActivityLogView: React.FC = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchActivities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      setActivities(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getEventBadge = (name: string) => {
    const colors: Record<string, string> = {
      'page_view': 'bg-blue-100 text-blue-600',
      'photo_uploaded': 'bg-purple-100 text-purple-600',
      'startgeneration': 'bg-yellow-100 text-yellow-600',
      'generation_success': 'bg-green-100 text-green-600',
      'addtocart': 'bg-pink-100 text-pink-600',
      'initiatecheckout': 'bg-indigo-100 text-indigo-600',
      'purchase': 'bg-rose-600 text-white shadow-sm',
      'generation_error': 'bg-red-100 text-red-600'
    };
    return colors[name.toLowerCase()] || 'bg-slate-100 text-slate-600';
  };

  const filtered = activities.filter(a => 
    a.event_name.toLowerCase().includes(filter.toLowerCase()) ||
    a.session_id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Live Activity Monitor</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Real-time user behavior tracking</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Search event or session..." 
            className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-xs font-medium outline-none focus:ring-2 focus:ring-rose-500 w-full"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button 
            onClick={fetchActivities}
            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Session ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching Logs...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic text-sm">No activity recorded yet.</td>
                </tr>
              ) : (
                filtered.map((activity) => (
                  <tr key={activity.id} className="hover:bg-rose-50/30 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-bold text-slate-600">
                        {new Date(activity.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(activity.created_at!).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getEventBadge(activity.event_name)}`}>
                        {activity.event_name.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 transition-colors">
                        {activity.session_id?.substring(0, 12)}...
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs overflow-hidden">
                        <pre className="text-[9px] text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                          {JSON.stringify(activity.event_data)}
                        </pre>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogView;
