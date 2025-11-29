import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, XCircle, Eye, Trash2, Package, ShoppingCart, AlertTriangle, CheckCircle, XCircle as RejectIcon } from 'lucide-react';
import { useSellerWS } from '../../contexts/SellerWSContext';
import API from '../../lib/api';

export default function SellerNotifications() {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useSellerWS();
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Show toast for high priority notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latestNotification = notifications[0];
      if (!latestNotification.is_read && latestNotification.priority === 'high') {
        setShowToast(latestNotification);
        // Auto-hide toast after 5 seconds
        setTimeout(() => {
          setShowToast(null);
        }, 5000);
      }
    }
  }, [notifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
    } else if (notification.product_id) {
      navigate('/seller/inventory');
    } else {
      navigate('/seller/dashboard/notifications');
    }
    setIsOpen(false);
  };

  const handleAcceptOrder = async (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      try {
        // Find the order item ID from the notification or navigate to order detail
        navigate(`/seller/orders/${notification.order_id}`);
        setIsOpen(false);
      } catch (error) {
        console.error('Error accepting order:', error);
      }
    }
  };

  const handleRejectOrder = async (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      try {
        navigate(`/seller/orders/${notification.order_id}`);
        setIsOpen(false);
      } catch (error) {
        console.error('Error rejecting order:', error);
      }
    }
  };

  const handleViewOrder = (e, notification) => {
    e.stopPropagation();
    if (notification.order_id) {
      navigate(`/seller/orders/${notification.order_id}`);
      setIsOpen(false);
    }
  };

  const handleViewInventory = (e, notification) => {
    e.stopPropagation();
    navigate('/seller/inventory');
    setIsOpen(false);
  };

  const handleEditProduct = (e, notification) => {
    e.stopPropagation();
    navigate('/seller/dashboard');
    setIsOpen(false);
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
        return <ShoppingCart className="w-4 h-4" />;
      case 'stock':
        return <Package className="w-4 h-4" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4" />;
      case 'payment':
        return <CheckCircle className="w-4 h-4" />;
      case 'return':
        return <Package className="w-4 h-4" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
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

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white border border-neutral-300 rounded-lg shadow-lg z-50 max-h-[600px] overflow-y-auto">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Notifications</h3>
              <button
                onClick={() => navigate('/seller/dashboard/notifications')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-neutral-200">
              {notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${getPriorityColor(notification.priority)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900 line-clamp-2">
                          {notification.message}
                        </p>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                        )}
                      </div>
                      
                      {(notification.size || notification.color || notification.sku) && (
                        <p className="text-xs text-neutral-500 mt-1">
                          {[notification.sku, notification.size, notification.color].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      
                      <p className="text-xs text-neutral-400 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>

                      {/* Action buttons based on notification type */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {notification.type === 'order' && notification.order_id && (
                          <>
                            <button
                              onClick={(e) => handleAcceptOrder(e, notification)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Accept
                            </button>
                            <button
                              onClick={(e) => handleRejectOrder(e, notification)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                            >
                              <RejectIcon className="w-3 h-3" />
                              Reject
                            </button>
                            <button
                              onClick={(e) => handleViewOrder(e, notification)}
                              className="text-xs px-2 py-1 bg-neutral-600 text-white rounded hover:bg-neutral-700 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                          </>
                        )}
                        {notification.type === 'stock' && (
                          <button
                            onClick={(e) => handleViewInventory(e, notification)}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                          >
                            <Package className="w-3 h-3" />
                            View Inventory
                          </button>
                        )}
                        {notification.type === 'approval' && notification.message?.includes('Rejected') && (
                          <button
                            onClick={(e) => handleEditProduct(e, notification)}
                            className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1"
                          >
                            Edit Product
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="text-xs px-2 py-1 bg-neutral-300 text-neutral-700 rounded hover:bg-neutral-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {notifications.length === 0 && (
              <div className="p-8 text-center text-neutral-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification for high priority alerts */}
      {showToast && (
        <div className="fixed top-4 right-4 bg-white border border-neutral-300 rounded-lg shadow-lg p-4 z-50 max-w-md">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded ${getPriorityColor(showToast.priority)}`}>
              {getNotificationIcon(showToast.type)}
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{showToast.message}</p>
              <p className="text-xs text-neutral-500 mt-1">{formatTimeAgo(showToast.created_at)}</p>
            </div>
            <button
              onClick={() => setShowToast(null)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

