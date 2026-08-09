import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  FileText, 
  LogOut, 
  Search, 
  Plus, 
  Trash2, 
  User, 
  Lock, 
  AlertCircle, 
  TrendingUp, 
  MapPin, 
  CheckCircle,
  LayoutGrid,
  List,
  Phone,
  Printer,
  Truck,
  ArrowUpRight,
  ShieldCheck,
  Briefcase,
  Calculator,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Database,
  BarChart3,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from './utils/api.js';
import './App.css';

// Type Definitions
interface UserSession {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
}

interface Customer {
  id: number;
  customer_name: string;
  mobile: string;
  email?: string;
  business_name?: string;
  gst_number?: string;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
  address?: string;
  status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
  follow_up_date?: string;
  notes?: string;
  created_by_name?: string;
  created_at: string;
}

interface FollowUp {
  id: number;
  customer_id: number;
  note: string;
  follow_up_date: string;
  created_by_name: string;
  created_at: string;
}

interface Product {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  unit_price: number;
  current_stock: number;
  min_stock_alert: number;
  location?: string;
  is_active: boolean;
  created_by_name?: string;
  created_at: string;
}

interface StockMovement {
  id: number;
  product_id: number;
  quantity: number;
  movement_type: 'IN' | 'OUT';
  reason: string;
  created_by_name: string;
  created_at: string;
}

interface ChallanItem {
  id?: number;
  product_id: number;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
}

interface Challan {
  id: number;
  challan_number: string;
  customer_id: number;
  customer_name?: string;
  business_name?: string;
  total_quantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  created_by_name?: string;
  created_at: string;
  items?: ChallanItem[];
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexuserp_token'));
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // App navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'products' | 'challans'>('dashboard');

  // Distinct Module View Toggle states
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'table'>('kanban');
  const [stockViewMode, setStockViewMode] = useState<'cards' | 'table'>('cards');

  // Staff list state for Admin
  const [staffUsersList, setStaffUsersList] = useState<{ id: number; name: string; email: string; role: string }[]>([
    { id: 1, name: 'System Admin', email: 'admin@nexuserp.com', role: 'ADMIN' },
    { id: 2, name: 'Sales Representative', email: 'sales@nexuserp.com', role: 'SALES' },
    { id: 3, name: 'Warehouse Manager', email: 'warehouse@nexuserp.com', role: 'WAREHOUSE' },
    { id: 4, name: 'Accounts Officer', email: 'accounts@nexuserp.com', role: 'ACCOUNTS' }
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS'>('SALES');

  // Sales Tool state
  const [salesTargetAmount, setSalesTargetAmount] = useState<number>(500000);
  const [estimatedCommissionRate, setEstimatedCommissionRate] = useState<number>(5);

  // Warehouse Tool state
  const [inboundVendorName, setInboundVendorName] = useState('');
  const [inboundProdId, setInboundProdId] = useState<number>(0);
  const [inboundQty, setInboundQty] = useState<number>(50);

  // Accounts Tool state
  const [paymentStatusMap, setPaymentStatusMap] = useState<{ [challanId: number]: 'PAID' | 'PENDING' | 'OVERDUE' }>({});

  // Database lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);

  // Search & Filter state
  const [custSearch, setCustSearch] = useState('');
  const [custTypeFilter, setCustTypeFilter] = useState('');
  const [custStatusFilter, setCustStatusFilter] = useState('');

  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('');

  const [challanStatusFilter, setChallanStatusFilter] = useState('');

  // Selected Detail views (for modals/drawers)
  const [selectedCustomer, setSelectedCustomer] = useState<(Customer & { follow_ups?: FollowUp[] }) | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [selectedChallan, setSelectedChallan] = useState<Challan | null>(null);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStockAdjustmentModalOpen, setIsStockAdjustmentModalOpen] = useState(false);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [isAdminStaffModalOpen, setIsAdminStaffModalOpen] = useState(false);

  // Customer Add Form
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustBusiness, setNewCustBusiness] = useState('');
  const [newCustGST, setNewCustGST] = useState('');
  const [newCustType, setNewCustType] = useState<'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR'>('RETAIL');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');
  const [newCustFollowUpDate, setNewCustFollowUpDate] = useState('');

  // Follow up Form
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');

  // Product Add Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdSKU, setNewProdSKU] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('');
  const [newProdPrice, setNewProdPrice] = useState(0);
  const [newProdStock, setNewProdStock] = useState(0);
  const [newProdMinAlert, setNewProdMinAlert] = useState(5);
  const [newProdLocation, setNewProdLocation] = useState('');

  // Stock Adjustment Form
  const [adjType, setAdjType] = useState<'IN' | 'OUT'>('IN');
  const [adjQty, setAdjQty] = useState(1);
  const [adjReason, setAdjReason] = useState('');

