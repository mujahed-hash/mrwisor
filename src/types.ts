// Type definitions for the app

export interface User {
  id: string;
  customId: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string;
  phoneNumber?: string;
  defaultCurrency?: string;
  preferences?: {
    theme?: string;
    language?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
  // Extended fields for frontend display
  groups?: string[];
  balances?: Record<string, number>;
  totalExpenses?: number;
  totalOwed?: number;
  totalOwing?: number;
}

export type Group = {
  id: string;
  name: string;
  description?: string;
  members: string[]; // Array of user IDs
  total?: number; // Total amount spent in the group
  createdBy: string; // New: User ID of the group creator (admin)
  createdAt?: string;
  updatedAt?: string;
};

export interface Split {
  userId: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  paidBy: string; // userId
  groupId?: string;
  category?: string;
  date: string;
  receipt?: string; // image URL
  notes?: string;
  splitType: 'EQUAL' | 'PERCENTAGE' | 'SHARES' | 'EXACT' | 'ADJUSTMENT';
  splits: Split[];
  comments?: Comment[];
  recurringType?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  recurringEnd?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type Payment = {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency?: string;
  date: string;
  groupId?: string; // Optional: if the payment is related to a specific group
  notes?: string;
  createdAt?: string;
};

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export interface SplitMethod {
  id: string;
  name: string;
  description: string;
}

export interface Balance {
  userId: string;
  amount: number;
}

export interface UserBalance {
  userId: string;
  owes: Balance[];
  owed: Balance[];
  netBalance: number;
}

export interface Comment {
  id: string;
  expenseId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: string;
  createdAt: string;
}

export interface Ad {
  id: string;
  title: string;
  content: string;
  type: 'TOP_BANNER' | 'BOTTOM_STICKY' | 'FEED';
  isActive: boolean;
  mediaUrls?: string[];
  startDate?: string;
  endDate?: string;
  createdAt?: string;
}

export type AppState = {
  currentUser: User;
  users: User[];
  groups: Group[];
  expenses: Expense[];
  payments: Payment[];
  notifications: Notification[];
  settings: Record<string, string | number | boolean>;
};

export interface AppContextType {
  state: AppState;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (expenseId: string, expense: Partial<Expense>) => Promise<boolean>;
  addPayment: (payment: Payment) => Promise<void>;
  createGroup: (group: Group) => Promise<Group | null>;
  getExpensesByGroupId: (groupId: string) => Expense[];
  addMemberToGroup: (groupId: string, identifier: { userId?: string; identifier?: string }) => Promise<boolean>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<boolean>;
  deleteGroup: (groupId: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addComment: (expenseId: string, content: string) => Promise<any>;
  sendReminder: (recipientId: string, message: string) => Promise<boolean>;
  addBatchPayments: (payments: Payment[]) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}