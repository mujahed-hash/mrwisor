import { useState, ReactNode, useEffect } from "react";
import { AppState, Expense, Payment, Group, User } from "../types";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { AppContext } from "./AppContextProvider";
import { useAppContext } from "./AppContextProvider"; // Import useAppContext directly

const API_BASE_URL = '/api'; // Using proxy in vite.config.ts

// Default empty state
const defaultState: AppState = {
  currentUser: {} as User,
  users: [],
  groups: [],
  expenses: [],
  payments: [],
  notifications: [],
  settings: {}
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  // Destructure logout from useAuth
  const { user, status, logout } = useAuth(); // Added logout
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get auth token
  const getToken = () => localStorage.getItem('token');

  // Load initial data when user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && user) {
      refreshData();
    } else if (status === 'unauthenticated') {
      // Clear state when user logs out
      setState(defaultState);
    }
  }, [user, status]);

  const refreshData = async () => {
    if (!user || !getToken()) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };

      const results = await Promise.all([
        fetch(`${API_BASE_URL}/users`, { headers }),
        fetch(`${API_BASE_URL}/groups`, { headers }),
        fetch(`${API_BASE_URL}/expenses?paginate=false`, { headers }), // Disable pagination for context
        fetch(`${API_BASE_URL}/payments`, { headers }),
        fetch(`${API_BASE_URL}/notifications`, { headers }),
        fetch(`${API_BASE_URL}/system/settings`, { headers }),
      ]);

      // Check for auth errors first
      for (const res of results) {
        if (res.status === 401 || res.status === 403) {
          console.warn("Session expired or unauthorized. Logging out.");
          logout();
          return;
        }
      }

      const [usersRes, groupsRes, expensesRes, paymentsRes, notificationsRes, settingsRes] = results;

      if (!usersRes.ok) throw new Error('Failed to fetch users');
      if (!groupsRes.ok) throw new Error('Failed to fetch groups');
      if (!expensesRes.ok) throw new Error('Failed to fetch expenses');
      if (!paymentsRes.ok) throw new Error('Failed to fetch payments');

      const users: User[] = await usersRes.json();
      const groups: Group[] = await groupsRes.json();
      const expenses: Expense[] = await expensesRes.json();
      const payments: Payment[] = await paymentsRes.json();
      const notifications = notificationsRes.ok ? await notificationsRes.json() : [];
      const settings = settingsRes.ok ? await settingsRes.json() : {};

      // Find the current user from the fetched users list
      const currentUser = users.find(u => u.id === user.id) || user;

      setState({
        currentUser,
        users,
        groups,
        expenses,
        payments,
        notifications,
        settings // Add settings to state
      });
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to load data';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Optimistic update
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      }));
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Optimistic update
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, read: true }))
      }));
    } catch (error) {
      console.error("Error marking all notifications read:", error);
    }
  };

  const addExpense = async (expense: Expense) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      // Remove ID if it's empty/temp, let server assign
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...expenseData } = expense;

      const response = await fetch(`${API_BASE_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to add expense';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      await refreshData();
      toast.success("Expense added successfully");
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to add expense';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error adding expense:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const addPayment = async (payment: Payment) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...paymentData } = payment;

      const response = await fetch(`${API_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to add payment';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      await refreshData();
      toast.success("Payment added successfully");
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to add payment';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error adding payment:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = async (group: Group) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...groupData } = group;

      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(groupData),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const newGroup: Group = await response.json();
      await refreshData();
      toast.success("Group created successfully");
      return newGroup;
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to create group';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error creating group:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getExpensesByGroupId = (groupId: string) => {
    return state.expenses.filter(e => e.groupId === groupId);
  };

  const addMemberToGroup = async (groupId: string, identifier: { userId?: string; identifier?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(identifier),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add member to group');
      }

      await refreshData();
      toast.success("Member added successfully");
      return true;
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to add member';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error adding member:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove member');
      }

      await refreshData();
      toast.success("Member removed successfully");
      return true;
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to remove member';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error removing member:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteGroup = async (groupId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      await refreshData();
      toast.success("Group deleted successfully");
      return true;
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to delete group';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error deleting group:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  // ... existing functions ...

  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update expense');
      }

      toast.success("Expense updated successfully");
      await refreshData();
      return true;
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to update expense';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error updating expense:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (expenseId: string, content: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      const newComment = await response.json();

      // Update local state
      setState(prev => ({
        ...prev,
        expenses: prev.expenses.map(e => {
          if (e.id === expenseId) {
            return {
              ...e,
              comments: [...(e.comments || []), newComment]
            };
          }
          return e;
        })
      }));

      return newComment;
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      throw error;
    }
  };

  const sendReminder = async (recipientId: string, message: string) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: recipientId, message, type: 'reminder' }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reminder');
      }

      toast.success("Reminder sent!");
      return true;
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Failed to send reminder");
      return false;
    }
  };

  const addBatchPayments = async (payments: Payment[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/payments/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ payments }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to add payments';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      await refreshData();
      toast.success("All payments recorded successfully");
    } catch (err) {
      const errorMessage = (err instanceof Error) ? err.message : 'Failed to add payments';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error adding batch payments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    state,
    addExpense,
    updateExpense,
    addPayment,
    addBatchPayments,
    createGroup,
    getExpensesByGroupId,
    addMemberToGroup,
    removeMemberFromGroup,
    deleteGroup,
    refreshData,
    markNotificationRead,
    markAllNotificationsRead,
    addComment,
    sendReminder,
    isLoading,
    error
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Re-export the hook for convenience
export { useAppContext };