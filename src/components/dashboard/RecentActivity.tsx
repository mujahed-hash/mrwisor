import { useState } from "react";
import { formatCurrency, formatDate, getUserById } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import { Link } from "react-router-dom";
import { InFeedAd } from "@/components/ads/InFeedAd";

export function RecentActivity() {
  const { state } = useAppContext();
  const { expenses, payments, currentUser, users } = state;

  // Combine expenses and payments with original index to ensure stable sort for same-day items
  const activities = [
    ...expenses.map((e, index) => ({ ...e, type: 'expense', originalIndex: index })),
    ...payments.map((p, index) => ({ ...p, type: 'payment', description: 'Payment', originalIndex: index + 10000 })) // Offset to keep payments usually separate or just rely on date
  ];

  // Sort by date (newest first), then by createdAt (newest first)
  const sortedActivities = activities.sort((a, b) => {
    // Primary sort: Date
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;

    // Secondary sort: CreatedAt (if available)
    if (a.createdAt && b.createdAt) {
      const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (createdDiff !== 0) return createdDiff;
    }

    // Tertiary sort: ID (for stability)
    return b.id.localeCompare(a.id);
  });

  // Limit to 5 recent items
  const recentActivities = sortedActivities.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your recent expenses and settlements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            recentActivities.map((item: any, index: number) => {
              const isExpense = item.type === 'expense';
              const payer = getUserById(isExpense ? item.paidBy : item.payerId, users);
              const isCurrentUserPayer = (isExpense ? item.paidBy : item.payerId) === currentUser.id;

              // Helper for description logic
              const renderDescription = () => {
                if (isExpense) return item.description;
                // Payment description
                const payee = getUserById(item.payeeId, users);
                return isCurrentUserPayer
                  ? `You paid ${payee?.name || 'someone'}`
                  : `${payer?.name || 'Someone'} paid you`;
              };

              return (
                <div key={`${item.type}-${item.id}`} className="block">
                  <div className="flex items-center group">
                    <Link
                      to={isExpense ? `/expenses/${item.id}` : '#'}
                      className={`flex-1 flex items-center p-2 rounded-md hover:bg-muted/50 transition-colors ${!isExpense && 'cursor-default'}`}
                    >
                      <div className="mr-4">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={payer?.avatar} alt={payer?.name} />
                          <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between">
                          <p className="text-sm font-medium leading-none">
                            {renderDescription()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(item.date)}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {isExpense ? (
                              isCurrentUserPayer ? "You paid total" : `${payer?.name} paid total`
                            ) : "Settlement"}
                          </p>
                          <p className={`text-sm font-medium ${isCurrentUserPayer && !isExpense ? 'text-green-600' : 'text-blue-600'}`}>
                            {formatCurrency(item.amount)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </div>
                  {index === 1 && <div className="my-2"><InFeedAd /></div>}
                </div>
              );
            })
          )}

          <div className="flex justify-center">
            <Link to="/expenses">
              <Button variant="outline">View All Activity</Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}