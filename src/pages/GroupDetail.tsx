import { useParams, Link, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@radix-ui/react-dialog"; // Import DialogClose

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Pencil, UserPlus, Trash, LogOut, Shield, Crown } from "lucide-react"; // Import new icons
import { formatCurrency, formatDate, getUserById, calculateBalanceBetweenUsers, getInitials } from "@/lib/utils";
import { Payment } from "@/types";
import { UserSearch } from "@/components/UserSearch";
import { TransferAdminDialog } from "@/components/TransferAdminDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { useAuth } from "@/contexts/AuthContext";

export default function GroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const { state, getExpensesByGroupId, addPayment, addMemberToGroup, removeMemberFromGroup, deleteGroup, sendReminder, refreshData } = useAppContext();
  const { groups, currentUser, payments, users } = state;
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  const [isSettleUpModalOpen, setIsSettleUpModalOpen] = useState(false);
  const [settlementAmount, setSettlementAmount] = useState("0.00");
  const [settlePayee, setSettlePayee] = useState<string | null>(null);
  const [settlePayer, setSettlePayer] = useState<string | null>(null);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const [isTransferAdminOpen, setIsTransferAdminOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expenseCount, setExpenseCount] = useState(0);
  const [fetchedGroup, setFetchedGroup] = useState<any>(null);
  const [isDeletedGroup, setIsDeletedGroup] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Find the group from context OR use fetched group
  const group = groups.find(g => g.id === groupId) || fetchedGroup;

  useEffect(() => {
    const fetchDeletedGroup = async () => {
      // If group is not in context and we haven't fetched it yet
      if (!groups.find(g => g.id === groupId) && groupId && !fetchedGroup) {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;

          const response = await fetch(`/api/groups/${groupId}?includeDeleted=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.deletedAt) {
              setIsDeletedGroup(true);
              // Add empty members array if needed to prevent crash, though backend returns users
              setFetchedGroup({
                ...data,
                members: data.users ? data.users.map((u: any) => u.id) : [],
              });
            }
          }
        } catch (err) {
          console.error("Failed to fetch group", err);
        }
      }
    };
    fetchDeletedGroup();
  }, [groupId, groups, fetchedGroup]);

  // Get group expenses (use fetched history if deleted)
  const expenses = isDeletedGroup && fetchedGroup?.Expenses
    ? fetchedGroup.Expenses.map((e: any) => ({
      ...e,
      amount: parseFloat(e.amount),
      splits: e.ExpenseSplits ? e.ExpenseSplits.map((s: any) => ({ ...s, amount: parseFloat(s.amount) })) : []
    })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : group
      ? getExpensesByGroupId(group.id).sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      : [];

  // Get group payments for balance calc if deleted
  const groupPayments = isDeletedGroup && fetchedGroup?.Payments
    ? fetchedGroup.Payments.map((p: any) => ({ ...p, amount: parseFloat(p.amount) }))
    : state.payments.filter(p => p.groupId === group?.id);

  // Get group members (safe for undefined group)
  const members = group && group.members
    ? group.members.map((memberId: string) => getUserById(memberId, state.users)).filter(Boolean)
    : [];

  // Check if current user is admin - MUST be before any early return
  useEffect(() => {
    if (!group) return;
    setIsAdmin(group.createdBy === authUser?.id || group.createdBy === currentUser.id);
    setExpenseCount(expenses.length);
  }, [group?.createdBy, authUser?.id, currentUser.id, expenses.length]);

  // Early return AFTER all hooks
  if (!group) {
    return (
      <AppLayout>
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold mb-4">Group not found</h1>
          <p className="text-muted-foreground mb-8">
            The group you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link to="/">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Calculate total expenses for the group dynamically
  const totalGroupExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Helper function to handle opening the modal and setting initial values
  const openSettleUpModal = (payerId: string, payeeId: string, amount: number) => {
    setSettlePayer(payerId);
    setSettlePayee(payeeId);
    setSettlementAmount(amount.toFixed(2));
    setIsSettleUpModalOpen(true);
  };

  const handleSettleUpConfirm = async () => {
    if (!settlePayer || !settlePayee || parseFloat(settlementAmount) <= 0) {
      alert("Please enter a valid amount and ensure payer/payee are selected.");
      return;
    }

    const newPayment: Payment = {
      id: crypto.randomUUID(),
      payerId: settlePayer,
      payeeId: settlePayee,
      amount: parseFloat(settlementAmount),
      date: format(new Date(), "yyyy-MM-dd"),
      groupId: group.id,
      notes: `Settlement for ${group.name}`,
    };

    await addPayment(newPayment);
    setIsSettleUpModalOpen(false);
    setSettlementAmount("0.00");
    setSettlePayee(null);
    setSettlePayer(null);
  };

  // Handle adding a new member to the group
  const handleAddMember = async () => {
    const input = newMemberEmail.trim();
    if (!input) {
      alert("Please enter an email or Custom ID for the new member.");
      return;
    }

    // Find the user by email or customId locally first
    const userToAdd = users.find(user =>
      user.email === input || user.customId === input
    );

    if (userToAdd) {
      if (group.members.includes(userToAdd.id)) {
        alert(`User '${userToAdd.name}' is already a member of this group.`);
        return;
      }
      await addMemberToGroup(group.id, { userId: userToAdd.id });
    } else {
      // User not found locally, try to add by identifier (backend will handle lookup or shadow creation if email)
      await addMemberToGroup(group.id, { identifier: input });
    }

    setNewMemberEmail(""); // Clear input
  };

  // Handle removing a member from the group
  const handleRemoveMember = (memberId: string) => {
    if (memberId === currentUser.id) {
      alert("You cannot remove yourself from the group this way. Please leave the group if you wish to exit.");
      return;
    }

    const success = removeMemberFromGroup(group.id, memberId);
    if (success) {
      alert("Member removed successfully.");
    } else {
      alert("Cannot remove member: They still have an outstanding balance in this group.");
    }
  };

  // Handle deleting the group
  const handleDeleteGroup = () => {
    if (!confirm("Are you sure you want to delete this group? This action is irreversible and will remove all associated expenses and payments.")) {
      return;
    }

    const success = deleteGroup(group.id);
    if (success) {
      alert("Group deleted successfully.");
      // Redirect to dashboard after successful deletion
      // This requires `useNavigate` from `react-router-dom`
      // For now, let's just refresh to simulate, or add `useNavigate` import.
      // Given we already have Link, we can add useNavigate.
      navigate("/");
    } else {
      alert("Cannot delete group: Ensure you are the admin and all members have zero balances.");
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-4 md:py-6 px-4 md:px-6">
        {/* Header - Stack on mobile */}
        {/* Header - Stack on mobile */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-bold">{group.name}</h1>
              {isDeletedGroup && (
                <span className="bg-destructive/10 text-destructive text-sm px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <Trash className="h-3 w-3" /> Deleted
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {members.length} members • Created by {getUserById(group.createdBy, state.users)?.name || "Unknown"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isDeletedGroup && (
              <>
                <Button variant="outline" size="icon" onClick={() => setIsEditGroupModalOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Link to={`/expenses/new?groupId=${group.id}`}>
                  <Button size="sm" className="md:h-10">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Expense</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </Link>
              </>
            )}
            {isDeletedGroup && (
              <div className="p-2 bg-muted text-muted-foreground text-sm rounded-md border">
                Read Only Mode
              </div>
            )}
          </div>
        </div>

        {isDeletedGroup && (
          <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 p-4 rounded-lg mb-6 flex items-center gap-2 border border-amber-200 dark:border-amber-800">
            <Shield className="h-5 w-5" />
            <p>This group was deleted. You can view its history, but cannot add new expenses or members.</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-3">Overview</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm px-2 sm:px-3">Expenses</TabsTrigger>
            <TabsTrigger value="balances" className="text-xs sm:text-sm px-2 sm:px-3">Balances</TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm px-2 sm:px-3">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Group summary card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Group Summary</CardTitle>
                  <CardDescription>Overview of group expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Total expenses</dt>
                      <dd className="text-sm font-medium">{formatCurrency(totalGroupExpenses)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Number of expenses</dt>
                      <dd className="text-sm font-medium">{expenses.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Created</dt>
                      <dd className="text-sm font-medium">{formatDate(group.createdAt)}</dd>
                    </div>
                    {isDeletedGroup && group.deletedAt && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-destructive">Deleted</dt>
                        <dd className="text-sm font-medium text-destructive">{formatDate(group.deletedAt)}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Your summary card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Your Summary</CardTitle>
                  <CardDescription>Your expenses in this group</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Total paid by you</dt>
                      <dd className="text-sm font-medium">
                        {formatCurrency(
                          (expenses
                            .filter(e => e.paidBy === currentUser.id)
                            .reduce((sum, e) => sum + e.amount, 0)) +
                          (groupPayments
                            .filter((p: any) => p.payerId === currentUser.id)
                            .reduce((sum: number, p: any) => sum + p.amount, 0))
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Total share</dt>
                      <dd className="text-sm font-medium">
                        {formatCurrency(
                          expenses
                            .flatMap(e => e.splits)
                            .filter(s => s.userId === currentUser.id)
                            .reduce((sum, s) => sum + s.amount, 0)
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Net balance</dt>
                      <dd className="text-sm font-medium">
                        {formatCurrency(
                          // (Expenses Paid + Payments Made) - (Expense Share + Payments Received)
                          ((expenses
                            .filter(e => e.paidBy === currentUser.id)
                            .reduce((sum, e) => sum + e.amount, 0)) +
                            (groupPayments
                              .filter((p: any) => p.payerId === currentUser.id)
                              .reduce((sum: number, p: any) => sum + p.amount, 0))) -

                          ((expenses
                            .flatMap(e => e.splits)
                            .filter(s => s.userId === currentUser.id)
                            .reduce((sum, s) => sum + s.amount, 0)) +
                            (groupPayments
                              .filter((p: any) => p.payeeId === currentUser.id)
                              .reduce((sum: number, p: any) => sum + p.amount, 0)))
                        )}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Recent activity card */}
              <Card className="md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest group expenses</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {expenses.slice(0, 3).map((expense) => {
                    const payer = getUserById(expense.paidBy, state.users);
                    return (
                      <div key={expense.id} className="flex items-center gap-2">
                        <div
                          onClick={() => navigate(`/expenses/${expense.id}`)}
                          className="flex items-center gap-2 w-full hover:bg-accent p-2 rounded-md transition-colors cursor-pointer"
                        >
                          <Link
                            to={`/users/${payer?.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Avatar className="h-8 w-8 text-foreground">
                              <AvatarImage src={payer?.avatar} alt={payer?.name} />
                              <AvatarFallback>{payer ? getInitials(payer.name) : "UN"}</AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{expense.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {payer?.id === currentUser.id ? (
                                <Link to={`/users/${currentUser.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline font-medium text-foreground">You</Link>
                              ) : (
                                <Link to={`/users/${payer?.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline font-medium text-foreground">{payer?.name}</Link>
                              )} paid {formatCurrency(expense.amount)}
                            </p>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(expense.date)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {expenses.length > 3 && (
                    <Button variant="ghost" className="w-full" size="sm" onClick={() => setActiveTab("expenses")}>View all expenses</Button>
                  )}
                  {expenses.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expenses yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Group Expenses</CardTitle>
                <CardDescription>All expenses in this group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No expenses yet</p>
                      <Link to={`/expenses/new?groupId=${group.id}`}>
                        <Button className="mt-4">Add First Expense</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expenses.map((expense) => {
                        const payer = getUserById(expense.paidBy, state.users);
                        return (
                          <div
                            key={expense.id}
                            onClick={() => navigate(`/expenses/${expense.id}`)}
                            className="flex items-center justify-between p-4 rounded-lg hover:bg-accent cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <Link
                                to={`/users/${payer?.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Avatar className="h-10 w-10 text-foreground">
                                  <AvatarImage src={payer?.avatar} alt={payer?.name} />
                                  <AvatarFallback>{payer ? getInitials(payer.name) : "UN"}</AvatarFallback>
                                </Avatar>
                              </Link>
                              <div>
                                <p className="font-medium">{expense.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {payer?.id === currentUser.id ? (
                                    <Link to={`/users/${currentUser.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline font-medium text-foreground">You</Link>
                                  ) : (
                                    <Link to={`/users/${payer?.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline font-medium text-foreground">{payer?.name}</Link>
                                  )} paid {formatCurrency(expense.amount)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm">{formatDate(expense.date)}</p>
                              <p className="text-xs text-muted-foreground">{expense.category}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Group Balances</CardTitle>
                <CardDescription>
                  Who owes whom in the group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member: any) => {
                    if (member?.id === currentUser.id) return null;

                    const balance = calculateBalanceBetweenUsers(
                      currentUser.id,
                      member?.id as string,
                      expenses, // Use local expenses var which already handles deleted logic
                      groupPayments // Use local groupPayments
                    );

                    // Epsilon check for floating point precision issues
                    if (Math.abs(balance) < 0.01) return null;

                    return (
                      <Link to={`/users/${member?.id}`} key={member?.id} className="block">
                        <div
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-accent cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member?.avatar} alt={member?.name} />
                              <AvatarFallback>{member ? getInitials(member.name) : "UN"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member?.name}</p>
                              {balance > 0 ? (
                                <p className="text-sm text-green-600 dark:text-green-400">
                                  Owes you {formatCurrency(balance)}
                                </p>
                              ) : (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  You owe {formatCurrency(Math.abs(balance))}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={balance > 0 ? "outline" : "default"}
                            size="sm"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (balance > 0) {
                                // Remind logic
                                await sendReminder(
                                  member?.id as string,
                                  `Friendly reminder: You owe me ${formatCurrency(balance)} in group "${group.name}".`
                                );
                              } else {
                                // Settle Up logic
                                openSettleUpModal(currentUser.id, member?.id as string, Math.abs(balance));
                              }
                            }}
                          >
                            {balance > 0 ? "Remind" : "Settle Up"}
                          </Button>
                        </div>
                      </Link>
                    );
                  })}

                  {members.every((m) => m?.id === currentUser.id || calculateBalanceBetweenUsers(currentUser.id, m?.id as string, getExpensesByGroupId(group.id), state.payments.filter(p => p.groupId === group.id)) === 0) && (
                    <p className="text-center py-8 text-muted-foreground">
                      No outstanding balances
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Group Members</CardTitle>
                <CardDescription>People in this group</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {members.map((member) => (
                    <Link
                      to={`/users/${member?.id}`}
                      key={member?.id}
                      className="flex items-center justify-between p-4 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member?.avatar} alt={member?.name} />
                          <AvatarFallback>{member ? getInitials(member.name) : "UN"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member?.id === currentUser.id ? "You" : member?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member?.email} • ID: {member?.customId}
                          </p>
                        </div>
                      </div>
                      {member?.id === currentUser.id && (
                        <p className="text-xs text-muted-foreground">
                          You
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Settle Up Modal */}
      <Dialog open={isSettleUpModalOpen} onOpenChange={setIsSettleUpModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Up</DialogTitle>
            <DialogDescription>
              Record a payment between {getUserById(settlePayer || "", users)?.name} and {getUserById(settlePayee || "", users)?.name}.
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
            <Button onClick={handleSettleUpConfirm}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Modal */}
      <Dialog open={isEditGroupModalOpen} onOpenChange={setIsEditGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group: {group.name}</DialogTitle>
            <DialogDescription>Manage members and group settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Members List */}
            <div>
              <h3 className="text-lg font-medium mb-2">Members</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
                      </Avatar>
                      <span>{member.name} <span className="text-xs text-muted-foreground">({member.customId})</span> {member.id === currentUser.id && "(You)"}</span>
                    </div>
                    {member.id !== currentUser.id && (
                      <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(member.id)}>Remove</Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Member */}
            <div>
              <h3 className="text-lg font-medium mb-2">Add Member</h3>
              <div className="flex gap-2">
                <UserSearch
                  onSelect={(value) => setNewMemberEmail(value)}
                  placeholder="Search by name, email, or ID..."
                  className="flex-grow"
                />
                <Button onClick={handleAddMember}><UserPlus className="mr-2 h-4 w-4" />Add</Button>
              </div>
            </div>

            {/* Admin Controls */}
            {isAdmin && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-500" />
                  Admin Controls
                </h3>

                {/* Transfer Admin */}
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Transfer admin role to another member before leaving the group.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setIsTransferAdminOpen(true)}
                    disabled={members.length <= 1}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Transfer Admin Role
                  </Button>
                </div>

                {/* Delete Group */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium mb-2 text-red-600">Danger Zone</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Delete this group and all its expenses. History will be available for 4 days.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteGroupOpen(true)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete Group
                  </Button>
                </div>
              </div>
            )}

            {/* Leave Group (for non-admins) */}
            {!isAdmin && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  Leave Group
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  You must leave all expenses in this group before you can leave.
                </p>
                <Button variant="outline" disabled>
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Group (Coming Soon)
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Admin Dialog */}
      <TransferAdminDialog
        open={isTransferAdminOpen}
        onOpenChange={setIsTransferAdminOpen}
        groupId={group.id}
        groupName={group.name}
        members={members.map(m => ({
          id: m?.id || '',
          name: m?.name || '',
          email: m?.email || '',
          avatar: m?.avatar
        }))}
        currentAdminId={authUser?.id || currentUser.id}
        onSuccess={() => {
          setIsAdmin(false);
          setIsEditGroupModalOpen(false);
        }}
      />

      {/* Delete Group Dialog */}
      <DeleteGroupDialog
        open={isDeleteGroupOpen}
        onOpenChange={setIsDeleteGroupOpen}
        groupId={group.id}
        groupName={group.name}
        expenseCount={expenseCount}
        onSuccess={async () => {
          await refreshData();
          navigate('/');
        }}
      />
    </AppLayout>
  );
}