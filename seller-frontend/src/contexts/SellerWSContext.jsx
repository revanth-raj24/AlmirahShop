import { createContext, useContext, useEffect, useState, useRef } from 'react';
import API from '../lib/api';
import { useAuth } from './AuthContext';

const SellerWSContext = createContext({});

export const useSellerWS = () => {
  const context = useContext(SellerWSContext);
  if (!context) {
    throw new Error('useSellerWS must be used within SellerWSProvider');
  }
  return context;
};

export function SellerWSProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connectWebSocket = () => {
    const sellerId = user?.sellerId || user?.id;
    if (!user || user.role !== 'seller' || !sellerId) {
      return;
    }

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
      const wsUrl = `${wsProtocol}//${wsHost}/ws/seller/${sellerId}?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Seller WebSocket connected');
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
            if (!data.data.is_read) {
              setUnreadCount(prev => prev + 1);
            }
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
        console.log('Seller WebSocket disconnected');
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
      const { data } = await API.get('/seller/notifications?limit=50');
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
      await API.patch(`/seller/notifications/${notificationId}/read`, { is_read: true });
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
      await API.patch(`/seller/notifications/${notificationId}/read`, { is_read: false });
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
      await API.delete(`/seller/notifications/${notificationId}`);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const refreshNotifications = () => {
    fetchNotifications();
  };

  useEffect(() => {
    const sellerId = user?.sellerId || user?.id;
    if (user && user.role === 'seller' && sellerId) {
      connectWebSocket();
      return () => {
        disconnectWebSocket();
      };
    }
  }, [user]);

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAsUnread,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <SellerWSContext.Provider value={value}>
      {children}
    </SellerWSContext.Provider>
  );
}

