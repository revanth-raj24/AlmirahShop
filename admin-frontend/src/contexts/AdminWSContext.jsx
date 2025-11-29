import { createContext, useContext, useEffect, useState, useRef } from 'react';
import API from '../lib/api';

const AdminWSContext = createContext({});

export const useAdminWS = () => {
  const context = useContext(AdminWSContext);
  if (!context) {
    throw new Error('useAdminWS must be used within AdminWSProvider');
  }
  return context;
};

export function AdminWSProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token available for WebSocket connection');
        return;
      }

      // Use ws:// for localhost, wss:// for production
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Match the API base URL (from api.jsx: http://127.0.0.1:8000)
      const wsHost = '127.0.0.1:8000';
      const wsUrl = `${wsProtocol}//${wsHost}/ws/admin?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        // Fetch initial notifications
        fetchNotifications();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.data) {
            // Add new notification to the list
            setNotifications(prev => [data.data, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... Attempt ${reconnectAttempts.current}`);
            connectWebSocket();
          }, 3000 * reconnectAttempts.current); // Exponential backoff
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/admin/notifications?limit=50');
      setNotifications(data || []);
      // Count unread notifications
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/admin/notifications/${notificationId}/read`, { is_read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      await API.patch(`/admin/notifications/${notificationId}/read`, { is_read: false });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: false } : n)
      );
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error('Error marking notification as unread:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await API.delete(`/admin/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Update unread count if deleted notification was unread
      const deleted = notifications.find(n => n.id === notificationId);
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      connectWebSocket();
      fetchNotifications();
    }

    return () => {
      disconnectWebSocket();
    };
  }, []);

  return (
    <AdminWSContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        fetchNotifications,
        markAsRead,
        markAsUnread,
        deleteNotification,
      }}
    >
      {children}
    </AdminWSContext.Provider>
  );
}

