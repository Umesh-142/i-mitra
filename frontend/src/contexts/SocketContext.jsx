import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Create context
const SocketContext = createContext();

// Provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token && user) {
      // Initialize socket connection
      const newSocket = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setSocket(newSocket);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      // Real-time event handlers
      newSocket.on('new_complaint', (data) => {
        toast.success(`New complaint received: ${data.complaint.complaintId}`);
      });

      newSocket.on('complaint_assigned', (data) => {
        toast.success(`Complaint ${data.complaintId} assigned to ${data.assignedTo}`);
      });

      newSocket.on('complaint_status_updated', (data) => {
        toast.success(`Complaint ${data.complaintId} status updated to ${data.status}`);
      });

      newSocket.on('new_remark', (data) => {
        toast.info(`New remark on complaint ${data.complaintId}`);
      });

      newSocket.on('feedback_received', (data) => {
        toast.info(`Feedback received for complaint ${data.complaintId}`);
      });

      newSocket.on('sla_breach_warning', (data) => {
        toast.error(`SLA breach warning for complaint ${data.complaintId}`, {
          duration: 6000
        });
      });

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, token, user]);

  // Emit events
  const emitComplaintUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('complaint_update', data);
    }
  };

  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('join_room', room);
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('leave_room', room);
    }
  };

  const value = {
    socket,
    isConnected,
    emitComplaintUpdate,
    joinRoom,
    leaveRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook to use socket context
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;