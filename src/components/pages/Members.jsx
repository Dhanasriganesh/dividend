import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/config';
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const Members = () => {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .not('payment', 'is', null);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data || []);
      }
    };

    fetchMembers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('members_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'members' },
        () => {
          fetchMembers(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  const sortedMembers = useMemo(() => {
    const filtered = members.filter(member =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone_no?.includes(searchTerm)
    );
    return [...filtered].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [members, searchTerm]);
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="sticky top-0 z-20 bg-white border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Members</h1>
              <p className="text-sm text-gray-500">Browse and search all members</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 text-sm rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              Back
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="relative max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search members..."
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-amber-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-amber-200 overflow-hidden">
          <div className="overflow-x-auto">  
            <div className="max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-amber-100 text-sm">
                <thead className="bg-amber-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">S.No</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Joined</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Member-ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Mobile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {sortedMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                        {searchTerm ? 'No members found' : 'No members yet'}
                      </td>
                    </tr>
                  ) : (
                    sortedMembers.map((member, index) => (
                      <tr key={member.id} className="hover:bg-amber-50 cursor-pointer"
                        onClick={() => navigate(`/member/${member.id}`)}>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{index + 1}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {member.created_at
                            ? new Date(member.created_at).toLocaleDateString()
                            : ''}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{member.name}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-mono text-xs">
                          {member.payment?.membershipId || '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{member.phone_no}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Members;