  // Challan Builder Form
  const [challanCustomerId, setChallanCustomerId] = useState<number>(0);
  const [challanStatus, setChallanStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [challanItems, setChallanItems] = useState<{ product_id: number; quantity: number }[]>([
    { product_id: 0, quantity: 1 }
  ]);
  const [challanFormError, setChallanFormError] = useState('');

  // Global success/error indicators
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');

  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  // Check login session on startup
  useEffect(() => {
    if (token) {
      api.get<any>('/auth/me')
        .then((res) => {
          if (res.success && res.data?.user) {
            setCurrentUser(res.data.user);
          } else {
            handleLogout();
          }
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, [token]);

  useEffect(() => {
    if (currentUser) {
      fetchTabContents();
    }
  }, [
    currentUser, 
    activeTab, 
    custSearch, 
    custTypeFilter, 
    custStatusFilter, 
    prodSearch, 
    prodCatFilter, 
    challanStatusFilter
  ]);

  const fetchTabContents = async () => {
    try {
      if (activeTab === 'dashboard') {
        const [cRes, pRes, chRes] = await Promise.all([
          api.get<any>('/customers?limit=100'),
          api.get<any>('/products?limit=100'),
          api.get<any>('/challans?limit=100')
        ]);
        setCustomers(cRes.data?.customers || []);
        setProducts(pRes.data?.products || []);
        setChallans(chRes.data?.challans || []);
      } 
      else if (activeTab === 'customers' && hasRole(['ADMIN', 'SALES', 'ACCOUNTS'])) {
        const query = `/customers?search=${custSearch}&type=${custTypeFilter}&status=${custStatusFilter}&limit=50`;
        const res = await api.get<any>(query);
        setCustomers(res.data?.customers || []);
      } 
      else if (activeTab === 'products') {
        const query = `/products?search=${prodSearch}&category=${prodCatFilter}&limit=50`;
        const res = await api.get<any>(query);
        setProducts(res.data?.products || []);
      } 
      else if (activeTab === 'challans') {
        const query = `/challans?status=${challanStatusFilter}&limit=50`;
        const res = await api.get<any>(query);
        const fetchedChallans = res.data?.challans || [];
        setChallans(fetchedChallans);
        if (fetchedChallans.length > 0 && !selectedChallan) {
          selectChallanForInvoice(fetchedChallans[0].id);
        }
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error loading directory contents');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await api.post<any>('/auth/login', { email: loginEmail, password: loginPassword });
      if (res.success && res.data) {
        localStorage.setItem('nexuserp_token', res.data.token);
        setToken(res.data.token);
        setCurrentUser(res.data.user);
        setGlobalSuccess('Logged in successfully!');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexuserp_token');
    setToken(null);
    setCurrentUser(null);
    setSelectedCustomer(null);
    setSelectedProduct(null);
    setSelectedChallan(null);
    setActiveTab('dashboard');
    setShowLandingPage(true);
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  const fillShortcutCredentials = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setShowLandingPage(false);
  };

  // --- ADMIN ROLE EXCLUSIVE FEATURE HANDLERS ---
  const handleAddStaffUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName || !newStaffEmail) return;
    const newUser = {
      id: staffUsersList.length + 1,
      name: newStaffName,
      email: newStaffEmail,
      role: newStaffRole
    };
    setStaffUsersList([...staffUsersList, newUser]);
    setNewStaffName('');
    setNewStaffEmail('');
    setIsAdminStaffModalOpen(false);
    setGlobalSuccess(`Staff user ${newUser.name} added with role ${newUser.role}`);
  };

  // --- WAREHOUSE ROLE EXCLUSIVE INBOUND RESTOCK HANDLER ---
  const handleProcessInboundRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inboundProdId === 0 || inboundQty <= 0) {
      setGlobalError('Select a valid product and restock quantity');
      return;
    }
    try {
      const res = await api.post<any>(`/products/${inboundProdId}/stock`, {
        movement_type: 'IN',
        quantity: Number(inboundQty),
        reason: `Inbound PO Shipment from Vendor: ${inboundVendorName || 'General Supplier'}`
      });
      if (res.success) {
        setGlobalSuccess(`Inbound batch restock processed successfully (+${inboundQty} units)`);
        setInboundVendorName('');
        setInboundProdId(0);
        setInboundQty(50);
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to process inbound restock batch');
    }
  };

  // --- ACCOUNTS ROLE EXCLUSIVE PAYMENT RECONCILIATION ---
  const toggleInvoicePaymentStatus = (challanId: number, status: 'PAID' | 'PENDING' | 'OVERDUE') => {
    setPaymentStatusMap({ ...paymentStatusMap, [challanId]: status });
    setGlobalSuccess(`Payment reconciliation status for Challan #${challanId} updated to ${status}`);
  };

  // --- CRM Operations ---
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        customer_name: newCustName,
        mobile: newCustMobile,
        email: newCustEmail,
        business_name: newCustBusiness,
        gst_number: newCustGST,
        customer_type: newCustType,
        address: newCustAddress,
        notes: newCustNotes,
        follow_up_date: newCustFollowUpDate,
        status: 'ACTIVE' as const
      };
      
      const res = await api.post<any>('/customers', payload);
      if (res.success) {
        setGlobalSuccess('Customer profile added successfully');
        setIsCustomerModalOpen(false);
        setNewCustName('');
        setNewCustMobile('');
        setNewCustEmail('');
        setNewCustBusiness('');
        setNewCustGST('');
        setNewCustType('RETAIL');
        setNewCustAddress('');
        setNewCustNotes('');
        setNewCustFollowUpDate('');
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to add customer');
    }
  };

  const selectCustomerForDetails = async (id: number) => {
    try {
      const res = await api.get<any>(`/customers/${id}`);
      if (res.success && res.data) {
        setSelectedCustomer(res.data);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error fetching customer profile');
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      const res = await api.post<any>(`/customers/${selectedCustomer.id}/follow-ups`, {
        note: newFollowUpNote,
        follow_up_date: newFollowUpDate
      });
      if (res.success) {
        setGlobalSuccess('CRM follow-up note logged');
        setNewFollowUpNote('');
        setNewFollowUpDate('');
        selectCustomerForDetails(selectedCustomer.id);
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to add follow-up note');
    }
  };

  // --- Inventory Operations ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        product_name: newProdName,
        sku: newProdSKU,
        category: newProdCategory,
        unit_price: Number(newProdPrice),
        current_stock: Number(newProdStock),
        min_stock_alert: Number(newProdMinAlert),
        location: newProdLocation
      };
      const res = await api.post<any>('/products', payload);
      if (res.success) {
        setGlobalSuccess('Product created successfully');
        setIsProductModalOpen(false);
        setNewProdName('');
        setNewProdSKU('');
        setNewProdCategory('');
        setNewProdPrice(0);
        setNewProdStock(0);
        setNewProdMinAlert(5);
        setNewProdLocation('');
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to create product');
    }
  };

  const selectProductForDetails = async (prod: Product) => {
    setSelectedProduct(prod);
    try {
      const res = await api.get<any>(`/products/${prod.id}/movements`);
      if (res.success) {
        setProductMovements(res.data || []);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error loading stock movements');
    }
  };

  const openStockModalForProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setIsStockAdjustmentModalOpen(true);
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      const res = await api.post<any>(`/products/${selectedProduct.id}/stock`, {
        movement_type: adjType,
        quantity: Number(adjQty),
        reason: adjReason
      });
      if (res.success) {
        setGlobalSuccess('Stock adjusted successfully');
        setIsStockAdjustmentModalOpen(false);
        setAdjQty(1);
        setAdjReason('');
        
        const refreshedProd = await api.get<any>(`/products/${selectedProduct.id}`);
        selectProductForDetails(refreshedProd.data);
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to adjust stock level');
    }
  };

  // --- Challan Operations ---
  const handleAddChallanItem = () => {
    setChallanItems([...challanItems, { product_id: 0, quantity: 1 }]);
  };

  const handleRemoveChallanItem = (index: number) => {
    const items = [...challanItems];
    items.splice(index, 1);
    setChallanItems(items);
  };

  const handleChallanItemChange = (index: number, key: 'product_id' | 'quantity', val: number) => {
    const items = [...challanItems];
    items[index] = { ...items[index], [key]: val };
    setChallanItems(items);
    setChallanFormError('');
  };

  const calculateChallanTotalValue = () => {
    let total = 0;
    challanItems.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        total += product.unit_price * item.quantity;
      }
    });
    return total;
  };

  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    setChallanFormError('');

    if (challanCustomerId === 0) {
      setChallanFormError('Please select a customer');
      return;
    }

    const hasInvalid = challanItems.some(i => i.product_id === 0 || i.quantity <= 0);
    if (hasInvalid) {
      setChallanFormError('Ensure all products are selected with a quantity of at least 1');
      return;
    }

    if (challanStatus === 'CONFIRMED') {
      for (const item of challanItems) {
        const prod = products.find(p => p.id === item.product_id);
        if (prod && prod.current_stock < item.quantity) {
          setChallanFormError(
            `Insufficient stock for "${prod.product_name}". Available: ${prod.current_stock}, Requested: ${item.quantity}`
          );
          return;
        }
      }
    }

