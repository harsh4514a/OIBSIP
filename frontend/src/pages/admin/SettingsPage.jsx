import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Truck, Settings2, User, Save, Clock, ShieldAlert, BadgeInfo } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import { updateProfile } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import { getSettings, updateSettings } from '../../api/setting';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, getProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('store');
  const [saving, setSaving] = useState(false);

  // Store Configuration State (Simulated via localStorage for UI/demo persistency)
  const [storeSettings, setStoreSettings] = useState({
    storeName: 'PizzaHub',
    contactEmail: 'contact@pizzahub.com',
    contactPhone: '+91 98765 43210',
    storeAddress: '123 Pizza Street, Food City, 380001',
    deliveryFee: 49,
    freeDeliveryThreshold: 499,
    estDeliveryTime: '30-45 mins',
    maintenanceMode: false,
    cashOnDelivery: true,
    customPizzaBuilder: true,
  });

  // Account Settings State (Saved to database)
  const [accountForm, setAccountForm] = useState({
    name: '',
    phone: '',
  });

  // Load configuration from database
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await getSettings();
        if (data.data) {
          setStoreSettings(prev => ({ ...prev, ...data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch settings from DB', err);
      }
    };
    fetchSettings();
  }, []);

  // Update account form when user context is loaded
  useEffect(() => {
    if (user) {
      setAccountForm({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleStoreSettingChange = (key, value) => {
    setStoreSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveStoreSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(storeSettings);
      toast.success('Store settings updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(accountForm);
      if (getProfile) await getProfile(); // reload profile in auth context
      toast.success('Admin profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'store', label: 'Store Profile', icon: Store },
    { id: 'delivery', label: 'Delivery & Fees', icon: Truck },
    { id: 'system', label: 'System Toggles', icon: Settings2 },
    { id: 'account', label: 'Account Settings', icon: User },
  ];

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global store preferences and manage your admin account</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Settings Tabs Sidebar */}
          <div className="w-full md:w-64 bg-card border border-border rounded-2xl p-4 space-y-1.5 flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Tab Content */}
          <div className="flex-1 w-full bg-card border border-border rounded-2xl overflow-hidden min-h-[500px]">
            <AnimatePresence mode="wait">
              {activeTab === 'store' && (
                <motion.form
                  key="store"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  onSubmit={handleSaveStoreSettings}
                  className="p-6 lg:p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2 mb-1">
                      <Store className="w-5 h-5 text-orange-500" /> Store Profile
                    </h2>
                    <p className="text-xs text-muted-foreground">General information shown to customers and receipts.</p>
                  </div>
                  <div className="border-t border-border pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Store Name</label>
                        <input
                          type="text"
                          required
                          value={storeSettings.storeName}
                          onChange={e => handleStoreSettingChange('storeName', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Contact Email</label>
                        <input
                          type="email"
                          required
                          value={storeSettings.contactEmail}
                          onChange={e => handleStoreSettingChange('contactEmail', e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Contact Phone</label>
                      <input
                        type="text"
                        required
                        value={storeSettings.contactPhone}
                        onChange={e => handleStoreSettingChange('contactPhone', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Store Location / Address</label>
                      <textarea
                        rows={3}
                        required
                        value={storeSettings.storeAddress}
                        onChange={e => handleStoreSettingChange('storeAddress', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                      />
                    </div>
                  </div>
                  <div className="border-t border-border pt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </motion.form>
              )}

              {activeTab === 'delivery' && (
                <motion.form
                  key="delivery"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  onSubmit={handleSaveStoreSettings}
                  className="p-6 lg:p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2 mb-1">
                      <Truck className="w-5 h-5 text-orange-500" /> Delivery & Logistics
                    </h2>
                    <p className="text-xs text-muted-foreground">Define delivery rates and estimated schedules.</p>
                  </div>
                  <div className="border-t border-border pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          Delivery Fee (₹)
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={storeSettings.deliveryFee}
                          onChange={e => handleStoreSettingChange('deliveryFee', Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          Free Delivery Minimum (₹)
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={storeSettings.freeDeliveryThreshold}
                          onChange={e => handleStoreSettingChange('freeDeliveryThreshold', Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Estimated Delivery Time
                      </label>
                      <input
                        type="text"
                        required
                        value={storeSettings.estDeliveryTime}
                        onChange={e => handleStoreSettingChange('estDeliveryTime', e.target.value)}
                        placeholder="e.g. 30-40 mins"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div className="border-t border-border pt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </motion.form>
              )}

              {activeTab === 'system' && (
                <motion.form
                  key="system"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  onSubmit={handleSaveStoreSettings}
                  className="p-6 lg:p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2 mb-1">
                      <Settings2 className="w-5 h-5 text-orange-500" /> System Preferences
                    </h2>
                    <p className="text-xs text-muted-foreground">Toggle application features and operational status.</p>
                  </div>
                  <div className="border-t border-border pt-6 space-y-5">
                    {/* Maintenance Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-red-500" /> Maintenance Mode
                        </div>
                        <p className="text-xs text-muted-foreground">Temporarily block frontend client orders.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStoreSettingChange('maintenanceMode', !storeSettings.maintenanceMode)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                          storeSettings.maintenanceMode ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                            storeSettings.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Cash on Delivery Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground">Cash On Delivery (COD)</div>
                        <p className="text-xs text-muted-foreground">Allow customers to choose COD checkout payment.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStoreSettingChange('cashOnDelivery', !storeSettings.cashOnDelivery)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                          storeSettings.cashOnDelivery ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                            storeSettings.cashOnDelivery ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Custom Pizza Builder Toggle */}
                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-2xl border border-border">
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-foreground">Custom Pizza Builder</div>
                        <p className="text-xs text-muted-foreground">Allow users to build custom pizzas from scratch.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStoreSettingChange('customPizzaBuilder', !storeSettings.customPizzaBuilder)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${
                          storeSettings.customPizzaBuilder ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                            storeSettings.customPizzaBuilder ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-border pt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </motion.form>
              )}

              {activeTab === 'account' && (
                <motion.form
                  key="account"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  onSubmit={handleSaveAccount}
                  className="p-6 lg:p-8 space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold font-display text-foreground flex items-center gap-2 mb-1">
                      <User className="w-5 h-5 text-orange-500" /> Account Settings
                    </h2>
                    <p className="text-xs text-muted-foreground">Manage your personal admin credentials and profile info.</p>
                  </div>
                  <div className="border-t border-border pt-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Admin Full Name</label>
                      <input
                        type="text"
                        required
                        value={accountForm.name}
                        onChange={e => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                      <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-xl">
                        <span className="text-sm text-muted-foreground">{user?.email || 'admin@pizzahub.com'}</span>
                        <span className="ml-auto text-[10px] font-bold tracking-wider uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <BadgeInfo className="w-3 h-3" /> System Lock
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={accountForm.phone}
                        onChange={e => setAccountForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Provide support contact number"
                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div className="border-t border-border pt-6 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-lg shadow-orange-500/20 disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                      Save Account Details
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
