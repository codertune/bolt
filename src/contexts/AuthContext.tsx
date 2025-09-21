import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  mobile: string;
  credits: number;
  emailVerified: boolean;
  memberSince: string;
  isAdmin: boolean;
  trialEndsAt?: string;
  status: 'active' | 'suspended';
  services: string[];
  totalSpent: number;
  lastActivity: string;
  workHistory: WorkHistoryItem[];
}

interface WorkHistoryItem {
  id: string;
  serviceId: string;
  serviceName: string;
  fileName: string;
  creditsUsed: number;
  status: 'completed' | 'failed';
  createdAt: string;
  resultFiles: string[];
  downloadUrl?: string;
}

interface CreditSettings {
  creditsPerBDT: number;
  creditsPerProcess: number;
  freeTrialCredits: number;
  minPurchaseCredits: number;
  enabledServices: string[];
}

interface AuthContextType {
  user: User | null;
  users: User[];
  creditSettings: CreditSettings;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: Partial<User> & { password: string }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  updateCreditSettings: (settings: Partial<CreditSettings>) => void;
  addCredits: (userId: string, credits: number) => void;
  deductCredits: (credits: number) => boolean;
  updateUserAdmin: (userId: string, updates: Partial<User>) => void;
  suspendUser: (userId: string) => void;
  activateUser: (userId: string) => void;
  toggleService: (serviceId: string) => void;
  isServiceEnabled: (serviceId: string) => boolean;
  addWorkHistory: (userId: string, workItem: Omit<WorkHistoryItem, 'id' | 'createdAt'>) => void;
  getWorkHistory: (userId: string) => WorkHistoryItem[];
  cleanupOldHistory: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hash function for password storage (simple implementation)
const hashPassword = (password: string): string => {
  // In production, use bcrypt or similar
  return btoa(password + 'salt_key_2024');
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userPasswords, setUserPasswords] = useState<{ [userId: string]: string }>({});
  const [creditSettings, setCreditSettings] = useState<CreditSettings>({
    creditsPerBDT: 2,
    creditsPerProcess: 0.5,
    freeTrialCredits: 100,
    minPurchaseCredits: 200,
    enabledServices: [
      'pdf-excel-converter',
      'exp-issue',
      'exp-correction',
      'exp-duplicate-reporting',
      'exp-search',
      'damco-booking',
      'damco-booking-download',
      'damco-fcr-submission',
      'damco-fcr-extractor',
      'damco-edoc-upload',
      'hm-einvoice-create',
      'hm-einvoice-download',
      'hm-einvoice-correction',
      'hm-packing-list',
      'bepza-ep-issue',
      'bepza-ep-submission',
      'bepza-ep-download',
      'bepza-ip-issue',
      'bepza-ip-submit',
      'bepza-ip-download',
      'cash-incentive-application',
      'ctg-port-tracking',
      'damco-tracking-maersk',
      'myshipment-tracking',
      'egm-download',
      'custom-tracking'
    ]
  });

