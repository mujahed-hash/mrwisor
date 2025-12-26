import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CURRENCIES } from "./constants";
import { Expense, User, Payment } from "@/types";

// Combine className values with Tailwind's merge
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency amount
export function formatCurrency(amount: number, currencyCode = "USD") {
  const currency = CURRENCIES.find((c) => c.code === currencyCode) || CURRENCIES[0];

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Format date in readable format
export function formatDate(dateString: string) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  };

  return new Date(dateString).toLocaleDateString("en-US", options);
}

// Get user name by ID
export function getUserById(userId: string, allUsers: User[]) {
  return allUsers.find((user) => user.id === userId);
}

// Calculate what a user owes or is owed
export function calculateUserBalance(userId: string, allExpenses: Expense[], allPayments: Payment[]) {
  let balance = 0;

  allExpenses.forEach((expense) => {
    // Case 1: The user (userId) paid for this expense.
    // Their balance increases by the amount they paid, minus their share of the expense.
    if (expense.paidBy === userId) {
      const paidAmount = expense.amount;
      const userSplit = expense.splits.find(split => split.userId === userId);
      const shouldPay = userSplit ? userSplit.amount : 0;

      balance += (paidAmount - shouldPay); // If paid more than share, balance increases (owed); if paid less, balance decreases (owe)
    }
    // Case 2: Another user paid for this expense.
    // The user's (userId) balance decreases by their share of the expense.
    else {
      const userSplit = expense.splits.find(split => split.userId === userId);
      if (userSplit) {
        balance -= userSplit.amount; // User owes their share
      }
    }
  });

  // Factor in payments for the overall balance.
  // If the user paid someone, their overall debt decreases (balance increases).
  // If the user received money from someone, their overall debt increases (balance decreases).
  allPayments.forEach(payment => {
    if (payment.payerId === userId) {
      balance += payment.amount; // User paid someone, so their overall 'owed by them' decreases.
    } else if (payment.payeeId === userId) {
      balance -= payment.amount; // User received money, so their overall 'owed by them' increases.
    }
  });

  return balance;
}

// Calculate net balance between two specific users (user1Id and user2Id)
// Positive balance means user2Id owes user1Id. Negative balance means user1Id owes user2Id.
export function calculateBalanceBetweenUsers(user1Id: string, user2Id: string, allExpenses: Expense[], allPayments: Payment[]) {
  let balance = 0;

  allExpenses.forEach((expense) => {
    // Scenario A: user1Id paid for the expense
    if (expense.paidBy === user1Id) {
      let user2Split = expense.splits.find(split => split.userId === user2Id);
      if (user2Split) {
        balance += user2Split.amount; // user2Id owes user1Id their split amount
      }
    }

    // Scenario B: user2Id paid for the expense
    else if (expense.paidBy === user2Id) {
      let user1Split = expense.splits.find(split => split.userId === user1Id);
      if (user1Split) {
        balance -= user1Split.amount; // user1Id owes user2Id their split amount
      }
    }
  });

  // Factor in payments made *directly between* user1Id and user2Id
  allPayments.forEach(payment => {
    if (payment.payerId === user1Id && payment.payeeId === user2Id) {
      balance += payment.amount; // User1 paid User2 (User2 now owes User1 less, or User1 is owed more)
    } else if (payment.payerId === user2Id && payment.payeeId === user1Id) {
      balance -= payment.amount; // User2 paid User1 (User2 now owes User1 more, or User1 is owed less)
    }
  });

  return balance; // positive: user2 owes user1, negative: user1 owes user2
}

// Get all unique users involved in expenses with a specific user
export function getUserFriends(userId: string, allExpenses: Expense[], allUsers: User[]) {
  const friendIds = new Set<string>();

  allExpenses.forEach((expense) => {
    // Add all users from splits where our user is involved
    const userInvolved = expense.splits.some(split => split.userId === userId);

    if (userInvolved) {
      expense.splits.forEach(split => {
        if (split.userId !== userId) {
          friendIds.add(split.userId);
        }
      });

      // Also add the one who paid if it's not our user
      if (expense.paidBy !== userId) {
        friendIds.add(expense.paidBy);
      }
    }
  });

  return Array.from(friendIds).map(id => getUserById(id, allUsers)).filter(Boolean);
}

// Get expenses for a specific user
export function getUserExpenses(userId: string, allExpenses: Expense[]) {
  return allExpenses.filter(expense => {
    // Either user paid or is involved in splits
    return expense.paidBy === userId ||
      expense.splits.some(split => split.userId === userId);
  });
}

// Get expenses for a specific group
export function getGroupExpenses(groupId: string, allExpenses: Expense[]) {
  return allExpenses.filter(expense => expense.groupId === groupId);
}

// Generate avatar fallback from name
export function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Calculate Levenshtein distance between two strings
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Clean and normalize item name
export function cleanItemName(name: string): string {
  if (!name) return "";

  let cleaned = name.toLowerCase();

  // Remove leading quantities (e.g. "1x", "2 ", "1 ")
  cleaned = cleaned.replace(/^\d+\s*[xX]?\s+/, "");

  // Remove trailing prices or standalone numbers (e.g. " 100.00", " 3.99")
  cleaned = cleaned.replace(/\s+\d+(\.\d{2})?\s*$/, "");

  // Remove special characters but keep essential ones for product names
  cleaned = cleaned.replace(/[^\w\s\-\.&]/g, "");

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Title case the result
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}