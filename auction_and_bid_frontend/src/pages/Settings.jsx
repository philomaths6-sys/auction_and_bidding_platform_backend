import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { User, Shield, CheckCircle2, Bell, Upload, AlertTriangle, Key } from 'lucide-react';
import axiosClient from '../services/api/axiosClient';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile State
  const [profile, setProfile] = useState({
    full_name: user?.profile?.full_name || user?.full_name || '',
    bio: user?.profile?.bio || '',
    city: user?.profile?.city || '',
    country: user?.profile?.country || '',
    address: user?.profile?.address || '',
    profile_image: user?.profile?.profile_image || '',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // Notification Prefs State
  const [notifPrefs, setNotifPrefs] = useState(() => {
    const saved = localStorage.getItem('notification_prefs');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* no-op */ }
    }
    return {
      bid_placed: { inApp: true, email: true },
      outbid: { inApp: true, email: true },
      won: { inApp: true, email: true },
      payment_due: { inApp: true, email: true },
    };
  });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      // Don't send blob:// URLs to backend — they're browser-only
      const payload = { ...profile };
      if (payload.profile_image && payload.profile_image.startsWith('blob:')) {
        delete payload.profile_image;
      }
      await axiosClient.put('/users/me/profile', payload);
      const updated = await refreshUser();
      if (updated?.profile) {
        setProfile({
          full_name: updated.profile.full_name || '',
          bio: updated.profile.bio || '',
          city: updated.profile.city || '',
          country: updated.profile.country || '',
          address: updated.profile.address || '',
          profile_image: updated.profile.profile_image || '',
        });
      }
      addToast('Profile updated successfully', 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to update profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return addToast("Passwords don't match", "error");
    if (passwords.new.length < 8) return addToast("Password must be at least 8 characters", "error");
    
    try {
      await axiosClient.put('/users/me/password', {
        current_password: passwords.current,
        new_password: passwords.new,
      });
      addToast('Password updated successfully', 'success');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to update password', 'error');
    }
  };

  const tabs = [
    { id: 'profile', icon: <User className="w-4 h-4" />, label: 'Profile Settings' },
    { id: 'security', icon: <Shield className="w-4 h-4" />, label: 'Security & Password' },
    { id: 'verification', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Verification Status' },
    { id: 'notifications', icon: <Bell className="w-4 h-4" />, label: 'Notifications' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto py-8 font-sans">
      <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-8">Account Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Nav */}
        <div className="md:w-[300px] flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {tabs.map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border-l-4 border-amber-500' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm min-h-[500px]">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Profile Information</h2>
              <form onSubmit={handleProfileSave} className="space-y-6 max-w-2xl">
                
                <div className="flex items-center gap-6 mb-8">
                  <label htmlFor="avatar-upload" className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-amber-500 transition-colors">
                    {profile.profile_image ? (
                      <img src={profile.profile_image} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-amber-500 transition-colors" />
                    )}
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const objectUrl = URL.createObjectURL(file);
                        setProfile({...profile, profile_image: objectUrl});
                      }
                    }} />
                  </label>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-1">Avatar Image</h3>
                    <p className="text-xs font-semibold text-slate-500 max-w-[200px]">Click to upload a square image. Max size 2MB.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input type="text" value={profile.full_name} onChange={e=>setProfile({...profile, full_name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bio</label>
                    <textarea rows="3" value={profile.bio} onChange={e=>setProfile({...profile, bio: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white"></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Profile Image URL</label>
                    <input type="url" value={profile.profile_image?.startsWith('blob:') ? '' : (profile.profile_image || '')} onChange={e=>setProfile({...profile, profile_image: e.target.value})} placeholder="https://example.com/avatar.jpg" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Address</label>
                    <input type="text" value={profile.address} onChange={e=>setProfile({...profile, address: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">City</label>
                      <input type="text" value={profile.city} onChange={e=>setProfile({...profile, city: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Country</label>
                      <select value={profile.country} onChange={e=>setProfile({...profile, country: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-amber-500 focus:outline-none transition-colors dark:text-white">
                        <option value="">Select country...</option>
                        <option value="US">🇺🇸 United States</option>
                        <option value="UK">🇬🇧 United Kingdom</option>
                        <option value="CA">🇨🇦 Canada</option>
                        <option value="AU">🇦🇺 Australia</option>
                        <option value="FR">🇫🇷 France</option>
                        <option value="IN">🇮🇳 India</option>
                        <option value="DE">🇩🇪 Germany</option>
                        <option value="JP">🇯🇵 Japan</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button type="submit" disabled={isSavingProfile} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest px-8 py-3 rounded-lg transition-transform hover:scale-105 disabled:opacity-50">
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Security & Password</h2>
              <form onSubmit={handlePasswordSave} className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Password</label>
                  <input type="password" required value={passwords.current} onChange={e=>setPasswords({...passwords, current: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-mono focus:border-amber-500 focus:outline-none" />
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">New Password (Min 8 chars)</label>
                  <input type="password" minLength={8} required value={passwords.new} onChange={e=>setPasswords({...passwords, new: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-mono focus:border-amber-500 focus:outline-none mb-2" />
                  
                  {/* Strength Bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-4">
                    <div className={`h-full transition-all duration-300 ${passwords.new.length > 0 ? (passwords.new.length >= 8 ? 'w-full bg-green-500' : 'w-1/2 bg-amber-500') : 'w-0'}`}></div>
                  </div>

                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Confirm New Password</label>
                  <input type="password" minLength={8} required value={passwords.confirm} onChange={e=>setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-mono focus:border-amber-500 focus:outline-none" />
                </div>
                <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest px-8 py-3 rounded-lg hover:scale-105 transition-transform flex items-center gap-2">
                  <Key className="w-4 h-4" /> Update Password
                </button>
              </form>
            </div>
          )}

          {/* VERIFICATION TAB */}
          {activeTab === 'verification' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Verification Status</h2>
              
              {user?.is_verified ? (
                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-6 rounded-r-lg max-w-2xl">
                  <div className="flex items-center gap-3 text-green-700 dark:text-green-400 mb-2">
                    <CheckCircle2 className="w-8 h-8" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Verified Account</h3>
                  </div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Your email address has been successfully verified. You have full access to bidding and selling features on PrimeAuctions.</p>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-r-lg max-w-2xl">
                  <div className="flex items-center gap-3 text-amber-700 dark:text-amber-500 mb-2">
                    <AlertTriangle className="w-8 h-8" />
                    <h3 className="text-lg font-black uppercase tracking-tight">Email Not Verified</h3>
                  </div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-6">Your email address has not been verified yet. Unverified accounts cannot place bids above $10,000 or create listings.</p>
                  <button onClick={() => addToast('Verification email sent!', 'info')} className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black uppercase tracking-widest px-6 py-2.5 rounded shadow-sm transition-colors text-sm">
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NOTIFICATION PREFS TAB */}
          {activeTab === 'notifications' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">Notification Preferences</h2>
              <div className="max-w-3xl border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left bg-white dark:bg-slate-900">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Alert Type</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">In-App Push</th>
                      <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-center">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-200">
                    {[
                      { key: 'bid_placed', label: 'Bid Placed successfully' },
                      { key: 'outbid', label: 'Outbid by another user' },
                      { key: 'won', label: 'Auction Won confirmation' },
                      { key: 'payment_due', label: 'Payment due reminder' }
                    ].map(type => (
                      <tr key={type.key}>
                        <td className="p-4 flex items-center gap-2"><Bell className="w-4 h-4 text-slate-400" /> {type.label}</td>
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={notifPrefs[type.key].inApp} onChange={e => {
                            const next = {...notifPrefs, [type.key]: {...notifPrefs[type.key], inApp: e.target.checked}};
                            setNotifPrefs(next);
                            localStorage.setItem('notification_prefs', JSON.stringify(next));
                          }} className="w-5 h-5 accent-amber-500" />
                        </td>
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={notifPrefs[type.key].email} onChange={e => {
                            const next = {...notifPrefs, [type.key]: {...notifPrefs[type.key], email: e.target.checked}};
                            setNotifPrefs(next);
                            localStorage.setItem('notification_prefs', JSON.stringify(next));
                          }} className="w-5 h-5 accent-amber-500" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-4 uppercase tracking-widest">Changes save automatically.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