  // Load data from localStorage on mount
  useEffect(() => {
    console.log('🔄 AuthProvider: Loading data from localStorage...');
    
    const savedUser = localStorage.getItem('currentUser');
    const savedUsers = localStorage.getItem('allUsers');
    const savedPasswords = localStorage.getItem('userPasswords');
    const savedSettings = localStorage.getItem('creditSettings');

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('✅ Loaded saved user:', parsedUser.email);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error loading user data:', e);
      }
    }

    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        console.log('✅ Loaded saved users:', parsedUsers.length);
        setUsers(parsedUsers);
      } catch (e) {
        console.error('Error loading users data:', e);
      }
    }

    if (savedPasswords) {
      try {
        const parsedPasswords = JSON.parse(savedPasswords);
        console.log('✅ Loaded saved passwords for users:', Object.keys(parsedPasswords));
        setUserPasswords(parsedPasswords);
      } catch (e) {
        console.error('Error loading passwords data:', e);
      }
    }

    if (savedSettings) {
      try {
        const loadedSettings = JSON.parse(savedSettings);
        console.log('✅ Loaded saved settings with', loadedSettings.enabledServices?.length || 0, 'enabled services');
        console.log('📋 Loaded enabled services:', loadedSettings.enabledServices);
        setCreditSettings(loadedSettings);
      } catch (e) {
        console.error('Error loading settings data:', e);
      }
    } else {
      console.log('⚠️ No saved settings found, will use and save default settings');
      // Save default settings immediately if none exist
      localStorage.setItem('creditSettings', JSON.stringify(creditSettings));
    }
  }, []);

  // Save default settings to localStorage if none exist
  useEffect(() => {
    const savedSettings = localStorage.getItem('creditSettings');
    if (!savedSettings) {
      console.log('💾 Saving default creditSettings to localStorage');
      localStorage.setItem('creditSettings', JSON.stringify(creditSettings));
    }
  }, [creditSettings]);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    console.log('💾 Saving users to localStorage:', users.length);
    if (users.length > 0) { // Only save if there are users
      localStorage.setItem('allUsers', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    console.log('💾 Saving passwords to localStorage:', Object.keys(userPasswords).length);
    if (Object.keys(userPasswords).length > 0) { // Only save if there are passwords
      localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
    }
  }, [userPasswords]);

  useEffect(() => {
    console.log('💾 Saving creditSettings to localStorage with', creditSettings.enabledServices?.length || 0, 'enabled services');
    localStorage.setItem('creditSettings', JSON.stringify(creditSettings));
  }, [creditSettings]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const userAccount = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!userAccount) {
        return { success: false, message: 'User not found. Please register first.' };
      }

      const storedPasswordHash = userPasswords[userAccount.id];
      if (!storedPasswordHash || !verifyPassword(password, storedPasswordHash)) {
        return { success: false, message: 'Invalid email or password.' };
      }

      if (userAccount.status === 'suspended') {
        return { success: false, message: 'Account suspended. Please contact support.' };
      }

      // Update last activity
      const updatedUser = {
        ...userAccount,
        lastActivity: new Date().toISOString().split('T')[0]
      };

      setUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === userAccount.id ? updatedUser : u));
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      return { success: true, message: 'Login successful!' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const register = async (userData: Partial<User> & { password: string }): Promise<{ success: boolean; message: string }> => {
    try {
      if (!userData.email || !userData.password || !userData.name || !userData.company || !userData.mobile) {
        return { success: false, message: 'All fields are required.' };
      }

      if (users.find(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
        return { success: false, message: 'Email already exists.' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return { success: false, message: 'Please enter a valid email address.' };
      }

      // Validate password strength
      if (userData.password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters long.' };
      }

      const userId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const currentDate = new Date().toISOString().split('T')[0];

      // Make first user admin automatically
      const isFirstUser = users.length === 0;
      const newUser: User = {
        id: userId,
        email: userData.email.toLowerCase(),
        name: userData.name,
        company: userData.company,
        mobile: userData.mobile,
        credits: creditSettings.freeTrialCredits,
        emailVerified: false,
        memberSince: currentDate,
        isAdmin: isFirstUser, // First user becomes admin
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'active',
        services: [],
        totalSpent: 0,
        lastActivity: currentDate,
        workHistory: []
      };

      // Hash and store password
      const hashedPassword = hashPassword(userData.password);
      
      setUsers(prev => [...prev, newUser]);
      setUserPasswords(prev => ({ ...prev, [userId]: hashedPassword }));
      setUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      // Force immediate save of users and passwords
      localStorage.setItem('allUsers', JSON.stringify([...users, newUser]));
      localStorage.setItem('userPasswords', JSON.stringify({ ...userPasswords, [userId]: hashedPassword }));

      return { 
        success: true, 
        message: `Account created successfully! You have received ${creditSettings.freeTrialCredits} free trial credits.${isFirstUser ? ' You are now the admin user.' : ''}` 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    window.location.href = '/';
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const updateCreditSettings = (settings: Partial<CreditSettings>) => {
    const newSettings = { ...creditSettings, ...settings };
    setCreditSettings(newSettings);
  };

  const addCredits = (userId: string, credits: number) => {
    console.log(`Adding ${credits} credits to user ${userId}`);
    setUsers(prev => prev.map(u => 
      u.id === userId ? { 
        ...u, 
        credits: u.credits + credits,
        // Don't increase totalSpent when refunding credits
        totalSpent: credits > 0 && u.totalSpent > 0 ? u.totalSpent : u.totalSpent + (credits / creditSettings.creditsPerBDT)
      } : u
    ));
    
    if (user && user.id === userId) {
      const updatedUser = { 
        ...user, 
        credits: user.credits + credits,
        // Don't increase totalSpent when refunding credits
        totalSpent: credits > 0 && user.totalSpent > 0 ? user.totalSpent : user.totalSpent + (credits / creditSettings.creditsPerBDT)
      };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const deductCredits = (credits: number): boolean => {
    if (user?.isAdmin) {
      return true;
    }
    
    if (user && user.credits >= credits) {
      const updatedUser = { ...user, credits: user.credits - credits };
      updateUser(updatedUser);
      return true;
    }
    return false;
  };

  const updateUserAdmin = (userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    
    if (user && user.id === userId) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const suspendUser = (userId: string) => {
    updateUserAdmin(userId, { status: 'suspended' });
  };

  const activateUser = (userId: string) => {
    updateUserAdmin(userId, { status: 'active' });
  };

  const toggleService = (serviceId: string) => {
    console.log('🔄 toggleService called for:', serviceId);
    console.log('📋 Current enabled services:', creditSettings.enabledServices);
    
    const newSettings = { ...creditSettings };
      const currentServices = creditSettings.enabledServices || [];
      const isCurrentlyEnabled = currentServices.includes(serviceId);
      
      const newEnabledServices = isCurrentlyEnabled
        ? currentServices.filter(id => id !== serviceId)
        : [...currentServices, serviceId];
      
      console.log('🔄 Service', serviceId, isCurrentlyEnabled ? 'DISABLED' : 'ENABLED');
      console.log('📋 New enabled services:', newEnabledServices);
      
      newSettings.enabledServices = newEnabledServices;
      
      // Force immediate localStorage save
      try {
        localStorage.setItem('creditSettings', JSON.stringify(newSettings));
        console.log('✅ Settings immediately saved to localStorage');
      } catch (error) {
        console.error('❌ Failed to save settings to localStorage:', error);
      }
      
    setCreditSettings(newSettings);
  };

  const isServiceEnabled = (serviceId: string) => {
    const enabled = creditSettings.enabledServices?.includes(serviceId) || false;
    console.log('🔍 isServiceEnabled check:', serviceId, '=', enabled);
    console.log('📋 Current enabledServices array:', creditSettings.enabledServices);
    return enabled;
  };

  // Add demo data creation function for testing
  const createDemoData = () => {
    console.log('🎭 Creating demo data for testing...');
    
    const demoUsers: User[] = [
      {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Company Ltd',
        mobile: '+880 1234-567890',
        credits: 100,
        emailVerified: true,
        memberSince: '2024-01-01',
        isAdmin: false,
        trialEndsAt: '2024-12-31',
        status: 'active',
        services: ['pdf-excel-converter', 'damco-tracking-maersk'],
        totalSpent: 0,
        lastActivity: '2024-01-20',
        workHistory: []
      },
      {
        id: 'admin_1',
        email: 'admin@smartprocessflow.com',
        name: 'Admin User',
        company: 'Smart Process Flow',
        mobile: '+880 1234-567891',
        credits: 999999,
        emailVerified: true,
        memberSince: '2024-01-01',
        isAdmin: true,
        status: 'active',
        services: [],
        totalSpent: 0,
        lastActivity: '2024-01-20',
        workHistory: []
      }
    ];
    
    const demoPasswords = {
      'user_1': hashPassword('test123'),
      'admin_1': hashPassword('admin123')
    };
    
    setUsers(demoUsers);
    setUserPasswords(demoPasswords);
    
    console.log('✅ Demo data created successfully');
  };

  // Expose createDemoData function globally for testing
  useEffect(() => {
    (window as any).createDemoData = createDemoData;
    console.log('🎭 Demo data function available: window.createDemoData()');
  }, []);

  const addWorkHistory = (userId: string, workItem: Omit<WorkHistoryItem, 'id' | 'createdAt'>) => {
    const newWorkItem: WorkHistoryItem = {
      ...workItem,
      id: `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, workHistory: [newWorkItem, ...(u.workHistory || [])] }
        : u
    ));

    if (user && user.id === userId) {
      const updatedUser = { ...user, workHistory: [newWorkItem, ...(user.workHistory || [])] };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  const getWorkHistory = (userId: string) => {
    const userData = users.find(u => u.id === userId);
    if (!userData) return [];
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (userData.workHistory || []).filter(item => 
      new Date(item.createdAt) > sevenDaysAgo
    );
  };

  const cleanupOldHistory = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    setUsers(prev => prev.map(u => ({
      ...u,
      workHistory: (u.workHistory || []).filter(item => 
        new Date(item.createdAt) > sevenDaysAgo
      )
    })));

    if (user) {
      const filteredHistory = (user.workHistory || []).filter(item => 
        new Date(item.createdAt) > sevenDaysAgo
      );
      const updatedUser = { ...user, workHistory: filteredHistory };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  useEffect(() => {
    const interval = setInterval(cleanupOldHistory, 24 * 60 * 60 * 1000); // Daily cleanup
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      users,
      creditSettings,
      login,
      register,
      logout,
      updateUser,
      updateCreditSettings,
      addCredits,
      deductCredits,
      updateUserAdmin,
      suspendUser,
      activateUser,
      toggleService,
      isServiceEnabled,
      addWorkHistory,
      getWorkHistory,
      cleanupOldHistory
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
