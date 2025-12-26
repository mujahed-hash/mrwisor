import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, getUserById, calculateBalanceBetweenUsers } from "@/lib/utils";
import { MessageSquare, Send, Edit, DollarSign, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { Payment } from "@/types";
import { PurchaseItemsList } from "@/components/expenses/PurchaseItemsList";
import { LeaveExpenseDialog } from "@/components/LeaveExpenseDialog";

export default function ExpenseDetail() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const { state, addComment, updateExpense, addPayment, refreshData } = useAppContext();
  const { expenses, users, groups, currentUser } = state;
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [localExpense, setLocalExpense] = useState<any>(null);
  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("0.00");
  const [isLeaveExpenseOpen, setIsLeaveExpenseOpen] = useState(false);
  const expense = localExpense || expenses.find(e => e.id === expenseId);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Logic to determine if user owes money for this specific expense
  const userSplit = (expense?.splits || expense?.ExpenseSplits || []).find((s: any) => s.userId === currentUser.id);
  const userOwes = userSplit && expense.paidBy !== currentUser.id;

  const handleOpenSettleUp = () => {
    if (userSplit) {
      setSettlementAmount(userSplit.amount.toFixed(2));
    }
    setIsSettleUpModalOpen(true);
  };

  const handleSettleUpConfirm = async () => {
    if (!expense) return;

    // If I am the payer (which shouldn't happen for Settle Up button logic usually, unless reminding), logic varies.
    // Assuming Settle Up means "I pay the Payer".

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      payerId: currentUser.id,
      payeeId: expense.paidBy,
      amount: parseFloat(settlementAmount),
      date: format(new Date(), "yyyy-MM-dd"),
      groupId: expense.groupId,
      notes: `Settlement for: ${expense.description}`,
    };

    await addPayment(newPayment);
    setIsSettleUpModalOpen(false);
  };

  // Fetch full expense details including comments when component mounts
  const fetchExpenseDetails = async () => {
    if (!expenseId) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/expenses/${expenseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLocalExpense(data);

        // Check if we need to poll
        if (data.scanStatus === 'PROCESSING' || data.scanStatus === 'PENDING') {
          // Only start if not already polling or just continue
          // We'll rely on the useEffect dependency or start logic below
          return true; // Indicates we should continue polling
        }
      }
    } catch (error) {
      console.error("Failed to fetch expense details", error);
    }
    return false; // Stop polling
  };

  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    fetchExpenseDetails().then((shouldPoll) => {
      if (shouldPoll && isMounted) {
        pollingIntervalRef.current = setInterval(async () => {
          const keepPolling = await fetchExpenseDetails();
          if (!keepPolling && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
          }
        }, 3000); // Poll every 3 seconds
      }
    });

    return () => {
      isMounted = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [expenseId]);

  if (!expense) {
    return (
      <AppLayout>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Expense not found</h1>
          <p className="text-muted-foreground mb-8">
            The expense you're looking for doesn't exist.
          </p>
          <Link to="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const payer = getUserById(expense.paidBy, users);
  const group = expense.groupId ? groups.find(g => g.id === expense.groupId) : null;

  const handleAddComment = async () => {
    if (!newComment.trim() || !expense) return;

    setIsSubmittingComment(true);
    try {
      const addedComment = await addComment(expense.id, newComment);

      // Update local state to include the new comment immediately
      if (localExpense) {
        setLocalExpense({
          ...localExpense,
          comments: [...(localExpense.comments || []), addedComment]
        });
      } else {
        // If we don't have localExpense yet but context expense exists, create structure
        // But ideally useEffect has run. Let's trigger a re-fetch or manual update
        // Manual update is faster for UX
        setLocalExpense({
          ...expense,
          comments: [...(expense.comments || []), addedComment]
        });
      }

      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold break-words">{expense.description}</h1>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {(() => {
              // Ensure helper is imported
              // Safety check for expense
              if (!expense) return null;

              const splits = expense.splits || expense.ExpenseSplits || [];
              const userSplit = splits.find((s: any) => s.userId === currentUser.id);
              // Basic check: do I have a split and am I NOT the payer?
              const isInData = userSplit && expense.paidBy !== currentUser.id;

              if (isInData) {
                // Smart Check: Do I *actually* still owe this person money IN THIS GROUP?
                // normalize first (already done above in normalizedExpense definition logic which needs to be inside or before this)

                const normalizedExpense = {
                  ...expense,
                  splits: expense.splits || expense.ExpenseSplits || []
                };
                const effectiveExpenses = expenses.map(e => e.id === expense.id ? normalizedExpense : e);

                // Scope to Group if exists
                const relevantExpenses = expense.groupId
                  ? effectiveExpenses.filter(e => e.groupId === expense.groupId)
                  : effectiveExpenses; // Or filter where !groupId if we want strict personal separation

                const relevantPayments = expense.groupId
                  ? state.payments.filter(p => p.groupId === expense.groupId)
                  : state.payments;

                const groupBalance = calculateBalanceBetweenUsers(
                  currentUser.id,
                  expense.paidBy,
                  relevantExpenses,
                  relevantPayments
                );

                // groupBalance < 0 means I owe them (net) in this group context.
                // If >= 0 (or negligible amount), I don't owe them.

                if (groupBalance >= -0.005) {
                  return (
                    <Button variant="outline" disabled className="text-muted-foreground border-dashed cursor-not-allowed flex-1 md:flex-none">
                      Settled Up
                    </Button>
                  );
                }

                // If I owe them in group, pay up to the split amount, capped at total group debt.
                const amountToPay = Math.min(userSplit.amount, Math.abs(groupBalance));

                if (amountToPay < 0.01) {
                  return (
                    <Button variant="outline" disabled className="text-muted-foreground border-dashed cursor-not-allowed flex-1 md:flex-none">
                      Settled Up
                    </Button>
                  );
                }

                return (
                  <Button
                    variant="outline"
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 flex-1 md:flex-none"
                    onClick={() => {
                      setSettlementAmount(amountToPay.toFixed(2));
                      setIsSettleUpModalOpen(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Settle Up {amountToPay < userSplit.amount && "(Remaining)"}
                  </Button>
                );
              }
              return null;
            })()}

            {/* Leave Expense - show for users in the expense (except payer) */}
            {userSplit && expense.paidBy !== currentUser.id && (
              <Button
                variant="outline"
                className="flex-1 md:flex-none text-orange-600 border-orange-200 hover:bg-orange-50"
                onClick={() => setIsLeaveExpenseOpen(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Expense
              </Button>
            )}

            <Button variant="outline" className="flex-1 md:flex-none" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Link to={group ? `/groups/${group.id}` : "/"} className="flex-1 md:flex-none">
              <Button variant="ghost" className="w-full">Back</Button>
            </Link>
          </div>
        </div>

        {/* Settle Up Modal */}
        <Dialog open={isSettleUpModalOpen} onOpenChange={setIsSettleUpModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Settle Up Expense</DialogTitle>
              <DialogDescription>
                Pay back {payer?.name} for "{expense.description}"
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={settlementAmount}
                  onChange={(e) => setSettlementAmount(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettleUpModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!expense) return;
                const newPayment: Payment = {
                  id: crypto.randomUUID(),
                  payerId: currentUser.id,
                  payeeId: expense.paidBy,
                  amount: parseFloat(settlementAmount),
                  date: format(new Date(), "yyyy-MM-dd"),
                  groupId: expense.groupId,
                  notes: `Settlement for: ${expense.description}`,
                };

                await addPayment(newPayment);
                setIsSettleUpModalOpen(false);
              }}>Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{expense.description}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Amount</p>
                    <p className="text-lg font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Date</p>
                    <p className="text-lg font-bold">{formatDate(expense.date)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Paid By</p>
                    <p className="text-lg font-bold">
                      {payer ? (
                        <Link to={`/users/${payer.id}`} className="hover:underline text-primary">
                          {payer.name}
                        </Link>
                      ) : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Category</p>
                    <p className="text-lg font-bold">{expense.category}</p>
                  </div>
                </div>

                {group && (
                  <div>
                    <p className="text-muted-foreground text-sm">Group</p>
                    <p className="text-lg font-bold">{group.name}</p>
                  </div>
                )}

                {expense.notes && (
                  <div>
                    <p className="text-muted-foreground text-sm">Notes</p>
                    <p className="text-lg font-bold">{expense.notes}</p>
                  </div>
                )}

                <h2 className="text-xl font-bold mt-6">Split Details</h2>
                <div className="space-y-2">
                  {(expense.splits || expense.ExpenseSplits || []).map((split: any) => {
                    const member = getUserById(split.userId, users);
                    return (
                      <div key={split.userId} className="flex justify-between items-center">
                        <p className="text-sm">
                          {member ? (
                            <Link to={`/users/${member.id}`} className="hover:underline">
                              {member.name}
                            </Link>
                          ) : "Unknown"}
                        </p>
                        <p className="text-sm font-medium">{formatCurrency(split.amount, expense.currency)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Purchase Items and Receipt Section */}
                {(expense.receipt || (expense.purchaseItems && expense.purchaseItems.length > 0) || expense.scanStatus === 'PROCESSING') && (
                  <div className="mt-8 pt-6 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Purchase Items List */}
                      <div>
                        <h2 className="text-xl font-bold mb-4">Purchase Items</h2>
                        <PurchaseItemsList
                          items={expense.purchaseItems || []}
                          status={expense.scanStatus}
                          currency={expense.currency}
                        />
                      </div>

                      {/* Receipt Image */}
                      <div>
                        {expense.receipt && (
                          <div>
                            <h2 className="text-xl font-bold mb-4">Receipt Image</h2>
                            <img
                              src={expense.receipt}
                              alt="Receipt"
                              className="w-full rounded-md border shadow-sm"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 mb-4 pr-2">
                  {expense.comments && expense.comments.length > 0 ? (
                    expense.comments.map((comment: any) => (
                      <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm">
                            {(comment.user || getUserById(comment.userId, users)) ? (
                              <Link to={`/users/${(comment.user || getUserById(comment.userId, users))?.id}`} className="hover:underline">
                                {(comment.user || getUserById(comment.userId, users))?.name}
                              </Link>
                            ) : "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No comments yet</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleAddComment} disabled={isSubmittingComment || !newComment.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Leave Expense Dialog */}
      {expense && userSplit && (
        <LeaveExpenseDialog
          open={isLeaveExpenseOpen}
          onOpenChange={setIsLeaveExpenseOpen}
          expenseId={expense.id}
          expenseDescription={expense.description}
          userShare={userSplit.amount}
          onSuccess={async () => {
            await refreshData();
            // Navigate back to group or home
            if (group) {
              navigate(`/groups/${group.id}`);
            } else {
              navigate('/');
            }
          }}
        />
      )}
    </AppLayout>
  );
}