import { useAppContext } from "@/contexts/AppContext";
import { calculateUserBalance, formatCurrency, getUserById, calculateBalanceBetweenUsers, getInitials } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function DashboardSummary() {
  const { state } = useAppContext();
  const { currentUser, expenses, users, payments, groups } = state;

  // New logic: Aggregate balances by GROUP context.
  // This matches the "Your Groups" list where positive groups count as "Owed"
  // and negative groups count as "Payable", without netting them against each other globally.

  // New Logic: Collect summary items (Groups and Non-Group User balances)
  // This replaces the old User-only global net balance logic

  interface SummaryItem {
    id: string;
    name: string;
    avatar?: string;
    amount: number; // Absolute value of the balance
    type: 'owed' | 'owe'; // 'owed' if they owe me, 'owe' if I owe them
    groupName: string; // Context for the balance (e.g., "All Groups")
  }

  // Calculate balances by friend (aggregated across all groups)
  const friendBalances = new Map<string, number>();

  // 1. Identify all friends (users in any group I am in, or involved in direct expenses/payments)
  const friendIds = new Set<string>();

  // Add friends from groups
  groups.forEach(g => {
    if (g.members.includes(currentUser.id)) {
      g.members.forEach(m => {
        if (m !== currentUser.id) friendIds.add(m);
      });
    }
  });

  // Add friends from direct expenses/payments
  // Add friends from direct expenses/payments
  expenses.forEach(e => {
    if (!e.groupId) { // Direct expense
      const participants = e.splits.map(s => s.userId);
      if (e.paidBy === currentUser.id) {
        // I paid, so everyone else in the splits is a friend involved
        participants.forEach(pId => {
          if (pId !== currentUser.id) friendIds.add(pId);
        });
      } else if (participants.includes(currentUser.id)) {
        // Someone else paid and I'm involved
        friendIds.add(e.paidBy);
      }
    }
  });
  payments.forEach(p => {
    if (!p.groupId) { // Direct payment
      if (p.payerId === currentUser.id) { // I paid someone
        friendIds.add(p.payeeId);
      } else if (p.payeeId === currentUser.id) { // Someone paid me
        friendIds.add(p.payerId);
      }
    }
  });


  // 2. Calculate net balance with each friend across ALL shared groups and direct transactions
  friendIds.forEach(friendId => {
    const globalBalance = calculateBalanceBetweenUsers(
      currentUser.id,
      friendId,
      state.expenses, // Pass ALL expenses
      state.payments  // Pass ALL payments
    );
    // Only add if there's a non-trivial balance
    if (Math.abs(globalBalance) >= 0.01) {
      friendBalances.set(friendId, globalBalance);
    }
  });

  // 3. Convert to array for display
  const summaryItems: SummaryItem[] = Array.from(friendBalances.entries()).map(([friendId, balance]) => {
    const friend = getUserById(friendId, users);
    return {
      id: friendId, // Use user ID as key
      name: friend?.name || "Unknown User",
      avatar: friend?.avatar,
      amount: Math.abs(balance),
      type: balance > 0 ? 'owed' : 'owe', // > 0 means they owe me
      groupName: "Total Balance" // Generic label since it's aggregated
    };
  });

  const youOwe = summaryItems.filter(item => item.type === 'owe');
  const youAreOwed = summaryItems.filter(item => item.type === 'owed');

  const totalReceivable = youAreOwed.reduce((sum, item) => sum + item.amount, 0);
  const totalPayable = youOwe.reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalReceivable - totalPayable;

  return (
    <Tabs defaultValue="summary" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="youOwe">You Owe</TabsTrigger>
        <TabsTrigger value="youAreOwed">You are Owed</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="space-y-4 pt-4">
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:pb-2 md:p-4 bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="text-xs md:text-sm font-medium">Net Balance</CardTitle>
              <Activity className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent className="p-2 md:pt-4 md:p-4">
              <div className={`text-lg md:text-2xl font-bold ${netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netBalance)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Overall</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:pb-2 md:p-4 bg-green-50 dark:bg-green-900/20">
              <CardTitle className="text-xs md:text-sm font-medium">Receivable</CardTitle>
              <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent className="p-2 md:pt-4 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceivable)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Owed to you</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 md:pb-2 md:p-4 bg-red-50 dark:bg-red-900/20">
              <CardTitle className="text-xs md:text-sm font-medium">Payable</CardTitle>
              <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent className="p-2 md:pt-4 md:p-4">
              <div className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPayable)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">You owe</p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="youOwe" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Money You Owe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {youOwe.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">You don't owe anyone money</p>
              </div>
            ) : (
              <div className="space-y-2">
                {youOwe.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10 border">
                        <AvatarFallback>
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.groupName}
                        </p>
                      </div>
                    </div>
                    <div className="text-red-600 dark:text-red-400 font-semibold">
                      You owe {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="youAreOwed" className="space-y-4 pt-4">
        <Card>
          <CardHeader>
            <CardTitle>Money You Are Owed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {youAreOwed.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No one owes you money</p>
              </div>
            ) : (
              <div className="space-y-2">
                {youAreOwed.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border flex-shrink-0">
                        <AvatarFallback className="text-xs sm:text-sm">
                          {getInitials(item.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{item.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {item.groupName}
                        </p>
                      </div>
                    </div>
                    <div className="text-green-600 dark:text-green-400 font-semibold text-xs sm:text-sm flex-shrink-0 text-right">
                      Owes you {formatCurrency(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}