import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, Circle } from 'lucide-react';
import { useAdminWS } from '../contexts/AdminWSContext';
import { useNavigate } from 'react-router-dom';

// Simple toast implementation
const showToast = (message, type = 'info') => {
  const toastEl = document.createElement('div');
  toastEl.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white`;
  toastEl.textContent = message;
  document.body.appendChild(toastEl);
  setTimeout(() => {
    toastEl.remove();
  }, 3000);
};

export default function AdminNotifications() {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useAdminWS();
  const [isOpen, setIsOpen] = useState(false);
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

  // Show toast for new notifications
  useEffect(() => {
    if (notifications.length > 0 && notifications[0] && !notifications[0].is_read) {
      const latest = notifications[0];
      showToast(latest.message, 'info');
    }
  }, [notifications]);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setIsOpen(false);

    // Navigate based on notification type
    if (notification.product_id) {
      navigate(`/admin/products/${notification.product_id}`);
    } else if (notification.order_id) {
      // Navigate to orders page or order detail if available
      navigate('/admin/dashboard?tab=orders');
    } else if (notification.seller_id) {
      navigate('/admin/sellers');
    }
  };

  const handleDelete = (e, notificationId) => {
    e.stopPropagation();
    if (confirm('Delete this notification?')) {
      deleteNotification(notificationId);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'stock':
        return '📦';
      case 'approval':
        return '✅';
      case 'seller_verification':
        return '👤';
      case 'payment':
        return '💳';
      default:
        return '🔔';
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-neutral-200 z-50 max-h-[600px] flex flex-col">
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="font-semibold text-neutral-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-neutral-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-neutral-500 uppercase">
                            {notification.type.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-2">
                            {notification.is_read ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-blue-500" />
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="text-neutral-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-neutral-900 mb-1">{notification.message}</p>
                        <p className="text-xs text-neutral-500">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-neutral-200">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/notifications');
              }}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

