import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import AdminNotifications from '../components/AdminNotifications';
import {
  CheckCircle, XCircle, Package, Users, AlertCircle, ShoppingCart, BarChart3,
  UserCheck, LogOut, Ban, Trash2, Eye, X, TrendingUp, DollarSign, ShoppingBag,
  UserPlus, PackageCheck, Clock, AlertTriangle, RefreshCw, Activity, Heart,
  ArrowUpRight, ArrowDownRight, Warehouse
} from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUtils';
import Button from '../components/Button';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  fetchKPIs, fetchOrdersTrend, fetchCategorySales, fetchTopSellers,
  fetchTopProducts, fetchReturnStats, fetchPlatformHealth
} from '../services/stats';

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const startValue = 0;
    const endValue = typeof value === 'number' ? value : parseFloat(value) || 0;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const current = startValue + (endValue - startValue) * progress;
      setCount(Math.floor(current));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  if (typeof value === 'number' && value % 1 !== 0) {
    return value.toFixed(2);
  }
  return count.toLocaleString();
}

// KPI Card Component
function KPICard({ title, value, icon: Icon, subtitle, trend, color = 'blue', onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white border-2 rounded-lg p-6 shadow-sm transition-all ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' : 'hover:shadow-md'
      } ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color].replace('50', '100')}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-neutral-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-neutral-900">
        {typeof value === 'number' && value < 1000 ? (
          <AnimatedCounter value={value} />
        ) : typeof value === 'string' && value.startsWith('₹') ? (
          `₹${parseFloat(value.slice(1)).toLocaleString()}`
        ) : (
          <AnimatedCounter value={value} />
        )}
      </p>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-2">{subtitle}</p>
      )}
    </div>
  );
}

