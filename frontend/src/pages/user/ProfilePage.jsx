import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, MapPin, Lock, Plus, Trash2, Eye, EyeOff, Edit2, Check } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useAuth } from '../../hooks/useAuth'
import { updateProfile, addAddress, updateAddress, deleteAddress, getUserProfile } from '../../api/auth'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'security', label: 'Security', icon: Lock },
]

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [showAddAddr, setShowAddAddr] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: 'Home', street: '', city: '', state: '', pincode: '', phone: '' })
  const [addrLoading, setAddrLoading] = useState(false)
  const [editingAddress, setEditingAddress] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getUserProfile()
        setAddresses(data.data?.user?.addresses || [])
        setProfileForm({ name: data.data?.user?.name || '', phone: data.data?.user?.phone || '' })
      } catch {}
    }
    fetchProfile()
  }, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      const { data } = await updateProfile(profileForm)
      toast.success('Profile updated!')
    } catch { toast.error('Update failed') }
    finally { setProfileLoading(false) }
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()
    if (!newAddr.street || !newAddr.city || !newAddr.pincode || !newAddr.phone) return toast.error('Fill all fields')
    setAddrLoading(true)
    try {
      const { data } = await addAddress(newAddr)
      setAddresses(data.data.addresses)
      setShowAddAddr(false)
      setNewAddr({ label: 'Home', street: '', city: '', state: '', pincode: '', phone: '' })
      toast.success('Address added!')
    } catch { toast.error('Failed') }
    finally { setAddrLoading(false) }
  }

  const handleEditAddress = async (e) => {
    e.preventDefault()
    if (!editingAddress.street || !editingAddress.city || !editingAddress.pincode || !editingAddress.phone) return toast.error('Fill all fields')
    setAddrLoading(true)
    try {
      const { data } = await updateAddress(editingAddress._id, editingAddress)
      setAddresses(data.data.addresses)
      setEditingAddress(null)
      toast.success('Address updated!')
    } catch { toast.error('Failed to update address') }
    finally { setAddrLoading(false) }
  }

  const handleDeleteAddr = async (addrId) => {
    try {
      const { data } = await deleteAddress(addrId)
      setAddresses(data.data.addresses)
      toast.success('Address removed')
    } catch { toast.error('Failed') }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-3xl font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground">{user?.name}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-xs font-bold capitalize">{user?.role || 'customer'}</span>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-orange-500 text-white' : 'text-muted-foreground hover:bg-muted'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                {activeTab === 'profile' && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="font-display font-bold text-xl text-foreground mb-6">Personal Information</h2>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      {[['name', 'Full Name', 'text'], ['phone', 'Phone', 'tel']].map(([k, l, t]) => (
                        <div key={k}>
                          <label className="text-sm font-medium mb-1.5 block">{l}</label>
                          <input type={t} value={profileForm[k]} onChange={e => setProfileForm(f => ({ ...f, [k]: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                        </div>
                      ))}
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Email</label>
                        <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-muted-foreground cursor-not-allowed" />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>
                      <motion.button type="submit" disabled={profileLoading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                        className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center gap-2">
                        {profileLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Changes
                      </motion.button>
                    </form>
                  </div>
                )}

                {activeTab === 'addresses' && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-display font-bold text-xl text-foreground">Saved Addresses</h2>
                      <button onClick={() => setShowAddAddr(!showAddAddr)} className="flex items-center gap-1.5 text-sm text-orange-500 font-medium hover:text-orange-600">
                        <Plus className="w-4 h-4" /> Add Address
                      </button>
                    </div>

                    {showAddAddr && (
                      <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleAddAddress}
                        className="border-2 border-dashed border-orange-300 rounded-xl p-4 mb-6 space-y-3">
                        <h3 className="font-semibold text-sm">New Address</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {[['label', 'Label'], ['phone', 'Phone'], ['street', 'Street', true], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']].map(([k, pl, full]) => (
                            <input key={k} placeholder={pl} value={newAddr[k]} onChange={e => setNewAddr(a => ({ ...a, [k]: e.target.value }))}
                              className={`px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${full ? 'col-span-2' : ''}`} />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={addrLoading} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-60">Save</button>
                          <button type="button" onClick={() => setShowAddAddr(false)} className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
                        </div>
                      </motion.form>
                    )}

                    <div className="space-y-3">
                      {addresses.length === 0 && <p className="text-muted-foreground text-center py-8">No saved addresses</p>}
                      {addresses.map((addr, i) => (
                        <div key={addr._id || i} className="flex items-start gap-3 p-4 rounded-xl border border-border hover:border-orange-200 transition-colors">
                          {editingAddress && editingAddress._id === addr._id ? (
                            <form onSubmit={handleEditAddress} className="w-full space-y-3">
                              <h3 className="font-semibold text-sm flex items-center gap-1.5"><Edit2 className="w-4 h-4 text-orange-500" /> Edit Address</h3>
                              <div className="grid grid-cols-2 gap-3">
                                {[['label', 'Label'], ['phone', 'Phone'], ['street', 'Street', true], ['city', 'City'], ['state', 'State'], ['pincode', 'Pincode']].map(([k, pl, full]) => (
                                  <input key={k} placeholder={pl} value={editingAddress[k]} onChange={e => setEditingAddress(a => ({ ...a, [k]: e.target.value }))}
                                    className={`px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${full ? 'col-span-2' : ''}`} />
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button type="submit" disabled={addrLoading} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium disabled:opacity-60">Save Changes</button>
                                <button type="button" onClick={() => setEditingAddress(null)} className="px-4 py-2 rounded-xl border border-border text-sm">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <MapPin className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded">{addr.label}</span>
                                  {addr.isDefault && <span className="text-xs text-green-600 font-medium">Default</span>}
                                </div>
                                <p className="text-sm text-foreground">{addr.street}</p>
                                <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} — {addr.pincode}</p>
                                <p className="text-sm text-muted-foreground">📱 {addr.phone}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => setEditingAddress(addr)} className="text-muted-foreground hover:text-orange-500 transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteAddr(addr._id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="bg-card border border-border rounded-2xl p-6">
                    <h2 className="font-display font-bold text-xl text-foreground mb-6">Change Password</h2>
                    <form className="space-y-4" onSubmit={e => { e.preventDefault(); toast.info('Use Forgot Password flow to change your password') }}>
                      {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirmPassword', 'Confirm New Password']].map(([k, l]) => (
                        <div key={k}>
                          <label className="text-sm font-medium mb-1.5 block">{l}</label>
                          <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} value={passwordForm[k]} onChange={e => setPasswordForm(f => ({ ...f, [k]: e.target.value }))} placeholder="••••••••"
                              className="w-full px-4 pr-12 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button type="submit" className="px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors">Update Password</button>
                    </form>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