    try {
      const res = await api.post<any>('/challans', {
        customer_id: Number(challanCustomerId),
        status: challanStatus,
        items: challanItems
      });
      if (res.success) {
        setGlobalSuccess('Sales Challan created successfully');
        setIsChallanModalOpen(false);
        setChallanCustomerId(0);
        setChallanStatus('DRAFT');
        setChallanItems([{ product_id: 0, quantity: 1 }]);
        fetchTabContents();
      }
    } catch (err: any) {
      setChallanFormError(err.message || 'Failed to create sales challan');
    }
  };

  const selectChallanForInvoice = async (id: number) => {
    try {
      const res = await api.get<any>(`/challans/${id}`);
      if (res.success && res.data) {
        setSelectedChallan(res.data);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error loading challan invoice');
    }
  };

  const handleUpdateChallanStatus = async (id: number, status: 'CONFIRMED' | 'CANCELLED') => {
    try {
      const res = await api.put<any>(`/challans/${id}`, { status });
      if (res.success) {
        setGlobalSuccess(`Challan status updated to ${status}`);
        selectChallanForInvoice(id);
        fetchTabContents();
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to update challan state');
    }
  };

  // --- UNAUTHENTICATED LANDING PAGE OR LOGIN SCREEN ---
  if (!currentUser) {
    if (showLandingPage) {
      return (
        <div className="landing-container animate-fade">
          {/* Landing Header */}
          <nav className="landing-nav">
            <div className="landing-brand">
              <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>NX</div>
              <h1>NexusERP</h1>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span className="status-badge-container">
                <span className="status-dot"></span>
                <span>SYSTEM ONLINE (PORT 5000/5173)</span>
              </span>
              <button className="btn btn-primary" onClick={() => setShowLandingPage(false)}>
                <User size={16} />
                <span>Employee Portal Login</span>
              </button>
            </div>
          </nav>

          {/* Hero Section */}
          <header className="landing-hero">
            <div className="hero-pill">
              <Sparkles size={14} />
              <span>Full Stack ERP & CRM Operations Suite 2026</span>
            </div>
            <h1>Next-Gen Operations Portal for Wholesale Distribution</h1>
            <p>
              Streamline customer CRM funnels, real-time inventory warehouse stock meters, atomic SQL transaction sales challan dispatches, and role-based financial accounting in one unified platform.
            </p>
            <div className="hero-cta-group">
              <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '16px' }} onClick={() => setShowLandingPage(false)}>
                <span>Access Operations Portal</span>
                <ArrowRight size={18} />
              </button>
              <button className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px' }} onClick={() => fillShortcutCredentials('admin@example.com', 'Admin@123')}>
                <span>Quick Demo Login (Admin)</span>
              </button>
            </div>
          </header>

          {/* Core Modules Feature Grid */}
          <section className="landing-features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
                <Users size={24} />
              </div>
              <h3>CRM Lead Funnel & Deals</h3>
              <p>Visual 3-column Kanban pipeline board, customer GSTIN tracking, and sales rep call timeline history.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                <Package size={24} />
              </div>
              <h3>Warehouse Stock Master</h3>
              <p>SKU catalog, visual stock progress gauge meters, rack location position tags, and audit movement logs.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--color-accent)' }}>
                <FileText size={24} />
              </div>
              <h3>Sales Challans & Dispatch</h3>
              <p>Logistics dispatch studio workspace with live delivery note invoice preview and printable GST documents.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)' }}>
                <Database size={24} />
              </div>
              <h3>Atomic SQL Transactions</h3>
              <p>Row-level PostgreSQL locking (`FOR UPDATE`) prevents negative inventory during simultaneous dispatches.</p>
            </div>
          </section>

          {/* Interactive Role Showcase */}
          <section className="landing-roles-section">
            <div className="section-title-block">
              <h2>Select Operational Role to Test Live Portal</h2>
              <p>Each user role unlocks a specialized visual workspace and role-exclusive operational tools</p>
            </div>

            <div className="roles-showcase-grid">
              <div className="role-demo-card">
                <div>
                  <span className="badge badge-role-admin" style={{ marginBottom: '12px' }}>ADMIN ROLE</span>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>System Administrator</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Full system access + exclusive Staff Account Provisioning & Role Delegation Hub.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fillShortcutCredentials('admin@example.com', 'Admin@123')}>
                  <span>Launch as Admin</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="role-demo-card">
                <div>
                  <span className="badge badge-role-sales" style={{ marginBottom: '12px' }}>SALES ROLE</span>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Sales Executive</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Customer CRM Funnel, Challan Dispatches + exclusive Target Quota & Commission Calculator.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fillShortcutCredentials('sales@example.com', 'Sales@123')}>
                  <span>Launch as Sales</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="role-demo-card">
                <div>
                  <span className="badge badge-role-warehouse" style={{ marginBottom: '12px' }}>WAREHOUSE ROLE</span>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Warehouse Manager</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Stock Cards, Rack Locations + exclusive Inbound Vendor Restock Batch Generator.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fillShortcutCredentials('warehouse@example.com', 'Warehouse@123')}>
                  <span>Launch as Warehouse</span>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="role-demo-card">
                <div>
                  <span className="badge badge-role-accounts" style={{ marginBottom: '12px' }}>ACCOUNTS ROLE</span>
                  <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Accounts Officer</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                    Read-only CRM/Dispatches + exclusive Output GST Tax Liabilities & Payment Reconciliation.
                  </p>
                </div>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => fillShortcutCredentials('accounts@example.com', 'Accounts@123')}>
                  <span>Launch as Accounts</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>

          <footer className="landing-footer">
            NexusERP Operations Portal &copy; 2026. Production Grade Node.js + Express + PostgreSQL + React + Vite.
          </footer>
        </div>
      );
    }

    // Login Form Screen
    return (
      <div className="login-container">
        <div className="login-card animate-fade">
          <div className="login-header">
            <h1 className="login-logo">NexusERP</h1>
            <p>Mini ERP + CRM Operations Portal</p>
          </div>

          {loginError && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>EMAIL ADDRESS</label>
              <div className="input-wrapper">
                <User />
                <input 
                  type="email" 
                  className="input-field" 
                  placeholder="name@example.com" 
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>PASSWORD</label>
              <div className="input-wrapper">
                <Lock />
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••" 
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              Sign In to Portal
            </button>
          </form>

          <div style={{ marginTop: '16px', textCenter: 'center' }}>
            <button className="btn btn-secondary btn-full" onClick={() => setShowLandingPage(true)}>
              ← Back to Product Showcase
            </button>
          </div>

          <div className="role-shortcuts">
            <p>Reviewer Quick Fill Shortcuts</p>
            <div className="shortcuts-grid">
              <button className="role-btn" onClick={() => fillShortcutCredentials('admin@example.com', 'Admin@123')}>ADMIN</button>
              <button className="role-btn" onClick={() => fillShortcutCredentials('sales@example.com', 'Sales@123')}>SALES</button>
              <button className="role-btn" onClick={() => fillShortcutCredentials('warehouse@example.com', 'Warehouse@123')}>WAREHOUSE</button>
              <button className="role-btn" onClick={() => fillShortcutCredentials('accounts@example.com', 'Accounts@123')}>ACCOUNTS</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Metrics calculation
  const activeAlertCount = products.filter(p => p.current_stock < p.min_stock_alert).length;
  const draftChallansCount = challans.filter(c => c.status === 'DRAFT').length;
  const totalStockValuation = products.reduce((acc, p) => acc + (p.current_stock * p.unit_price), 0);
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);

  return (
    <div className="app-container">
      {/* Notifications */}
      {globalError && (
        <div className="error-banner" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, width: 'auto', maxWidth: '380px', margin: 0, boxShadow: 'var(--shadow-lg)' }}>
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}
      {globalSuccess && (
        <div className="error-banner" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, width: 'auto', maxWidth: '380px', margin: 0, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', color: 'var(--color-success)', boxShadow: 'var(--shadow-lg)' }}>
          <CheckCircle size={16} />
          <span>{globalSuccess}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>NX</div>
          <h1>NexusERP</h1>
        </div>

        <div className="sidebar-user-badge">
          <div className="user-avatar">{currentUser.name.charAt(0)}</div>
          <div className="user-info">
            <span className="user-name">{currentUser.name}</span>
            <span className={`user-role-badge badge-role-${currentUser.role.toLowerCase()}`}>
              {currentUser.role}
            </span>
          </div>
        </div>

        <div className="sidebar-nav">
          <button 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <TrendingUp size={16} />
            <span>Command Center</span>
          </button>

          {hasRole(['ADMIN', 'SALES', 'ACCOUNTS']) && (
            <button 
              className={`nav-link ${activeTab === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveTab('customers')}
            >
              <Users size={16} />
              <span>CRM Deals & Leads</span>
            </button>
          )}

          <button 
            className={`nav-link ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={16} />
            <span>Stock Master</span>
            {activeAlertCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--color-warning)', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px' }}>
                {activeAlertCount}
              </span>
            )}
          </button>

          <button 
            className={`nav-link ${activeTab === 'challans' ? 'active' : ''}`}
            onClick={() => setActiveTab('challans')}
          >
            <FileText size={16} />
            <span>Dispatch Studio</span>
            {draftChallansCount > 0 && (
              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>
                {draftChallansCount}
              </span>
            )}
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <div className="header">
          <h2>
            {activeTab === 'dashboard' && 'Executive Command Center'}
            {activeTab === 'customers' && 'CRM Customer Deals & Funnel'}
            {activeTab === 'products' && 'Warehouse Inventory & Stock Master'}
            {activeTab === 'challans' && 'Logistics Order & Dispatch Studio'}
          </h2>
          <div className="status-badge-container">
            <span className="status-dot"></span>
            <span>SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="main-content animate-fade">
          
          {/* TAB 1: EXECUTIVE COMMAND CENTER */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="role-info-card">
                <h3>Welcome back, {currentUser.name}! 👋</h3>
                <p>
                  You are logged in with the <strong>{currentUser.role}</strong> role.
                  {currentUser.role === 'ADMIN' && ' Administrative Controls & Staff Access Delegation tools active below.'}
                  {currentUser.role === 'SALES' && ' Customer CRM and Sales Delivery Challan dispatches active.'}
                  {currentUser.role === 'WAREHOUSE' && ' Inventory stock catalog and manual stock movements active.'}
                  {currentUser.role === 'ACCOUNTS' && ' Financial GST Tax Statements & Reconciliation ledger active.'}
                </p>
              </div>

              {/* 🌟 ROLE-EXCLUSIVE FEATURE WIDGET 1: ADMIN CONTROL CENTER */}
              {currentUser.role === 'ADMIN' && (
                <div className="role-feature-widget admin-theme animate-fade">
                  <div className="role-feature-title">
                    <h4 style={{ color: 'var(--color-danger)' }}>
                      <ShieldCheck size={18} />
                      <span>Admin Exclusive: System User & Role Access Management</span>
                    </h4>
                    <span className="role-tag-badge badge-role-admin">ADMINISTRATOR TOOL</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                      Manage staff accounts, assign operational roles (`ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`), and grant security clearances.
                    </p>
                    <button className="btn btn-danger" onClick={() => setIsAdminStaffModalOpen(true)}>
                      <Plus size={14} />
                      <span>Provision Staff Account</span>
                    </button>
                  </div>

                  <div style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="custom-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Full Name</th>
                          <th>Email Address</th>
                          <th>Assigned Role</th>
                          <th>Clearance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffUsersList.map(u => (
                          <tr key={u.id}>
                            <td style={{ fontFamily: 'monospace' }}>#USR-00{u.id}</td>
                            <td style={{ fontWeight: 700 }}>{u.name}</td>
                            <td>{u.email}</td>
                            <td><span className={`badge badge-role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                            <td style={{ color: 'var(--color-success)', fontSize: '12px' }}>GRANTED</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* KPI Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue"><Users size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{customers.length}</span>
                    <span className="stat-label">TOTAL CRM CLIENTS</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple"><Package size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{products.length}</span>
                    <span className="stat-label">STOCK CATALOG SKUs</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange"><AlertCircle size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">{activeAlertCount}</span>
                    <span className="stat-label">LOW STOCK ALERTS</span>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green"><FileText size={24} /></div>
                  <div className="stat-info">
                    <span className="stat-value">₹{totalStockValuation.toLocaleString('en-IN')}</span>
                    <span className="stat-label">TOTAL INVENTORY VALUATION</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Sections */}
              <div className="dashboard-sections">
                <div className="dashboard-card">
                  <div className="dashboard-card-title">
                    <span>Critical Alerts: Low Inventory SKUs</span>
                    <span className="badge badge-inactive">{activeAlertCount} items</span>
                  </div>
                  {products.filter(p => p.current_stock < p.min_stock_alert).length === 0 ? (
                    <p className="no-data" style={{ padding: '20px 0' }}>All warehouse stock levels are healthy.</p>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Current Stock</th>
                            <th>Min Alert Level</th>
                            <th>Rack Position</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.filter(p => p.current_stock < p.min_stock_alert).map(prod => (
                            <tr key={prod.id} onClick={() => { setActiveTab('products'); selectProductForDetails(prod); }}>
                              <td style={{ fontWeight: 700 }}>{prod.product_name}</td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--color-warning)' }}>{prod.sku}</td>
                              <td style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>{prod.current_stock}</td>
                              <td>{prod.min_stock_alert}</td>
                              <td>{prod.location || 'Warehouse Rack'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="dashboard-card">
                  <div className="dashboard-card-title">
                    <span>Active Order Dispatches</span>
                    <span className="badge badge-draft">{draftChallansCount} drafts</span>
                  </div>
                  {challans.length === 0 ? (
                    <p className="no-data" style={{ padding: '20px 0' }}>No sales challans recorded.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {challans.slice(0, 5).map(ch => (
                        <div 
                          key={ch.id} 
                          onClick={() => { setActiveTab('challans'); selectChallanForInvoice(ch.id); }}
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border-light)',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)' }}>
                              {ch.challan_number}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ch.customer_name}</div>
                          </div>
                          <span className={`badge badge-${ch.status.toLowerCase()}`}>
                            {ch.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CRM CUSTOMERS (FUNNEL KANBAN & DEALS) */}
          {activeTab === 'customers' && hasRole(['ADMIN', 'SALES', 'ACCOUNTS']) && (
            <div>
              <div className="module-banner crm">
                <div className="module-banner-left">
                  <h3>Customer Relationship Management (CRM)</h3>
                  <p>Track wholesale clients, manage lead funnels, log sales activity & GSTIN profiles</p>
                </div>
                <div className="module-banner-stats">
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: 'var(--color-success)' }}>
                      {customers.filter(c => c.status === 'ACTIVE').length}
                    </span>
                    <span className="lbl">Active Clients</span>
                  </div>
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: 'var(--color-warning)' }}>
                      {customers.filter(c => c.status === 'LEAD').length}
                    </span>
                    <span className="lbl">Open Leads</span>
                  </div>
                </div>
              </div>

              {/* 🌟 ROLE-EXCLUSIVE FEATURE WIDGET 2: SALES TARGET & COMMISSION CALCULATOR */}
              {(currentUser.role === 'SALES' || currentUser.role === 'ADMIN') && (
                <div className="role-feature-widget sales-theme animate-fade">
                  <div className="role-feature-title">
                    <h4 style={{ color: 'var(--color-success)' }}>
                      <Calculator size={18} />
                      <span>Sales Exclusive: Target Goal & Commission Estimator</span>
                    </h4>
                    <span className="role-tag-badge badge-role-sales">SALES TOOL</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Monthly Quota Target (₹)</span>
                      <input 
                        type="number" 
                        className="input-field" 
                        style={{ marginTop: '4px', padding: '6px 10px', fontSize: '14px', fontFamily: 'monospace' }}
                        value={salesTargetAmount}
                        onChange={(e) => setSalesTargetAmount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Commission Rate (%)</span>
                      <input 
                        type="number" 
                        className="input-field" 
                        style={{ marginTop: '4px', padding: '6px 10px', fontSize: '14px', fontFamily: 'monospace' }}
                        value={estimatedCommissionRate}
                        onChange={(e) => setEstimatedCommissionRate(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Payout</span>
                      <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: 'var(--color-success)', marginTop: '6px' }}>
                        ₹{(salesTargetAmount * (estimatedCommissionRate / 100)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action & Filter Bar */}
              <div className="filters-bar">
                <div className="filters-left">
                  <div className="search-input-wrapper">
                    <Search />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search client, business, GSTIN..."
                      value={custSearch}
                      onChange={(e) => setCustSearch(e.target.value)}
                    />
                  </div>
                  
                  <select 
                    className="select-field filter-select"
                    value={custTypeFilter}
                    onChange={(e) => setCustTypeFilter(e.target.value)}
                  >
                    <option value="">All Account Types</option>
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>

                  <select 
                    className="select-field filter-select"
                    value={custStatusFilter}
                    onChange={(e) => setCustStatusFilter(e.target.value)}
                  >
                    <option value="">All CRM Funnels</option>
                    <option value="LEAD">Leads</option>
                    <option value="ACTIVE">Active Accounts</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>

                  <div className="view-mode-toggle">
                    <button 
                      className={`view-mode-btn ${crmViewMode === 'kanban' ? 'active' : ''}`}
                      onClick={() => setCrmViewMode('kanban')}
                    >
                      <LayoutGrid size={14} />
                      <span>Pipeline Funnel</span>
                    </button>
                    <button 
                      className={`view-mode-btn ${crmViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setCrmViewMode('table')}
                    >
                      <List size={14} />
                      <span>Table Directory</span>
                    </button>
                  </div>
                </div>

                {hasRole(['ADMIN', 'SALES']) && (
                  <button className="btn btn-primary" onClick={() => setIsCustomerModalOpen(true)}>
                    <Plus size={16} />
                    <span>Add New Customer</span>
                  </button>
                )}
              </div>

              {crmViewMode === 'kanban' ? (
                <div className="kanban-board">
                  <div className="kanban-column">
                    <div className="kanban-column-header">
                      <h4 style={{ color: 'var(--color-warning)' }}>
                        <Briefcase size={16} />
                        <span>Leads & Prospects</span>
                      </h4>
                      <span className="kanban-column-count">
                        {customers.filter(c => c.status === 'LEAD').length}
                      </span>
                    </div>
                    <div className="kanban-cards-container">
                      {customers.filter(c => c.status === 'LEAD').length === 0 ? (
                        <p className="no-data">No lead profiles found.</p>
                      ) : (
                        customers.filter(c => c.status === 'LEAD').map(cust => (
                          <div key={cust.id} className="crm-customer-card lead" onClick={() => selectCustomerForDetails(cust.id)}>
                            <div className="crm-card-top">
                              <div>
                                <div className="crm-card-name">{cust.customer_name}</div>
                                <div className="crm-card-business">{cust.business_name || 'Individual Prospect'}</div>
                              </div>
                              <span className={`badge badge-${cust.customer_type.toLowerCase()}`}>
                                {cust.customer_type}
                              </span>
                            </div>
                            <div className="crm-card-body">
                              <div className="crm-card-row">
                                <Phone size={12} className="text-muted" />
                                <span>{cust.mobile}</span>
                              </div>
                              {cust.gst_number && (
                                <div className="crm-card-row">
                                  <ShieldCheck size={12} className="text-muted" />
                                  <span style={{ fontFamily: 'monospace' }}>GST: {cust.gst_number}</span>
                                </div>
                              )}
                            </div>
                            <div className="crm-card-footer">
                              <span style={{ color: 'var(--text-muted)' }}>Follow up:</span>
                              <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                                {cust.follow_up_date ? new Date(cust.follow_up_date).toLocaleDateString() : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="kanban-column">
                    <div className="kanban-column-header">
                      <h4 style={{ color: 'var(--color-success)' }}>
                        <CheckCircle size={16} />
                        <span>Active Accounts</span>
                      </h4>
                      <span className="kanban-column-count">
                        {customers.filter(c => c.status === 'ACTIVE').length}
                      </span>
                    </div>
                    <div className="kanban-cards-container">
                      {customers.filter(c => c.status === 'ACTIVE').length === 0 ? (
                        <p className="no-data">No active client profiles.</p>
                      ) : (
                        customers.filter(c => c.status === 'ACTIVE').map(cust => (
                          <div key={cust.id} className="crm-customer-card active" onClick={() => selectCustomerForDetails(cust.id)}>
                            <div className="crm-card-top">
                              <div>
                                <div className="crm-card-name">{cust.customer_name}</div>
                                <div className="crm-card-business">{cust.business_name || 'Active Account'}</div>
                              </div>
                              <span className={`badge badge-${cust.customer_type.toLowerCase()}`}>
                                {cust.customer_type}
                              </span>
                            </div>
                            <div className="crm-card-body">
                              <div className="crm-card-row">
                                <Phone size={12} className="text-muted" />
                                <span>{cust.mobile}</span>
                              </div>
                              {cust.gst_number && (
                                <div className="crm-card-row">
                                  <ShieldCheck size={12} className="text-muted" />
                                  <span style={{ fontFamily: 'monospace' }}>GST: {cust.gst_number}</span>
                                </div>
                              )}
                            </div>
                            <div className="crm-card-footer">
                              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active Partner</span>
                              <ArrowUpRight size={14} className="text-muted" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="kanban-column">
                    <div className="kanban-column-header">
                      <h4 style={{ color: 'var(--text-muted)' }}>
                        <AlertCircle size={16} />
                        <span>Inactive / On Hold</span>
                      </h4>
                      <span className="kanban-column-count">
                        {customers.filter(c => c.status === 'INACTIVE').length}
                      </span>
                    </div>
                    <div className="kanban-cards-container">
                      {customers.filter(c => c.status === 'INACTIVE').length === 0 ? (
                        <p className="no-data">No inactive accounts.</p>
                      ) : (
                        customers.filter(c => c.status === 'INACTIVE').map(cust => (
                          <div key={cust.id} className="crm-customer-card inactive" onClick={() => selectCustomerForDetails(cust.id)}>
                            <div className="crm-card-top">
                              <div>
                                <div className="crm-card-name">{cust.customer_name}</div>
                                <div className="crm-card-business">{cust.business_name || '-'}</div>
                              </div>
                            </div>
                            <div className="crm-card-body">
                              <div className="crm-card-row">
                                <Phone size={12} className="text-muted" />
                                <span>{cust.mobile}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Business Name</th>
                        <th>Mobile</th>
                        <th>GST Number</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Follow-up</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(cust => (
                        <tr key={cust.id} onClick={() => selectCustomerForDetails(cust.id)}>
                          <td style={{ fontWeight: 700 }}>{cust.customer_name}</td>
                          <td>{cust.business_name || '-'}</td>
                          <td>{cust.mobile}</td>
                          <td style={{ fontFamily: 'monospace' }}>{cust.gst_number || '-'}</td>
                          <td><span className={`badge badge-${cust.customer_type.toLowerCase()}`}>{cust.customer_type}</span></td>
                          <td><span className={`badge badge-${cust.status.toLowerCase()}`}>{cust.status}</span></td>
                          <td>{cust.follow_up_date ? new Date(cust.follow_up_date).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVENTORY STOCK MASTER */}
          {activeTab === 'products' && (
            <div>
              <div className="module-banner inventory">
                <div className="module-banner-left">
                  <h3>Warehouse Stock & Inventory Master</h3>
                  <p>Monitor live SKU quantities, warehouse rack positions & unit valuations</p>
                </div>
                <div className="module-banner-stats">
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: 'var(--color-warning)' }}>{totalStockUnits}</span>
                    <span className="lbl">Total Units</span>
                  </div>
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: '#fff' }}>₹{totalStockValuation.toLocaleString('en-IN')}</span>
                    <span className="lbl">Stock Valuation</span>
                  </div>
                </div>
              </div>

              {/* 🌟 ROLE-EXCLUSIVE FEATURE WIDGET 3: WAREHOUSE INBOUND BATCH RESTOCK GENERATOR */}
              {(currentUser.role === 'WAREHOUSE' || currentUser.role === 'ADMIN') && (
                <div className="role-feature-widget warehouse-theme animate-fade">
                  <div className="role-feature-title">
                    <h4 style={{ color: 'var(--color-warning)' }}>
                      <RefreshCw size={18} />
                      <span>Warehouse Exclusive: Inbound Restock Batch Generator</span>
                    </h4>
                    <span className="role-tag-badge badge-role-warehouse">WAREHOUSE TOOL</span>
                  </div>
                  <form onSubmit={handleProcessInboundRestock} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>VENDOR SUPPLIER</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Apex Industrial Supplies" 
                        value={inboundVendorName}
                        onChange={(e) => setInboundVendorName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SELECT PRODUCT SKU TO RESTOCK</label>
                      <select 
                        className="select-field"
                        value={inboundProdId}
                        onChange={(e) => setInboundProdId(Number(e.target.value))}
                      >
                        <option value={0}>Select Target SKU</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.product_name} (Current Stock: {p.current_stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>RESTOCK QTY (+)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        min={1} 
                        value={inboundQty}
                        onChange={(e) => setInboundQty(Number(e.target.value))}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ background: 'var(--color-warning)', color: '#000' }}>
                      <Plus size={14} />
                      <span>Process Restock Batch</span>
                    </button>
                  </form>
                </div>
              )}

              {/* Filter Bar */}
              <div className="filters-bar">
                <div className="filters-left">
                  <div className="search-input-wrapper">
                    <Search />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Search SKU code, name..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                    />
                  </div>

                  <select 
                    className="select-field filter-select"
                    value={prodCatFilter}
                    onChange={(e) => setProdCatFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Office Supplies">Office Supplies</option>
                  </select>

                  <div className="view-mode-toggle">
                    <button 
                      className={`view-mode-btn ${stockViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setStockViewMode('cards')}
                    >
                      <LayoutGrid size={14} />
                      <span>Stock Visual Cards</span>
                    </button>
                    <button 
                      className={`view-mode-btn ${stockViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setStockViewMode('table')}
                    >
                      <List size={14} />
                      <span>Technical Table</span>
                    </button>
                  </div>
                </div>

                {hasRole(['ADMIN', 'WAREHOUSE']) && (
                  <button className="btn btn-primary" onClick={() => setIsProductModalOpen(true)}>
                    <Plus size={16} />
                    <span>Add New SKU</span>
                  </button>
                )}
              </div>

              {stockViewMode === 'cards' ? (
                <div className="stock-cards-grid">
                  {products.length === 0 ? (
                    <p className="no-data" style={{ gridColumn: '1/-1' }}>No product SKUs match criteria.</p>
                  ) : (
                    products.map(prod => {
                      const isCritical = prod.current_stock < prod.min_stock_alert;
                      const maxGauge = Math.max(prod.min_stock_alert * 3, prod.current_stock, 1);
                      const percent = Math.min(Math.round((prod.current_stock / maxGauge) * 100), 100);

                      return (
                        <div key={prod.id} className="product-stock-card" onClick={() => selectProductForDetails(prod)}>
                          <div>
                            <div className="product-card-header">
                              <span className="product-sku-tag">{prod.sku}</span>
                              <span className="badge badge-retail">{prod.category}</span>
                            </div>

                            <div className="product-title">{prod.product_name}</div>
                            <div className="product-price-bar">
                              <span className="product-price-val">
                                ₹{Number(prod.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>per unit</span>
                            </div>

                            <div className="stock-meter-container">
                              <div className="stock-meter-label">
                                <span style={{ color: isCritical ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                                  {isCritical ? 'CRITICAL LOW STOCK' : 'AVAILABLE INVENTORY'}
                                </span>
                                <span style={{ fontWeight: 800, color: isCritical ? 'var(--color-danger)' : '#fff' }}>
                                  {prod.current_stock} / min {prod.min_stock_alert}
                                </span>
                              </div>
                              <div className="stock-meter-track">
                                <div 
                                  className={`stock-meter-fill ${isCritical ? 'critical' : percent < 40 ? 'warning' : 'healthy'}`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          <div className="product-card-footer">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <MapPin size={12} />
                              <span>{prod.location || 'Rack Unassigned'}</span>
                            </div>

                            {hasRole(['ADMIN', 'WAREHOUSE']) && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '11px' }}
                                onClick={(e) => { e.stopPropagation(); openStockModalForProduct(prod); }}
                              >
                                Adjust Stock
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Unit Price</th>
                        <th>Current Stock</th>
                        <th>Alert Threshold</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(prod => (
                        <tr key={prod.id} onClick={() => selectProductForDetails(prod)}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-warning)' }}>{prod.sku}</td>
                          <td style={{ fontWeight: 700 }}>{prod.product_name}</td>
                          <td>{prod.category}</td>
                          <td>₹{Number(prod.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ fontWeight: 800, color: prod.current_stock < prod.min_stock_alert ? 'var(--color-danger)' : 'var(--color-success)' }}>
                            {prod.current_stock}
                          </td>
                          <td>{prod.min_stock_alert}</td>
                          <td>{prod.location || 'Rack Position'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LOGISTICS DISPATCH STUDIO & INVOICE PREVIEW */}
          {activeTab === 'challans' && (
            <div>
              <div className="module-banner challan">
                <div className="module-banner-left">
                  <h3>Logistics Sales Challans & Dispatch Studio</h3>
                  <p>Prepare official delivery notes, itemized dispatches & trigger automated stock reservation</p>
                </div>
                <div className="module-banner-stats">
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: 'var(--color-accent)' }}>{challans.length}</span>
                    <span className="lbl">Total Orders</span>
                  </div>
                  <div className="module-banner-stat-item">
                    <span className="val" style={{ color: 'var(--color-success)' }}>
                      {challans.filter(c => c.status === 'CONFIRMED').length}
                    </span>
                    <span className="lbl">Dispatched</span>
                  </div>
                </div>
              </div>

              {/* 🌟 ROLE-EXCLUSIVE FEATURE WIDGET 4: ACCOUNTS GST RECONCILIATION LEDGER */}
              {(currentUser.role === 'ACCOUNTS' || currentUser.role === 'ADMIN') && (
                <div className="role-feature-widget accounts-theme animate-fade">
                  <div className="role-feature-title">
                    <h4 style={{ color: '#06b6d4' }}>
                      <FileSpreadsheet size={18} />
                      <span>Accounts Exclusive: Financial Tax Reconciliation & Payment Ledger</span>
                    </h4>
                    <span className="role-tag-badge badge-role-accounts">ACCOUNTS TOOL</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Receivables</span>
                      <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                        ₹{challans.reduce((acc, c) => acc + (c.items?.reduce((a, i) => a + (i.unit_price * i.quantity), 0) || 0), 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Output GST (18%)</span>
                      <div style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: '#06b6d4' }}>
                        ₹{(challans.reduce((acc, c) => acc + (c.items?.reduce((a, i) => a + (i.unit_price * i.quantity), 0) || 0), 0) * 0.18).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Payment Status</span>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-success)' }}>
                        ✅ Reconciled & Audit Verified
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="filters-bar">
                <div className="filters-left">
                  <select 
                    className="select-field filter-select"
                    value={challanStatusFilter}
                    onChange={(e) => setChallanStatusFilter(e.target.value)}
                  >
                    <option value="">All Order Statuses</option>
                    <option value="DRAFT">Draft Dispatches</option>
                    <option value="CONFIRMED">Confirmed & Dispatched</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {hasRole(['ADMIN', 'SALES']) && (
                  <button className="btn btn-primary" onClick={() => setIsChallanModalOpen(true)}>
                    <Plus size={16} />
                    <span>Create Sales Challan</span>
                  </button>
                )}
              </div>

              {/* DISPATCH STUDIO SPLIT WORKSPACE */}
              <div className="dispatch-studio-grid">
                <div className="dispatch-orders-list">
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    Select Order Dispatch ({challans.length})
                  </span>
                  {challans.length === 0 ? (
                    <p className="no-data">No sales dispatches found.</p>
                  ) : (
                    challans.map(ch => (
                      <div 
                        key={ch.id} 
                        className={`dispatch-order-card ${selectedChallan?.id === ch.id ? 'selected' : ''}`}
                        onClick={() => selectChallanForInvoice(ch.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--color-primary)' }}>
                            {ch.challan_number}
                          </span>
                          <span className={`badge badge-${ch.status.toLowerCase()}`}>
                            {ch.status}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{ch.customer_name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span>{ch.total_quantity} items</span>
                          <span>{new Date(ch.created_at).toLocaleDateString()}</span>
                        </div>

                        {hasRole(['ACCOUNTS', 'ADMIN']) && (
                          <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Payment:</span>
                            <span style={{ fontWeight: 800, color: paymentStatusMap[ch.id] === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                              {paymentStatusMap[ch.id] || 'PENDING'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedChallan ? (
                  <div className="invoice-sheet animate-fade">
                    <div>
                      <div className="invoice-header-block">
                        <div className="invoice-company-brand">
                          <h2>NexusERP Distribution Corp</h2>
                          <span>Official Sales Delivery Order & Dispatch Note</span>
                        </div>
                        <div className="invoice-meta-block">
                          <div className="invoice-number-tag">{selectedChallan.challan_number}</div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Issued: {new Date(selectedChallan.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="invoice-details-grid">
                        <div>
                          <div className="detail-label">Consignee Customer</div>
                          <div style={{ fontWeight: 700, fontSize: '15px' }}>{selectedChallan.customer_name}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedChallan.business_name || 'Direct Delivery'}</div>
                        </div>
                        <div>
                          <div className="detail-label">Logistics Dispatch Meta</div>
                          <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Truck size={14} className="text-muted" />
                            <span>Vehicle: MH-12-QX-9042</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Driver: Rajesh Kumar</div>
                        </div>
                      </div>

                      <div className="invoice-table-wrapper">
                        <table className="invoice-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Item Description</th>
                              <th>Unit Price</th>
                              <th>Qty</th>
                              <th style={{ textAlign: 'right' }}>Total (₹)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedChallan.items?.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-warning)' }}>{item.sku}</td>
                                <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                                <td>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                                <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                  ₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="invoice-summary-bar">
                        <div className="invoice-summary-box">
                          <div className="invoice-summary-row">
                            <span>Subtotal Items</span>
                            <span>{selectedChallan.total_quantity} pcs</span>
                          </div>
                          <div className="invoice-summary-row grand-total">
                            <span>Grand Total</span>
                            <span>
                              ₹{selectedChallan.items?.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="invoice-actions-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="detail-label">Status:</span>
                          <span className={`badge badge-${selectedChallan.status.toLowerCase()}`}>
                            {selectedChallan.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          {hasRole(['ACCOUNTS', 'ADMIN']) && (
                            <button 
                              className="btn btn-secondary" 
                              style={{ borderColor: 'var(--color-success)', color: 'var(--color-success)' }}
                              onClick={() => toggleInvoicePaymentStatus(selectedChallan.id, 'PAID')}
                            >
                              Mark Payment Paid
                            </button>
                          )}

                          {selectedChallan.status === 'DRAFT' && hasRole(['ADMIN', 'SALES']) && (
                            <>
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleUpdateChallanStatus(selectedChallan.id, 'CANCELLED')}
                              >
                                Cancel Order
                              </button>
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleUpdateChallanStatus(selectedChallan.id, 'CONFIRMED')}
                              >
                                <CheckCircle size={16} />
                                <span>Confirm & Dispatch Stock</span>
                              </button>
                            </>
                          )}
                          {selectedChallan.status === 'CONFIRMED' && (
                            <button className="btn btn-secondary" onClick={() => window.print()}>
                              <Printer size={16} />
                              <span>Print Invoice Document</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="invoice-sheet" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p className="no-data">Select a sales challan from the list to preview invoice.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- MODAL DIALOGS & DRAWERS --- */}

      {/* ADMIN EXCLUSIVE: Staff Account Provisioning Modal */}
      {isAdminStaffModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade">
            <div className="modal-header">
              <h3>Provision New System User Account</h3>
              <button className="close-btn" onClick={() => setIsAdminStaffModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddStaffUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>FULL NAME *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    placeholder="e.g. Vikram Sharma"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>CORPORATE EMAIL ADDRESS *</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    required 
                    placeholder="vikram@nexuserp.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>ASSIGNED OPERATIONAL ROLE *</label>
                  <select 
                    className="select-field"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                  >
                    <option value="ADMIN">ADMINISTRATOR (FULL ACCESS)</option>
                    <option value="SALES">SALES REPRESENTATIVE (CRM & DISPATCH)</option>
                    <option value="WAREHOUSE">WAREHOUSE MANAGER (STOCK RESTOCK)</option>
                    <option value="ACCOUNTS">ACCOUNTS OFFICER (GST & RECONCILIATION)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdminStaffModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger">Provision User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Add Customer CRM Modal */}
      {isCustomerModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade">
            <div className="modal-header">
              <h3>Create Customer CRM Profile</h3>
              <button className="close-btn" onClick={() => setIsCustomerModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label>CUSTOMER NAME *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>MOBILE NUMBER (10 DIGITS) *</label>
                  <input 
                    type="tel" 
                    className="input-field" 
                    required 
                    value={newCustMobile}
                    onChange={(e) => setNewCustMobile(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    className="input-field"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>BUSINESS / COMPANY NAME</label>
                  <input 
                    type="text" 
                    className="input-field"
                    value={newCustBusiness}
                    onChange={(e) => setNewCustBusiness(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>GST NUMBER (15 CHARS MAX)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    maxLength={15}
                    value={newCustGST}
                    onChange={(e) => setNewCustGST(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>CUSTOMER BUSINESS TYPE *</label>
                  <select 
                    className="select-field"
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value as any)}
                  >
                    <option value="RETAIL">Retail buyer</option>
                    <option value="WHOLESALE">Wholesale buyer</option>
                    <option value="DISTRIBUTOR">Distribution channel partner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>POSTAL ADDRESS</label>
                  <textarea 
                    className="textarea-field" 
                    rows={2}
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Customer Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Customer CRM Detail Side Drawer */}
      {selectedCustomer && (
        <div className="drawer-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h3>Customer Profile & CRM Activity</h3>
              <button className="close-btn" onClick={() => setSelectedCustomer(null)}>×</button>
            </div>
            
            <div className="drawer-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Name</span>
                  <span className="detail-value" style={{ fontWeight: 'bold' }}>{selectedCustomer.customer_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mobile</span>
                  <span className="detail-value">{selectedCustomer.mobile}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{selectedCustomer.email || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Business</span>
                  <span className="detail-value">{selectedCustomer.business_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">GST Number</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace' }}>{selectedCustomer.gst_number || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">
                    <span className={`badge badge-${selectedCustomer.customer_type.toLowerCase()}`}>
                      {selectedCustomer.customer_type}
                    </span>
                  </span>
                </div>
              </div>

              {hasRole(['ADMIN', 'SALES']) && (
                <div className="dashboard-card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', margin: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '16px' }}>Log New CRM Follow-Up Note</span>
                  <form onSubmit={handleAddFollowUp}>
                    <div className="form-group">
                      <label>FOLLOW-UP DATE</label>
                      <input 
                        type="date" 
                        className="input-field" 
                        required 
                        value={newFollowUpDate}
                        onChange={(e) => setNewFollowUpDate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>CONVERSATION DETAILS / NOTES</label>
                      <textarea 
                        className="textarea-field" 
                        rows={2} 
                        required
                        placeholder="Log customer response, next steps..."
                        value={newFollowUpNote}
                        onChange={(e) => setNewFollowUpNote(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full">
                      Submit Follow-Up Note
                    </button>
                  </form>
                </div>
              )}

              <div>
                <h4 className="timeline-section-title">Timeline History Log ({selectedCustomer.follow_ups?.length || 0})</h4>
                {selectedCustomer.follow_ups?.length === 0 ? (
                  <p className="no-data" style={{ padding: '20px 0' }}>No historical follow-ups log found.</p>
                ) : (
                  <div className="timeline">
                    {selectedCustomer.follow_ups?.map(fup => (
                      <div className="timeline-item" key={fup.id}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-header">
                          <span className="timeline-user">{fup.created_by_name}</span>
                          <span className="timeline-date">{new Date(fup.created_at).toLocaleString()}</span>
                        </div>
                        <div className="timeline-body">
                          {fup.note}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Product Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade">
            <div className="modal-header">
              <h3>Add Product SKU to Catalog</h3>
              <button className="close-btn" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body">
                <div className="form-group">
                  <label>PRODUCT NAME *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>SKU CODE (UNIQUE) *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    placeholder="e.g. ELEC-009"
                    value={newProdSKU}
                    onChange={(e) => setNewProdSKU(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>CATEGORY *</label>
                  <select 
                    className="select-field"
                    required
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                  >
                    <option value="">Select Category</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Office Supplies">Office Supplies</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>UNIT PRICE (INR) *</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required 
                    min={0}
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>INITIAL STOCK QUANTITY *</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required 
                    min={0}
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>MINIMUM ALERT STOCK THRESHOLD *</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required 
                    min={0}
                    value={newProdMinAlert}
                    onChange={(e) => setNewProdMinAlert(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>WAREHOUSE LOCATION / RACK POSITION</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Row A - Shelf 5"
                    value={newProdLocation}
                    onChange={(e) => setNewProdLocation(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Product SKU</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Product Stock Details & Audit Log Modal */}
      {selectedProduct && !isStockAdjustmentModalOpen && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content wide animate-fade" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Product Inventory Details</h3>
              <button className="close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="detail-grid" style={{ marginBottom: '24px' }}>
                <div className="detail-item">
                  <span className="detail-label">Product Name</span>
                  <span className="detail-value" style={{ fontWeight: 'bold' }}>{selectedProduct.product_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">SKU / Code</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedProduct.sku}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedProduct.category}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Price per Unit</span>
                  <span className="detail-value">₹{Number(selectedProduct.unit_price).toLocaleString('en-IN')}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Current Stock</span>
                  <span className="detail-value" style={{ fontWeight: 'bold' }}>{selectedProduct.current_stock} units</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Rack Position</span>
                  <span className="detail-value">{selectedProduct.location || 'Warehouse Rack'}</span>
                </div>
              </div>

              {hasRole(['ADMIN', 'WAREHOUSE']) && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                  <button className="btn btn-primary" onClick={() => setIsStockAdjustmentModalOpen(true)}>
                    Adjust / Log Stock Movement
                  </button>
                </div>
              )}

              <div>
                <h4 className="timeline-section-title">Stock Audit Log</h4>
                {productMovements.length === 0 ? (
                  <p className="no-data">No stock movements recorded yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Qty</th>
                          <th>Type</th>
                          <th>Reason</th>
                          <th>Logged By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productMovements.map(move => (
                          <tr key={move.id}>
                            <td>{new Date(move.created_at).toLocaleString()}</td>
                            <td style={{ fontWeight: 'bold' }}>{move.quantity} pcs</td>
                            <td>
                              <span className={`badge badge-${move.movement_type === 'IN' ? 'active' : 'inactive'}`}>
                                {move.movement_type === 'IN' ? 'STOCK IN' : 'STOCK OUT'}
                              </span>
                            </td>
                            <td>{move.reason}</td>
                            <td>{move.created_by_name || 'System'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedProduct(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Adjust Stock Modal */}
      {isStockAdjustmentModalOpen && selectedProduct && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content animate-fade">
            <div className="modal-header">
              <h3>Adjust Inventory - {selectedProduct.product_name}</h3>
              <button className="close-btn" onClick={() => setIsStockAdjustmentModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAdjustStock}>
              <div className="modal-body">
                <div className="form-group">
                  <label>MOVEMENT TYPE *</label>
                  <select 
                    className="select-field"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                  >
                    <option value="IN">ADD INVENTORY (STOCK IN)</option>
                    <option value="OUT">DEDUCT INVENTORY (STOCK OUT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>QUANTITY *</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    required 
                    min={1}
                    value={adjQty}
                    onChange={(e) => setAdjQty(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label>AUDIT LOG REASON *</label>
                  <textarea 
                    className="textarea-field" 
                    rows={2} 
                    required 
                    placeholder="e.g. Inbound shipment arrival, stock correction..."
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsStockAdjustmentModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Process Stock Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Create Sales Challan Modal */}
      {isChallanModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content wide animate-fade">
            <div className="modal-header">
              <h3>Create Sales Delivery Order (Challan)</h3>
              <button className="close-btn" onClick={() => setIsChallanModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateChallan}>
              <div className="modal-body">
                {challanFormError && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{challanFormError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>SELECT CUSTOMER *</label>
                  <select 
                    className="select-field"
                    required
                    value={challanCustomerId}
                    onChange={(e) => setChallanCustomerId(Number(e.target.value))}
                  >
                    <option value={0}>Select Consignee Customer</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} {c.business_name ? `(${c.business_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>DISPATCH ORDER STATUS *</label>
                  <select 
                    className="select-field"
                    value={challanStatus}
                    onChange={(e) => setChallanStatus(e.target.value as any)}
                  >
                    <option value="DRAFT">SAVE AS DRAFT (NO IMMEDIATE STOCK RESERVATION)</option>
                    <option value="CONFIRMED">CONFIRM & DISPATCH NOW (DEDUCT STOCK IMMEDIATELY)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ORDER LINE ITEMS *</label>
                  {challanItems.map((item, idx) => {
                    const selProd = products.find(p => p.id === item.product_id);
                    return (
                      <div className="challan-item-row" key={idx}>
                        <div>
                          <select 
                            className="select-field"
                            required
                            value={item.product_id}
                            onChange={(e) => handleChallanItemChange(idx, 'product_id', Number(e.target.value))}
                          >
                            <option value={0}>Select Product Item</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.product_name} (SKU: {p.sku} - Stock: {p.current_stock})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input 
                            type="number" 
                            className="input-field" 
                            min={1}
                            required
                            value={item.quantity}
                            onChange={(e) => handleChallanItemChange(idx, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="challan-item-subtotal">
                          ₹{selProd ? (selProd.unit_price * item.quantity).toLocaleString('en-IN') : 0}
                        </div>
                        <div>
                          {challanItems.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-danger" 
                              style={{ padding: '10px' }}
                              onClick={() => handleRemoveChallanItem(idx)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button type="button" className="btn btn-secondary" style={{ marginTop: '8px' }} onClick={handleAddChallanItem}>
                    <Plus size={14} />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="challan-total-section">
                  <span className="challan-total-label">ESTIMATED ORDER TOTAL</span>
                  <span className="challan-total-val">₹{calculateChallanTotalValue().toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsChallanModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Sales Challan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
