import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Filter, X, Check, Trash2, Package, ShoppingCart, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { useSellerWS } from '../../contexts/SellerWSContext';
import API from '../../lib/api';
import Button from '../../components/Button';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, deleteNotification, refreshNotifications } = useSellerWS();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
    // Disable scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    let filtered = [...notifications];

    // Apply type filter
    if (filter !== 'all') {
      const typeMapping = {
        'orders': 'order',
        'stock': 'stock',
        'approval': 'approval',
        'payment': 'payment',
        'return': 'return',
        'dispute': 'dispute',
      };
      const notificationType = typeMapping[filter];
      if (notificationType) {
        if (filter === 'stock') {
          // For stock, filter by message content
          filtered = filtered.filter(n => 
            n.type === 'stock' && 
            (n.message?.includes('Out of Stock') || n.message?.includes('Low Stock'))
          );
        } else {
          filtered = filtered.filter(n => n.type === notificationType);
        }
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.message?.toLowerCase().includes(query) ||
        n.order_id?.toString().includes(query) ||
        n.sku?.toLowerCase().includes(query) ||
        n.product_id?.toString().includes(query)
      );
    }

    setFilteredNotifications(filtered);
  }, [notifications, filter, searchQuery]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
    } else if (notification.product_id) {
      navigate('/seller/inventory');
    }
  };

  const handleAcceptOrder = async (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
    }
  };

  const handleRejectOrder = async (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
    }
  };

  const handleViewOrder = (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
    }
  };

  const handleViewInventory = (e, notification) => {
    e.stopPropagation();
    navigate('/seller/inventory');
  };

  const handleEditProduct = (e, notification) => {
    e.stopPropagation();
    navigate('/seller/dashboard');
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-5 h-5" />;
      case 'stock':
        return <Package className="w-5 h-5" />;
      case 'approval':
        return <CheckCircle className="w-5 h-5" />;
      case 'payment':
        return <CheckCircle className="w-5 h-5" />;
      case 'return':
        return <Package className="w-5 h-5" />;
      case 'dispute':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'orders', label: 'Orders' },
    { id: 'stock', label: 'Stock' },
    { id: 'approval', label: 'Approval' },
    { id: 'payment', label: 'Payment' },
    { id: 'return', label: 'Return' },
    { id: 'dispute', label: 'Dispute' },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl text-neutral-900 mb-2">Notifications</h1>
            <p className="text-neutral-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <Button
            onClick={() => navigate('/seller/dashboard')}
            className="bg-neutral-300 text-neutral-900 hover:bg-neutral-400"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border border-neutral-300 p-4 mb-6 rounded-lg">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Order ID, SKU, or Product Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded focus:outline-none focus:border-neutral-900"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-4 py-2 rounded whitespace-nowrap transition-colors ${
                    filter === tab.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer ${
                  !notification.is_read ? 'border-blue-300 bg-blue-50' : 'border-neutral-300'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${getPriorityColor(notification.priority)}`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 mb-1">{notification.message}</p>
                        {(notification.size || notification.color || notification.sku) && (
                          <p className="text-sm text-neutral-500">
                            {[notification.sku, notification.size, notification.color].filter(Boolean).join(' • ')}
                          </p>
                        )}
                        <p className="text-xs text-neutral-400 mt-2">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {notification.type === 'order' && notification.order_id && (
                        <>
                          <button
                            onClick={(e) => handleAcceptOrder(e, notification)}
                            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Accept Order
                          </button>
                          <button
                            onClick={(e) => handleRejectOrder(e, notification)}
                            className="text-sm px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Reject Order
                          </button>
                          <button
                            onClick={(e) => handleViewOrder(e, notification)}
                            className="text-sm px-3 py-1.5 bg-neutral-600 text-white rounded hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Order
                          </button>
                        </>
                      )}
                      {notification.type === 'stock' && (
                        <button
                          onClick={(e) => handleViewInventory(e, notification)}
                          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Package className="w-4 h-4" />
                          View Inventory
                        </button>
                      )}
                      {notification.type === 'approval' && notification.message?.includes('Rejected') && (
                        <button
                          onClick={(e) => handleEditProduct(e, notification)}
                          className="text-sm px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-2"
                        >
                          Edit Product
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-sm px-3 py-1.5 bg-neutral-300 text-neutral-700 rounded hover:bg-neutral-400 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-neutral-300 rounded-lg p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-neutral-400" />
              <p className="text-neutral-600 text-lg mb-2">No notifications found</p>
              <p className="text-neutral-500 text-sm">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'You\'re all caught up!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

