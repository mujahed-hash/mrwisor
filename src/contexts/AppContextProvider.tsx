import { createContext, useContext } from "react";
import { AppState, AppContextType, Expense, Payment, Group, User } from "../types";

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

// Create context with default values
export const AppContext = createContext<AppContextType>({
  state: defaultState,
  addExpense: async () => { },
  updateExpense: async () => false,
  addPayment: async () => { },
  addBatchPayments: async () => { },
  createGroup: async () => null,
  getExpensesByGroupId: () => [],
  addMemberToGroup: async () => false,
  removeMemberFromGroup: async () => false,
  deleteGroup: async () => false,
  refreshData: async () => { },
  markNotificationRead: async () => { },
  markAllNotificationsRead: async () => { },
  addComment: async () => ({} as any),
  sendReminder: async () => false,
  isLoading: false,
  error: null
});

// Custom hook for using the app context
export const useAppContext = () => useContext(AppContext);
