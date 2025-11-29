import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, Trash2, Filter, X } from 'lucide-react';
import { useAdminWS } from '../../contexts/AdminWSContext';
import API from '../../lib/api';

export default function NotificationsPage() {
  const { notifications, markAsRead, markAsUnread, deleteNotification, fetchNotifications } = useAdminWS();
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (filterRead === 'read' && !n.is_read) return false;
    if (filterRead === 'unread' && n.is_read) return false;
    return true;
  });

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

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order':
        return 'bg-blue-100 text-blue-700';
      case 'stock':
        return 'bg-yellow-100 text-yellow-700';
      case 'approval':
        return 'bg-green-100 text-green-700';
      case 'seller_verification':
        return 'bg-purple-100 text-purple-700';
      case 'payment':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-neutral-100 text-neutral-700';
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.product_id) {
      navigate(`/admin/products/${notification.product_id}`);
    } else if (notification.order_id) {
      navigate('/admin/dashboard?tab=orders');
    } else if (notification.seller_id) {
      navigate('/admin/sellers');
    }
  };

  const notificationTypes = ['all', 'order', 'stock', 'approval', 'seller_verification', 'payment'];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-neutral-600 mt-2">Manage and view all system notifications</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-600">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-neutral-600">Status:</label>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>

            {(filterType !== 'all' || filterRead !== 'all') && (
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterRead('all');
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-neutral-600 text-lg">No notifications found</p>
              <p className="text-neutral-500 text-sm mt-2">
                {filterType !== 'all' || filterRead !== 'all'
                  ? 'Try adjusting your filters'
                  : 'You\'re all caught up!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-neutral-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-3xl ${getNotificationColor(notification.type)} p-3 rounded-lg`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          {notification.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          {notification.is_read ? (
                            <button
                              onClick={() => markAsUnread(notification.id)}
                              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
                              title="Mark as unread"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Read
                            </button>
                          ) : (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                              title="Mark as read"
                            >
                              <Circle className="w-4 h-4" />
                              Unread
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Delete this notification?')) {
                                deleteNotification(notification.id);
                              }
                            }}
                            className="text-neutral-400 hover:text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p
                        className="text-neutral-900 mb-2 cursor-pointer hover:text-blue-600"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-500">
                          {formatTime(notification.created_at)}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          {notification.product_id && (
                            <span>Product ID: {notification.product_id}</span>
                          )}
                          {notification.order_id && <span>Order ID: {notification.order_id}</span>}
                          {notification.seller_id && (
                            <span>Seller ID: {notification.seller_id}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