// Skeleton Loader
function SkeletonCard() {
  return (
    <div className="bg-white border-2 border-neutral-200 rounded-lg p-6 animate-pulse">
      <div className="h-8 bg-neutral-200 rounded w-3/4 mb-4"></div>
      <div className="h-12 bg-neutral-200 rounded w-1/2"></div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [usersCount, setUsersCount] = useState(0);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [ordersTrend, setOrdersTrend] = useState([]);
  const [categorySales, setCategorySales] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [returnStats, setReturnStats] = useState(null);
  const [platformHealth, setPlatformHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  const handleViewOrderDetails = async (orderId) => {
    setSelectedOrder(orderId);
    setLoadingOrderDetails(true);
    try {
      const { data } = await API.get(`/admin/orders/${orderId}`);
      setOrderDetails(data);
      
      // Fetch product details for each order item using admin endpoint
      if (data.order_items && data.order_items.length > 0) {
        const productPromises = data.order_items.map(item => 
          API.get(`/admin/products/${item.product_id}`).catch(() => null)
        );
        const productResponses = await Promise.all(productPromises);
        const products = productResponses
          .filter(res => res !== null)
          .map(res => res.data);
        
        // Merge product details with order items
        const enrichedOrderItems = data.order_items.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return { ...item, product };
        });
        
        setOrderDetails({ ...data, order_items: enrichedOrderItems });
      }
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to fetch order details');
      setSelectedOrder(null);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchAllData();
    // Always fetch navigation counts regardless of active tab
    fetchNavigationCounts();
  }, [user, activeTab, navigate]);

  // Fetch counts for navigation bar - always called regardless of active tab
  const fetchNavigationCounts = async () => {
    try {
      // Fetch all counts concurrently
      const [usersRes, sellersRes, pendingProductsRes, ordersRes] = await Promise.all([
        API.get('/admin/users').catch(() => ({ data: [] })),
        API.get('/admin/sellers').catch(() => ({ data: [] })),
        API.get('/admin/products/pending').catch(() => ({ data: [] })),
        API.get('/admin/orders').catch(() => ({ data: [] }))
      ]);

      setUsersCount(usersRes.data?.length || 0);
      setSellers(sellersRes.data || []);
      setPendingProducts(pendingProductsRes.data || []);
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error('Error fetching navigation counts:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'stats') {
        // Fetch all analytics concurrently
        const [
          kpisRes,
          ordersTrendRes,
          categorySalesRes,
          topSellersRes,
          topProductsRes,
          returnStatsRes,
          platformHealthRes
        ] = await Promise.all([
          fetchKPIs().catch(e => ({ data: null, error: e })),
          fetchOrdersTrend(30).catch(e => ({ data: [], error: e })),
          fetchCategorySales().catch(e => ({ data: [], error: e })),
          fetchTopSellers(10).catch(e => ({ data: [], error: e })),
          fetchTopProducts(10).catch(e => ({ data: [], error: e })),
          fetchReturnStats(30).catch(e => ({ data: null, error: e })),
          fetchPlatformHealth().catch(e => ({ data: null, error: e }))
        ]);

        if (kpisRes.data) setKpis(kpisRes.data);
        if (ordersTrendRes.data) setOrdersTrend(ordersTrendRes.data);
        if (categorySalesRes.data) setCategorySales(categorySalesRes.data);
        if (topSellersRes.data) setTopSellers(topSellersRes.data);
        if (topProductsRes.data) setTopProducts(topProductsRes.data);
        if (returnStatsRes.data) setReturnStats(returnStatsRes.data);
        if (platformHealthRes.data) setPlatformHealth(platformHealthRes.data);
      } else if (activeTab === 'sellers') {
        const { data } = await API.get('/admin/sellers');
        setSellers(data || []);
      } else if (activeTab === 'products') {
        const { data } = await API.get('/admin/products/pending');
        setPendingProducts(data || []);
      } else if (activeTab === 'orders') {
        const { data } = await API.get('/admin/orders');
        setOrders(data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err?.response?.data?.detail || 'Failed to fetch data');
      if (err?.response?.status === 403) {
        alert('Admin access required');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSeller = async (userId) => {
    try {
      await API.post(`/admin/sellers/approve/${userId}`);
      alert('Seller approved successfully');
      fetchAllData();
      fetchNavigationCounts(); // Refresh navigation counts
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to approve seller');
    }
  };

  const handleRejectSeller = async (userId) => {
    if (!confirm('Are you sure you want to reject this seller?')) return;
    try {
      await API.post(`/admin/sellers/reject/${userId}`);
      alert('Seller rejected');
      fetchAllData();
      fetchNavigationCounts(); // Refresh navigation counts
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to reject seller');
    }
  };

  const handleVerifyProduct = async (productId) => {
    try {
      await API.post(`/admin/products/verify/${productId}`);
      alert('Product verified successfully');
      fetchAllData();
      fetchNavigationCounts(); // Refresh navigation counts
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to verify product');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading && !kpis && activeTab === 'stats') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto mb-4"></div>
          <div className="text-neutral-600 text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">Admin Dashboard</h1>
            <p className="text-neutral-600">Welcome back, {user?.username}</p>
          </div>
          <div className="flex items-center gap-3">
            <AdminNotifications />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors bg-white border border-neutral-300 rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-neutral-300 overflow-x-auto bg-white rounded-t-lg">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Statistics
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/sellers')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              window.location.pathname === '/admin/sellers'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Sellers ({sellers.length})
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/products/pending')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              window.location.pathname === '/admin/products/pending'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pending Products ({pendingProducts.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Orders ({orders.length})
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              window.location.pathname === '/admin/users'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              All Users ({usersCount})
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/inventory')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              window.location.pathname === '/admin/inventory'
                ? 'border-b-2 border-neutral-900 text-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Inventory
            </div>
          </button>
        </div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* KPI Cards - Row 1: Platform Overview */}
            <div>
              <h2 className="text-xl font-serif text-neutral-900 mb-4">Platform Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : kpis ? (
                  <>
                    <KPICard
                      title="Total Users"
                      value={kpis.total_users}
                      icon={Users}
                      subtitle={`${kpis.total_sellers} sellers, ${kpis.total_users - kpis.total_sellers} customers`}
                      color="blue"
                      onClick={() => navigate('/admin/users')}
                    />
                    <KPICard
                      title="Total Sellers"
                      value={kpis.total_sellers}
                      icon={UserCheck}
                      subtitle={`${kpis.total_verified_sellers} verified`}
                      color="indigo"
                      onClick={() => navigate('/admin/sellers')}
                    />
                    <KPICard
                      title="Pending Approvals"
                      value={kpis.pending_seller_approvals}
                      icon={Clock}
                      subtitle="Sellers awaiting approval"
                      color="yellow"
                      onClick={() => navigate('/admin/sellers?filter=pending')}
                    />
                    <KPICard
                      title="Verified Sellers"
                      value={kpis.total_verified_sellers}
                      icon={CheckCircle}
                      subtitle="Active and verified"
                      color="green"
                      onClick={() => navigate('/admin/sellers?filter=approved')}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/* KPI Cards - Row 2: Catalog Health */}
            <div>
              <h2 className="text-xl font-serif text-neutral-900 mb-4">Catalog Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : kpis ? (
                  <>
                    <KPICard
                      title="Total Products"
                      value={kpis.total_products}
                      icon={Package}
                      subtitle={`${kpis.verified_products} verified`}
                      color="blue"
                      onClick={() => navigate('/admin/products')}
                    />
                    <KPICard
                      title="Verified Products"
                      value={kpis.verified_products}
                      icon={PackageCheck}
                      subtitle="Ready for sale"
                      color="green"
                      onClick={() => navigate('/admin/products?filter=Approved')}
                    />
                    <KPICard
                      title="Pending Verifications"
                      value={kpis.pending_product_verifications}
                      icon={AlertCircle}
                      subtitle="Awaiting review"
                      color="yellow"
                      onClick={() => navigate('/admin/products/pending')}
                    />
                    <KPICard
                      title="OOS Rate"
                      value={platformHealth?.out_of_stock_rate || 0}
                      icon={AlertTriangle}
                      subtitle="Out of stock products"
                      color="red"
                      onClick={() => navigate('/admin/products')}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/* KPI Cards - Row 3: Orders & Business */}
            <div>
              <h2 className="text-xl font-serif text-neutral-900 mb-4">Orders & Business</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : kpis ? (
                  <>
                    <KPICard
                      title="Total Orders"
                      value={kpis.total_orders}
                      icon={ShoppingBag}
                      subtitle="All time orders"
                      color="blue"
                      onClick={() => {
                        setActiveTab('orders');
                        // Scroll to orders section
                        setTimeout(() => {
                          const ordersSection = document.querySelector('[data-orders-section]');
                          if (ordersSection) {
                            ordersSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    />
                    <KPICard
                      title="Revenue"
                      value={`₹${kpis.revenue_total.toLocaleString()}`}
                      icon={DollarSign}
                      subtitle="Total revenue"
                      color="green"
                      onClick={() => {
                        setActiveTab('orders');
                        setTimeout(() => {
                          const ordersSection = document.querySelector('[data-orders-section]');
                          if (ordersSection) {
                            ordersSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    />
                    <KPICard
                      title="Avg Order Value"
                      value={`₹${kpis.avg_order_value}`}
                      icon={TrendingUp}
                      subtitle="Per order average"
                      color="purple"
                      onClick={() => {
                        setActiveTab('orders');
                        setTimeout(() => {
                          const ordersSection = document.querySelector('[data-orders-section]');
                          if (ordersSection) {
                            ordersSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    />
                    <KPICard
                      title="Today's Orders"
                      value={kpis.daily_orders_today}
                      icon={Activity}
                      subtitle="Orders today"
                      color="indigo"
                      onClick={() => {
                        setActiveTab('orders');
                        setTimeout(() => {
                          const ordersSection = document.querySelector('[data-orders-section]');
                          if (ordersSection) {
                            ordersSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/* KPI Cards - Row 4: Issues */}
            <div>
              <h2 className="text-xl font-serif text-neutral-900 mb-4">Issues & Returns</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : kpis ? (
                  <>
                    <KPICard
                      title="Total Returns"
                      value={kpis.returns_requested}
                      icon={RefreshCw}
                      subtitle="Returned orders"
                      color="red"
                    />
                    <KPICard
                      title="Return Rate"
                      value={`${returnStats?.return_rate || 0}%`}
                      icon={AlertTriangle}
                      subtitle="Return percentage"
                      color="yellow"
                    />
                    <KPICard
                      title="Cancellations"
                      value={kpis.total_cancellations}
                      icon={XCircle}
                      subtitle="Cancelled orders"
                      color="red"
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Orders Trend Chart */}
              <div className="bg-white border border-neutral-300 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-serif text-neutral-900 mb-4">Orders Trend (Last 30 Days)</h3>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                  </div>
                ) : ordersTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ordersTrend}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="order_count" 
                        stroke="#3B82F6" 
                        fillOpacity={1} 
                        fill="url(#colorOrders)"
                        name="Orders"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-neutral-500">
                    No data available
                  </div>
                )}
              </div>

              {/* Revenue by Category Pie Chart */}
              <div className="bg-white border border-neutral-300 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-serif text-neutral-900 mb-4">Revenue by Category</h3>
                {loading ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                  </div>
                ) : categorySales.length > 0 && categorySales[0].category_name !== 'No Data' ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categorySales}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category_name, revenue_contribution }) => 
                          `${category_name}: ₹${revenue_contribution.toFixed(0)}`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="revenue_contribution"
                      >
                        {categorySales.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        formatter={(value) => `₹${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-neutral-500">
                    No category data available
                  </div>
                )}
              </div>
            </div>

            {/* Top Sellers Bar Chart */}
            <div className="bg-white border border-neutral-300 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-serif text-neutral-900 mb-4">Top Sellers by Revenue</h3>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
                </div>
              ) : topSellers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSellers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="seller_name" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                        formatter={(value) => `₹${value.toFixed(2)}`}
                      />
                    <Bar dataKey="total_sales" fill="#3B82F6" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-neutral-500">
                  No seller data available
                </div>
              )}
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals Table */}
              <div className="bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h3 className="text-lg font-serif text-neutral-900">Pending Seller Approvals</h3>
                </div>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-6 text-center text-neutral-500">Loading...</div>
                  ) : sellers.filter(s => !s.is_approved && s.is_active).length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Seller</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {sellers.filter(s => !s.is_approved && s.is_active).slice(0, 5).map((seller) => (
                          <tr key={seller.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 text-sm">
                              <div className="font-medium text-neutral-900">{seller.username}</div>
                              <div className="text-xs text-neutral-500">{seller.email}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-600">
                              {seller.created_at ? new Date(seller.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveSeller(seller.id)}
                                  className="px-3 py-1 text-xs bg-green-600 text-white hover:bg-green-700 rounded flex items-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectSeller(seller.id)}
                                  className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-neutral-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p>No pending approvals</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-white border border-neutral-300 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200">
                  <h3 className="text-lg font-serif text-neutral-900">Recent Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  {loading ? (
                    <div className="p-6 text-center text-neutral-500">Loading...</div>
                  ) : orders.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Order ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.id} className="hover:bg-neutral-50">
                            <td className="px-6 py-4 text-sm font-medium text-neutral-900">#{order.id}</td>
                            <td className="px-6 py-4 text-sm text-neutral-900">₹{order.total_price.toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs rounded ${
                                order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                order.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-600">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-neutral-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                      <p>No orders found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs remain the same as before */}
        {/* Sellers Tab */}
        {activeTab === 'sellers' && (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {sellers.map((seller) => (
                    <tr key={seller.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">{seller.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">{seller.username}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{seller.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {seller.is_active ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Active</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">Email Not Verified</span>
                          )}
                          {seller.is_approved ? (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Approved</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Pending</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!seller.is_approved && seller.is_active && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveSeller(seller.id)}
                              className="px-3 py-1 text-sm bg-green-600 text-white hover:bg-green-700 rounded flex items-center gap-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectSeller(seller.id)}
                              className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded flex items-center gap-1"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sellers.length === 0 && (
              <div className="text-center py-12">
                <p className="text-neutral-600">No sellers found</p>
              </div>
            )}
          </div>
        )}

        {/* Products Tab - Redirect to dedicated page */}
        {activeTab === 'products' && (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
            <h3 className="font-serif text-xl text-neutral-900 mb-2">Product Verification</h3>
            <p className="text-neutral-600 mb-6">
              Use the dedicated product verification page to review and approve seller-submitted products.
            </p>
            <Button
              onClick={() => navigate('/admin/products/pending')}
              className="inline-flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Go to Product Verification
            </Button>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-neutral-300 rounded-lg shadow-sm" data-orders-section>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Order ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">User ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Total Price</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Address</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-neutral-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 text-sm text-neutral-600">#{order.id}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">{order.user_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900">₹{order.total_price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {order.delivery_address ? (
                          <div>
                            <div className="font-medium">
                              {order.delivery_address.city}, {order.delivery_address.state}
                            </div>
                            <div className="text-xs text-neutral-500 capitalize">
                              {order.delivery_address.tag}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded ${
                          order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewOrderDetails(order.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-neutral-400" />
                <p className="text-neutral-600">No orders found</p>
              </div>
            )}
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
                <h2 className="font-serif text-2xl text-neutral-900">Order Details - #{selectedOrder}</h2>
                <button
                  onClick={closeOrderDetails}
                  className="text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                {loadingOrderDetails ? (
                  <div className="text-center py-12">
                    <div className="text-neutral-600 text-lg">Loading order details...</div>
                  </div>
                ) : orderDetails ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Order ID</p>
                        <p className="font-medium text-neutral-900">#{orderDetails.id}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">User ID</p>
                        <p className="font-medium text-neutral-900">{orderDetails.user_id}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Total Price</p>
                        <p className="font-medium text-neutral-900">₹{orderDetails.total_price.toFixed(2)}</p>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded">
                        <p className="text-sm text-neutral-600 mb-1">Status</p>
                        <span className={`px-2 py-1 text-xs rounded inline-block ${
                          orderDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          orderDetails.status === 'Paid' ? 'bg-blue-100 text-blue-700' :
                          orderDetails.status === 'Shipped' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {orderDetails.status}
                        </span>
                      </div>
                      <div className="bg-neutral-50 p-4 rounded col-span-2">
                        <p className="text-sm text-neutral-600 mb-1">Order Date</p>
                        <p className="font-medium text-neutral-900">
                          {new Date(orderDetails.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Delivery Address Section */}
                    {orderDetails.delivery_address && (
                      <div className="border-t border-neutral-300 pt-6 mb-6">
                        <h3 className="font-serif text-xl text-neutral-900 mb-4">Delivery Address</h3>
                        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Full Name</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.full_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Phone Number</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.phone_number}</p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-sm text-neutral-600 mb-1">Address</p>
                              <p className="font-medium text-neutral-900">
                                {orderDetails.delivery_address.address_line_1}
                                {orderDetails.delivery_address.address_line_2 && `, ${orderDetails.delivery_address.address_line_2}`}
                              </p>
                            </div>
                            {orderDetails.delivery_address.landmark && (
                              <div>
                                <p className="text-sm text-neutral-600 mb-1">Landmark</p>
                                <p className="font-medium text-neutral-900">{orderDetails.delivery_address.landmark}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">City</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.city}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">State</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.state}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Pincode</p>
                              <p className="font-medium text-neutral-900">{orderDetails.delivery_address.pincode}</p>
                            </div>
                            <div>
                              <p className="text-sm text-neutral-600 mb-1">Tag</p>
                              <span className="inline-block px-2 py-1 text-xs bg-neutral-200 text-neutral-700 rounded capitalize">
                                {orderDetails.delivery_address.tag}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-neutral-300 pt-6">
                      <h3 className="font-serif text-xl text-neutral-900 mb-4">Order Items</h3>
                      {orderDetails.order_items && orderDetails.order_items.length > 0 ? (
                        <div className="space-y-4">
                          {orderDetails.order_items.map((item) => (
                            <div key={item.id} className="border border-neutral-300 rounded p-4">
                              <div className="flex gap-4">
                                {item.product?.image_url && (
                                  <div className="w-24 h-24 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
                                    <img
                                      src={resolveImageUrl(item.product.image_url)}
                                      alt={item.product.name || 'Product'}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <h4 className="font-serif text-lg text-neutral-900 mb-2">
                                    {item.product?.name || `Product ID: ${item.product_id}`}
                                  </h4>
                                  {item.product?.description && (
                                    <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
                                      {item.product.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm">
                                    <div>
                                      <span className="text-neutral-600">Quantity: </span>
                                      <span className="font-medium text-neutral-900">{item.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-600">Price per item: </span>
                                      <span className="font-medium text-neutral-900">₹{item.price.toFixed(2)}</span>
                                    </div>
                                    <div>
                                      <span className="text-neutral-600">Subtotal: </span>
                                      <span className="font-medium text-neutral-900">
                                        ₹{(item.price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  {item.product && (
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                      {item.product.gender && (
                                        <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded capitalize">
                                          {item.product.gender}
                                        </span>
                                      )}
                                      {item.product.category && (
                                        <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded">
                                          {item.product.category}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="mt-3 pt-3 border-t border-neutral-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-xs text-neutral-600">Seller Status: </span>
                                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                                          item.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                                          item.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                          item.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-neutral-100 text-neutral-700'
                                        }`}>
                                          {item.status || 'Pending'}
                                        </span>
                                      </div>
                                      {item.product?.seller_username && (
                                        <div className="text-xs text-neutral-600">
                                          Seller: <span className="font-medium text-neutral-900">{item.product.seller_username}</span>
                                        </div>
                                      )}
                                    </div>
                                    {item.rejection_reason && (
                                      <div className="mt-2 text-xs text-red-600">
                                        Rejection reason: {item.rejection_reason}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-neutral-600">No items found in this order</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-neutral-600">Failed to load order details</p>
                  </div>
                )}
              </div>
              
              <div className="sticky bottom-0 bg-white border-t border-neutral-300 px-6 py-4 flex justify-end">
                <Button onClick={closeOrderDetails}>Close</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
