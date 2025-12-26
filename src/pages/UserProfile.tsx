import { useParams, Link } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, getInitials, getUserById, calculateBalanceBetweenUsers, calculateUserBalance } from "@/lib/utils";
import { Wallet, CheckCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Payment } from "@/types";
import { format } from "date-fns";

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { state } = useAppContext();
  const { users, currentUser, expenses, payments, groups } = state;

  const visitedUser = getUserById(userId as string, users);

  if (!visitedUser) {
    return (
      <AppLayout>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <p className="text-muted-foreground mb-8">
            The user you're looking for doesn't exist.
          </p>
          <Link to="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isOwnProfile = currentUser.id === visitedUser.id;
  const [isSettleAllOpen, setIsSettleAllOpen] = useState(false);
  const [paymentsToSettle, setPaymentsToSettle] = useState<Payment[]>([]);
  const { addBatchPayments } = useAppContext();

  // Calculate balance
  // If own profile: Global net balance
  // If other profile: Balance between current user and visited user
  const displayBalance = isOwnProfile
    ? calculateUserBalance(currentUser.id, expenses, payments)
    : calculateBalanceBetweenUsers(currentUser.id, visitedUser.id, expenses, payments);

  // Find groups
  // If own profile: All groups I am in
  // If other profile: Common groups
  const displayedGroups = isOwnProfile
    ? groups.filter(group => group.members.includes(currentUser.id))
    : groups.filter(group =>
      group.members.includes(currentUser.id) &&
      group.members.includes(visitedUser.id)
    );

  const handleSettleAllClick = () => {
    // 1. Calculate non-group debt
    const nonGroupExpenses = expenses.filter(exp => !exp.groupId);
    const nonGroupPayments = payments.filter(pay => !pay.groupId);
    const nonGroupBalance = calculateBalanceBetweenUsers(
      currentUser.id,
      visitedUser.id,
      nonGroupExpenses,
      nonGroupPayments
    );

    const calculatedPayments: Payment[] = [];
    const dateStr = format(new Date(), "yyyy-MM-dd");

    // If I owe non-group money
    if (nonGroupBalance < -0.01) {
      calculatedPayments.push({
        id: crypto.randomUUID(),
        payerId: currentUser.id,
        payeeId: visitedUser.id,
        amount: Math.abs(nonGroupBalance),
        currency: "USD", // default
        date: dateStr,
        groupId: undefined, // Explicitly undefined/null
        notes: "Global Settlement (Personal)"
      });
    }

    // 2. Calculate group debts
    displayedGroups.forEach(group => {
      const groupExpenses = expenses.filter(exp => exp.groupId === group.id);
      const groupPayments = payments.filter(pay => pay.groupId === group.id);
      const groupBalance = calculateBalanceBetweenUsers(
        currentUser.id,
        visitedUser.id,
        groupExpenses,
        groupPayments
      );

      if (groupBalance < -0.01) {
        calculatedPayments.push({
          id: crypto.randomUUID(),
          payerId: currentUser.id,
          payeeId: visitedUser.id,
          amount: Math.abs(groupBalance),
          currency: "USD",
          date: dateStr,
          groupId: group.id,
          notes: `Global Settlement (${group.name})`
        });
      }
    });

    if (calculatedPayments.length === 0) {
      // Should not happen if button is shown correctly, but safety first
      return;
    }

    setPaymentsToSettle(calculatedPayments);
    setIsSettleAllOpen(true);
  };

  const totalSettleAmount = paymentsToSettle.reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center space-x-4 mb-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-3xl">{getInitials(visitedUser.name)}</AvatarFallback>
            {visitedUser.avatar && <AvatarImage src={visitedUser.avatar} alt={visitedUser.name} />}
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{visitedUser.name} {isOwnProfile && "(You)"}</h1>
            <p className="text-muted-foreground">{visitedUser.email}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{isOwnProfile ? "Your Total Balance" : `Balance with ${visitedUser.name}`}</CardTitle>
            {!isOwnProfile && displayBalance < -0.01 && (
              <Button size="sm" onClick={handleSettleAllClick} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCheck className="h-4 w-4 mr-2" />
                Settle All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${displayBalance > 0 ? 'text-green-600 dark:text-green-400' :
              displayBalance < 0 ? 'text-red-600 dark:text-red-400' :
                'text-muted-foreground'
              }`}>
              {formatCurrency(Math.abs(displayBalance))}
            </p>
            <p className="text-sm text-muted-foreground">
              {isOwnProfile ? (
                displayBalance > 0 ? "You are owed in total" :
                  displayBalance < 0 ? "You owe in total" :
                    "You are all settled up"
              ) : (
                displayBalance > 0 ? `${visitedUser.name} owes you` :
                  displayBalance < 0 ? `You owe ${visitedUser.name}` :
                    `You are settled up with ${visitedUser.name}`
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{isOwnProfile ? "My Groups" : "Common Groups"}</CardTitle>
          </CardHeader>
          <CardContent>
            {displayedGroups.length === 0 && (!isOwnProfile && Math.abs(calculateBalanceBetweenUsers(currentUser.id, visitedUser.id, expenses.filter(e => !e.groupId), payments.filter(p => !p.groupId))) < 0.01) ? (
              <p className="text-muted-foreground">{isOwnProfile ? "You are not in any groups." : "No shared expenses."}</p>
            ) : (
              <div className="space-y-4">
                {/* Non-group (Personal) Expenses */}
                {(() => {
                  const nonGroupExpenses = expenses.filter(exp => !exp.groupId);
                  const nonGroupPayments = payments.filter(pay => !pay.groupId);

                  // For self: Calculate my personal net balance from non-group expenses
                  // For other: Calculate balance between us in non-group expenses
                  const nonGroupBalance = isOwnProfile
                    ? calculateUserBalance(currentUser.id, nonGroupExpenses, nonGroupPayments)
                    : calculateBalanceBetweenUsers(currentUser.id, visitedUser.id, nonGroupExpenses, nonGroupPayments);

                  if (Math.abs(nonGroupBalance) < 0.01) return null;

                  return (
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors bg-muted/20">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Direct / Non-group</p>
                          <p className="text-xs text-muted-foreground">Personal expenses</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className={`text-sm font-semibold ${nonGroupBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                          {isOwnProfile ? (
                            nonGroupBalance > 0 ? "You are owed" : "You owe"
                          ) : (
                            nonGroupBalance > 0 ? `${visitedUser.name} owes you` : `You owe ${visitedUser.name}`
                          )} {formatCurrency(Math.abs(nonGroupBalance))}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {displayedGroups.map(group => {
                  const groupExpenses = expenses.filter(exp => exp.groupId === group.id);
                  const groupPayments = payments.filter(pay => pay.groupId === group.id);

                  // Calculate balance for this group
                  const groupBalance = isOwnProfile
                    ? calculateUserBalance(currentUser.id, groupExpenses, groupPayments)
                    : calculateBalanceBetweenUsers(currentUser.id, visitedUser.id, groupExpenses, groupPayments);

                  return (
                    <Link to={`/groups/${group.id}`} key={group.id} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{group.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{group.name}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className="text-sm text-muted-foreground">{group.members.length} members</p>
                          <p className={`text-sm font-semibold ${groupBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                            {isOwnProfile ? (
                              groupBalance > 0 ? "You are owed" : "You owe"
                            ) : (
                              groupBalance > 0 ? `${visitedUser.name} owes you` : `You owe ${visitedUser.name}`
                            )} {formatCurrency(Math.abs(groupBalance))}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSettleAllOpen} onOpenChange={setIsSettleAllOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle All Balances</DialogTitle>
            <DialogDescription>
              You are about to settle all outstanding debts with {visitedUser.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total Amount</span>
              <span className="text-xl font-bold">{formatCurrency(totalSettleAmount)}</span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto text-sm text-muted-foreground">
              <p>Breakdown:</p>
              {paymentsToSettle.map(p => {
                const groupName = p.groupId ? groups.find(g => g.id === p.groupId)?.name : "Personal / Non-Group";
                return (
                  <div key={p.id} className="flex justify-between">
                    <span>{groupName}</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettleAllOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              await addBatchPayments(paymentsToSettle);
              setIsSettleAllOpen(false);
            }}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}