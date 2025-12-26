// App-wide constants

// App name
export const APP_NAME = "Wisely Spent";

// Currency options
export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "$", name: "Australian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "MXN", symbol: "$", name: "Mexican Peso" },
];

// Expense categories
export const EXPENSE_CATEGORIES = [
  { id: "food", name: "Food & Drink", icon: "utensils" },
  { id: "groceries", name: "Groceries", icon: "shopping-basket" },
  { id: "entertainment", name: "Entertainment", icon: "film" },
  { id: "home", name: "Home", icon: "home" },
  { id: "transportation", name: "Transportation", icon: "car" },
  { id: "utilities", name: "Utilities", icon: "bolt" },
  { id: "travel", name: "Travel", icon: "plane" },
  { id: "medical", name: "Medical", icon: "medkit" },
  { id: "shopping", name: "Shopping", icon: "shopping-bag" },
  { id: "gifts", name: "Gifts", icon: "gift" },
  { id: "education", name: "Education", icon: "graduation-cap" },
  { id: "other", name: "Other", icon: "ellipsis-h" },
];

// Split methods
export const SPLIT_METHODS = [
  { id: "equal", name: "Split equally", description: "Everyone pays the same amount" },
  { id: "percentage", name: "Split by percentages", description: "Split by custom percentages" },
  { id: "shares", name: "Split by shares", description: "Assign shares to each person" },
  { id: "exact", name: "Split by exact amounts", description: "Specify exact amounts for each person" },
  { id: "adjustment", name: "Split by adjustment", description: "Equal split with adjustments" },
];

// Sample data for demo purposes
export const DEMO_USERS = [
  { id: "u1", name: "You", email: "you@example.com", avatar: "/images/You.jpg" },
  { id: "u2", name: "Alex Johnson", email: "alex@example.com", avatar: "/images/AlexJohnson.jpg" },
  { id: "u3", name: "Jamie Smith", email: "jamie@example.com", avatar: "/images/JamieSmith.jpg" },
  { id: "u4", name: "Taylor Wilson", email: "taylor@example.com", avatar: "/images/TaylorWilson.jpg" },
  { id: "u5", name: "Jordan Lee", email: "jordan@example.com", avatar: "/images/JordanLee.jpg" },
];

export const DEMO_GROUPS = [
  { id: "g1", name: "Weekend Trip", members: ["u1", "u2", "u3"], total: 675.50 },
  { id: "g2", name: "Apartment 4B", members: ["u1", "u4", "u5"], total: 1250.75 },
  { id: "g3", name: "Team Lunch", members: ["u1", "u2", "u4"], total: 128.35 },
];

export const DEMO_EXPENSES = [
  {
    id: "e1",
    description: "Airbnb",
    amount: 450.00,
    paidBy: "u1",
    date: "2023-07-15",
    groupId: "g1",
    category: "travel",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 150 },
      { userId: "u2", amount: 150 },
      { userId: "u3", amount: 150 }
    ]
  },
  {
    id: "e2",
    description: "Groceries",
    amount: 85.25,
    paidBy: "u2",
    date: "2023-07-16",
    groupId: "g1",
    category: "groceries",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 28.42 },
      { userId: "u2", amount: 28.42 },
      { userId: "u3", amount: 28.41 }
    ]
  },
  {
    id: "e3",
    description: "Rent - July",
    amount: 1800.00,
    paidBy: "u1",
    date: "2023-07-01",
    groupId: "g2",
    category: "home",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 600 },
      { userId: "u4", amount: 600 },
      { userId: "u5", amount: 600 }
    ]
  },
  {
    id: "e4",
    description: "Team Dinner",
    amount: 128.35,
    paidBy: "u4",
    date: "2023-07-14",
    groupId: "g3",
    category: "food",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 42.78 },
      { userId: "u2", amount: 42.78 },
      { userId: "u4", amount: 42.79 }
    ]
  },
  {
    id: "e5",
    description: "Gas",
    amount: 42.50,
    paidBy: "u3",
    date: "2023-07-17",
    groupId: "g1",
    category: "transportation",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 14.17 },
      { userId: "u2", amount: 14.17 },
      { userId: "u3", amount: 14.16 }
    ]
  },
  {
    id: "e6",
    description: "Utilities - July",
    amount: 135.20,
    paidBy: "u5",
    date: "2023-07-05",
    groupId: "g2",
    category: "utilities",
    splitType: "equal",
    splits: [
      { userId: "u1", amount: 45.07 },
      { userId: "u4", amount: 45.07 },
      { userId: "u5", amount: 45.06 }
    ]
  },
];

export const DEMO_PAYMENTS = [];