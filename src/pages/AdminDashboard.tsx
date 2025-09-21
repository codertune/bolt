import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Users, Settings, CreditCard, BarChart3, Shield, DollarSign, UserPlus, UserMinus, Edit, Save, X, Power, PowerOff, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user, users, creditSettings, updateCreditSettings, updateUserAdmin, addCredits, suspendUser, activateUser, toggleService, isServiceEnabled } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(creditSettings);
  const [userEdits, setUserEdits] = useState<{ [userId: string]: Partial<User> }>({});

  // Redirect to home if not logged in
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const handleUserEdit = (userId: string, field: string, value: any) => {
    setUserEdits(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const saveUserChanges = (userId: string) => {
    if (userEdits[userId]) {
      updateUserAdmin(userId, userEdits[userId]);
      setUserEdits(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    }
    setEditingUser(null);
  };

  const cancelUserEdit = (userId: string) => {
    setUserEdits(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
    setEditingUser(null);
  };

  const saveSettings = () => {
    updateCreditSettings(tempSettings);
    setEditingSettings(false);
  };

  const cancelSettingsEdit = () => {
    setTempSettings(creditSettings);
    setEditingSettings(false);
  };

  const getSystemStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalCreditsDistributed = users.reduce((sum, u) => sum + u.credits, 0);
    const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);

    return { totalUsers, activeUsers, totalCreditsDistributed, totalRevenue };
  };

  const stats = getSystemStats();

  // All available services
  const allServices = [
    { id: 'pdf-excel-converter', name: 'PDF to Excel/CSV Converter', category: 'PDF Extractor' },
    { id: 'exp-issue', name: 'Issue EXP', category: 'Bangladesh Bank' },
    { id: 'exp-correction', name: 'Issued EXP Correction', category: 'Bangladesh Bank' },
    { id: 'exp-duplicate-reporting', name: 'Duplicate EXP', category: 'Bangladesh Bank' },
    { id: 'exp-search', name: 'Search EXP Detail Information', category: 'Bangladesh Bank' },
    { id: 'damco-booking', name: 'Damco (APM) - Booking', category: 'Forwarder Handler - Damco' },
    { id: 'damco-booking-download', name: 'Damco (APM) - Booking Download', category: 'Forwarder Handler - Damco' },
    { id: 'damco-fcr-submission', name: 'Damco (APM) - FCR Submission', category: 'Forwarder Handler - Damco' },
    { id: 'damco-fcr-extractor', name: 'Damco (APM) - FCR Extractor from Mail', category: 'Forwarder Handler - Damco' },
    { id: 'damco-edoc-upload', name: 'Damco (APM) - E-Doc Upload', category: 'Forwarder Handler - Damco' },
    { id: 'hm-einvoice-create', name: 'H&M - E-Invoice Create', category: 'Buyer Handler - H&M' },
    { id: 'hm-einvoice-download', name: 'H&M - E-Invoice Download', category: 'Buyer Handler - H&M' },
    { id: 'hm-einvoice-correction', name: 'H&M - E-Invoice Correction', category: 'Buyer Handler - H&M' },
    { id: 'hm-packing-list', name: 'H&M - Download E-Packing List', category: 'Buyer Handler - H&M' },
    { id: 'bepza-ep-issue', name: 'BEPZA - EP Issue', category: 'BEPZA' },
    { id: 'bepza-ep-submission', name: 'BEPZA - EP Submission', category: 'BEPZA' },
    { id: 'bepza-ep-download', name: 'BEPZA - EP Download', category: 'BEPZA' },
    { id: 'bepza-ip-issue', name: 'BEPZA - IP Issue', category: 'BEPZA' },
    { id: 'bepza-ip-submit', name: 'BEPZA - IP Submit', category: 'BEPZA' },
    { id: 'bepza-ip-download', name: 'BEPZA - IP Download', category: 'BEPZA' },
    { id: 'cash-incentive-application', name: 'Cash Incentive Application', category: 'Cash Incentive Applications' },
    { id: 'ctg-port-tracking', name: 'CTG Port Authority Tracking', category: 'Tracking Services' },
    { id: 'damco-tracking-maersk', name: 'Damco (APM) Tracking', category: 'Tracking Services' },
    { id: 'myshipment-tracking', name: 'MyShipment Tracking (MGH)', category: 'Tracking Services' },
    { id: 'egm-download', name: 'EGM Download', category: 'Tracking Services' },
    { id: 'custom-tracking', name: 'Custom Tracking', category: 'Tracking Services' }
  ];

  const tabs = [
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'settings', name: 'System Settings', icon: Settings },
    { id: 'services', name: 'Service Management', icon: Wrench },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'payments', name: 'Payments', icon: CreditCard }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, settings, and monitor system performance.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Credits Distributed</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalCreditsDistributed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-orange-600">৳{stats.totalRevenue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* User Management Tab */}
            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">User Management</h2>
                  <div className="text-sm text-gray-500">
                    {users.length} total users
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.filter(u => !u.isAdmin).map(userData => (
                        <tr key={userData.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                              <div className="text-sm text-gray-500">{userData.email}</div>
                              <div className="text-sm text-gray-500">{userData.company}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUser === userData.id ? (
                              <input
                                type="number"
                                value={userEdits[userData.id]?.credits ?? userData.credits}
                                onChange={(e) => handleUserEdit(userData.id, 'credits', parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                            ) : (
                              <span className="text-sm font-medium text-blue-600">{userData.credits}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              userData.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {userData.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ৳{userData.totalSpent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            {editingUser === userData.id ? (
                              <>
                                <button
                                  onClick={() => saveUserChanges(userData.id)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => cancelUserEdit(userData.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setEditingUser(userData.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => addCredits(userData.id, 100)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                                {userData.status === 'active' ? (
                                  <button
                                    onClick={() => suspendUser(userData.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => activateUser(userData.id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    <Shield className="h-4 w-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* System Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">System Settings</h2>
                  {!editingSettings ? (
                    <button
                      onClick={() => setEditingSettings(true)}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Settings
                    </button>
                  ) : (
                    <div className="space-x-2">
                      <button
                        onClick={saveSettings}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </button>
                      <button
                        onClick={cancelSettingsEdit}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Configuration</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Credits per BDT
                        </label>
                        {editingSettings ? (
                          <input
                            type="number"
                            step="0.1"
                            value={tempSettings.creditsPerBDT}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, creditsPerBDT: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-blue-600">{creditSettings.creditsPerBDT}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Credits per Process
                        </label>
                        {editingSettings ? (
                          <input
                            type="number"
                            step="0.1"
                            value={tempSettings.creditsPerProcess}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, creditsPerProcess: parseFloat(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-blue-600">{creditSettings.creditsPerProcess}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Free Trial Credits
                        </label>
                        {editingSettings ? (
                          <input
                            type="number"
                            value={tempSettings.freeTrialCredits}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, freeTrialCredits: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-blue-600">{creditSettings.freeTrialCredits}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Purchase Credits
                        </label>
                        {editingSettings ? (
                          <input
                            type="number"
                            value={tempSettings.minPurchaseCredits}
                            onChange={(e) => setTempSettings(prev => ({ ...prev, minPurchaseCredits: parseInt(e.target.value) }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-blue-600">{creditSettings.minPurchaseCredits}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Rates</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">1 BDT =</span>
                        <span className="font-semibold">{creditSettings.creditsPerBDT} Credits</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">1 Credit =</span>
                        <span className="font-semibold">৳{(1/creditSettings.creditsPerBDT).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Min Purchase =</span>
                        <span className="font-semibold">৳{(creditSettings.minPurchaseCredits/creditSettings.creditsPerBDT).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Service Management Tab */}
            {activeTab === 'services' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Service Management</h2>
                  <div className="text-sm text-gray-500">
                    {creditSettings.enabledServices?.length || 0} of {allServices.length} services enabled
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800">Service Control</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        Disabled services will not be available to users. Failed automation attempts will automatically refund credits.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  {Object.entries(
                    allServices.reduce((acc, service) => {
                      if (!acc[service.category]) acc[service.category] = [];
                      acc[service.category].push(service);
                      return acc;
                    }, {} as { [key: string]: typeof allServices })
                  ).map(([category, services]) => (
                    <div key={category} className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{category}</h3>
                      <div className="grid gap-3">
                        {services.map(service => {
                          const enabled = isServiceEnabled(service.id);
                          return (
                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{service.name}</h4>
                                <p className="text-sm text-gray-500">{service.id}</p>
                              </div>
                              <button
                                onClick={() => toggleService(service.id)}
                                className={`flex items-center px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                                  enabled
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {enabled ? (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enabled
                                  </>
                                ) : (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disabled
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">System Analytics</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Registered Users:</span>
                        <span className="font-semibold">{stats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Users:</span>
                        <span className="font-semibold text-green-600">{stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Suspended Users:</span>
                        <span className="font-semibold text-red-600">{stats.totalUsers - stats.activeUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Admin Users:</span>
                        <span className="font-semibold">{users.filter(u => u.isAdmin).length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Revenue:</span>
                        <span className="font-semibold text-green-600">৳{stats.totalRevenue}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credits Distributed:</span>
                        <span className="font-semibold">{stats.totalCreditsDistributed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Average per User:</span>
                        <span className="font-semibold">৳{(stats.totalRevenue / stats.totalUsers).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credits per User:</span>
                        <span className="font-semibold">{(stats.totalCreditsDistributed / stats.totalUsers).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Monitoring</h2>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Payment monitoring will be available when connected to real bKash API</p>
                    <p className="text-sm text-gray-400 mt-2">Currently using sandbox/demo mode</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
