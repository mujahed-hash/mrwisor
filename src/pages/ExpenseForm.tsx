import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import {
  CalendarIcon,
  Receipt as ReceiptIcon,
  ReceiptText,
  Search,
  X,
  Check,
  ChevronsUpDown,
  Loader2,
  Sparkles
} from "lucide-react";
import { EXPENSE_CATEGORIES, SPLIT_METHODS, CURRENCIES } from "@/lib/constants";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Expense, Split, User } from "@/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function ExpenseForm() {
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const { state, addExpense, updateExpense } = useAppContext();
  const { groups, users, currentUser, expenses } = state;
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize mode from URL, default to 'shared' if not present or invalid
  const urlMode = searchParams.get("mode");
  const [mode, setMode] = useState<"shared" | "personal">(
    (urlMode === "personal") ? "personal" : "shared"
  );

  const isPersonalMode = mode === "personal";

  // Sync mode state with URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    if (mode === "personal") {
      newParams.set("mode", "personal");
    } else {
      newParams.delete("mode");
    }
    setSearchParams(newParams);
  }, [mode, setSearchParams]);

  const isEditMode = !!expenseId;

  const [date, setDate] = useState<Date>(new Date());
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>(currentUser.id);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0].id);
  const [groupId, setGroupId] = useState<string>(searchParams.get("groupId") || "");
  const [splitMethod, setSplitMethod] = useState<string>("equal");
  const [currency, setCurrency] = useState<string>("USD");
  const [notes, setNotes] = useState<string>("");

  // For receipt image
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);


  // Members to split with
  const [selectedMembers, setSelectedMembers] = useState<string[]>([currentUser.id]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // For percentage and exact amount splits
  const [splitValues, setSplitValues] = useState<Record<string, number>>({});

  // For validating splits
  const [splitErrors, setSplitErrors] = useState<string>("");

  // Get active members based on selection
  const activeMembers = selectedMembers.map(id => users.find(u => u.id === id)).filter(Boolean) as User[];

  // Load expense data if in edit mode
  useEffect(() => {
    if (isEditMode && expenseId) {
      const expenseToEdit = expenses.find(e => e.id === expenseId);
      if (expenseToEdit) {
        setDescription(expenseToEdit.description);
        setAmount(expenseToEdit.amount.toString());
        setPaidBy(expenseToEdit.paidBy);
        setCategory(expenseToEdit.category);
        setGroupId(expenseToEdit.groupId || "");
        setSplitMethod(expenseToEdit.splitType.toLowerCase());
        setCurrency(expenseToEdit.currency);
        setNotes(expenseToEdit.notes || "");
        setDate(new Date(expenseToEdit.date));
        setReceipt(expenseToEdit.receipt || null);

        // Set selected members and split values
        const memberIds = expenseToEdit.splits.map(s => s.userId);
        setSelectedMembers(memberIds);

        const newSplitValues: Record<string, number> = {};
        expenseToEdit.splits.forEach(s => {
          if (expenseToEdit.splitType === 'PERCENTAGE') {
            newSplitValues[s.userId] = s.percentage || 0;
          } else {
            newSplitValues[s.userId] = s.amount;
          }
        });
        setSplitValues(newSplitValues);
      }
    }
  }, [isEditMode, expenseId, expenses]);

  // Initialize split values when component mounts or split method/members/amount change
  useEffect(() => {
    if (!isEditMode) { // Only reset if not in edit mode (or handle carefully)
      // Actually we might want to recalculate if user changes things in edit mode too
      // But we need to be careful not to overwrite loaded values immediately
      // For now, let's just rely on manual changes or method switch
    }
    // Simple logic: if method changes, reset. If amount changes, re-calc equal/percentage?
    // This part is tricky in edit mode. Let's keep it simple:
    // If user changes split method, reset values.
  }, [splitMethod]);

  // Auto-select group members if a groupId is present in the URL and split method is equal
  useEffect(() => {
    if (groupId && !isEditMode && !isPersonalMode) { // Only auto-select on create if NOT personal mode
      const group = groups.find(g => g.id === groupId);
      if (group) {
        if (selectedMembers.length === 1 && selectedMembers[0] === currentUser.id) {
          setSelectedMembers([...new Set(group.members)]);
        } else if (splitMethod === "equal") {
          setSelectedMembers([...new Set(group.members)]);
        }
      }
    }
  }, [groupId, groups, splitMethod, isEditMode, isPersonalMode]);

  // Update split values when members or split method changes
  const resetSplitValues = () => {
    const newSplitValues: Record<string, number> = {};

    if (splitMethod === "equal") {
      const equalValue = 100 / selectedMembers.length;
      selectedMembers.forEach(id => {
        newSplitValues[id] = equalValue;
      });
    } else if (splitMethod === "percentage") {
      selectedMembers.forEach(id => {
        newSplitValues[id] = id === currentUser.id ? 100 : 0;
      });
    } else if (splitMethod === "exact") {
      const expenseAmount = parseFloat(amount) || 0;
      selectedMembers.forEach(id => {
        newSplitValues[id] = id === currentUser.id ? expenseAmount : 0;
      });
    }

    setSplitValues(newSplitValues);
    setSplitErrors("");
  };

  // Trigger reset only when method changes explicitly by user interaction (handled by onChange)
  // Or we can use a separate effect for method change.
  useEffect(() => {
    if (!isEditMode) {
      resetSplitValues();
    }
  }, [splitMethod, selectedMembers.length]);


  // Update split values when selected members change
  const handleMemberToggle = (userId: string) => {
    if (userId === currentUser.id) return;

    let newSelectedMembers: string[];

    if (selectedMembers.includes(userId)) {
      newSelectedMembers = selectedMembers.filter(id => id !== userId);
    } else {
      newSelectedMembers = [...selectedMembers, userId];
    }

    setSelectedMembers(newSelectedMembers);
  };

  // Update percentage for a specific user
  const handlePercentageChange = (userId: string, value: number) => {
    const newSplitValues = { ...splitValues };
    newSplitValues[userId] = value;

    const total = Object.values(newSplitValues).reduce((sum, val) => sum + val, 0);

    if (total > 100) {
      setSplitErrors("Total percentage exceeds 100%");
    } else {
      setSplitErrors("");
    }

    setSplitValues(newSplitValues);
  };

  // Update exact amount for a specific user
  const handleExactAmountChange = (userId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newSplitValues = { ...splitValues };
    newSplitValues[userId] = numValue;

    const total = Object.values(newSplitValues).reduce((sum, val) => sum + val, 0);
    const expenseAmount = parseFloat(amount) || 0;

    if (total > expenseAmount) {
      setSplitErrors(`Total exceeds expense amount (${formatCurrency(expenseAmount)})`);
    } else if (total < expenseAmount) {
      setSplitErrors(`Total is less than expense amount (${formatCurrency(expenseAmount)})`);
    } else {
      setSplitErrors("");
    }

    setSplitValues(newSplitValues);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !amount || Number(amount) <= 0) {
      alert("Please enter a valid description and amount");
      return;
    }

    // Upload receipt first if exists
    let receiptUrl = receipt;
    if (receiptFile) {
      try {
        const formData = new FormData();
        formData.append('file', receiptFile);

        // Show loading state for upload
        const toastId = toast.loading("Uploading receipt...");

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Receipt upload failed');
        const { url } = await uploadRes.json();
        receiptUrl = url;
        toast.dismiss(toastId);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload receipt image. Continuing without it.");
        receiptUrl = null;
      }
    } else if (receipt && receipt.startsWith('data:image')) {
      // Fallback: If no file object but we have base64 (e.g. from camera in future), convert to blob and upload?
      // For now, simpler to warn or skip. Or just let it fail if backend still allows base64 (but we want to avoid it).
      // Given the performance goal, let's try to avoid sending base64. 
      // But if the user didn't change the file (edit mode), receiptUrl is already a URL.
    }


    const amountValue = parseFloat(amount);
    const splits: Split[] = [];

    // Force simple split for Personal Mode
    if (isPersonalMode) {
      splits.push({
        userId: currentUser.id,
        amount: amountValue
      });
    } else {
      if (splitMethod === "equal") {
        const count = selectedMembers.length;
        // Calculate base share rounded down to 2 decimals
        const baseShare = Math.floor((amountValue / count) * 100) / 100;
        // Calculate remainder (pennies)
        const remainder = Math.round((amountValue - (baseShare * count)) * 100);

        selectedMembers.forEach((userId, index) => {
          let share = baseShare;
          // Distribute remainder pennies to the first few users
          if (index < remainder) {
            share = Number((share + 0.01).toFixed(2));
          }

          splits.push({
            userId,
            amount: share
          });
        });
      } else if (splitMethod === "percentage") {
        const totalPercentage = Object.values(splitValues).reduce((sum, val) => sum + val, 0);

        if (Math.abs(totalPercentage - 100) > 0.1) {
          alert("Percentages must add up to 100%");
          return;
        }

        selectedMembers.forEach(userId => {
          const percentage = splitValues[userId] || 0;
          splits.push({
            userId,
            amount: (percentage / 100) * amountValue,
            percentage
          });
        });
      } else if (splitMethod === "exact") {
        const totalAmount = Object.values(splitValues).reduce((sum, val) => sum + val, 0);

        if (Math.abs(totalAmount - amountValue) > 0.01) {
          alert(`Amounts must add up to ${formatCurrency(amountValue)}`);
          return;
        }

        selectedMembers.forEach(userId => {
          splits.push({
            userId,
            amount: splitValues[userId] || 0
          });
        });
      }
    }

    const expenseData: Partial<Expense> = {
      description,
      amount: amountValue,
      paidBy,
      date: date.toISOString().split('T')[0],
      groupId: isPersonalMode ? undefined : (groupId || undefined),
      category,
      notes,
      currency,
      splitType: isPersonalMode ? 'EQUAL' : (splitMethod.toUpperCase() as 'EQUAL' | 'PERCENTAGE' | 'SHARES' | 'EXACT' | 'ADJUSTMENT'),
      splits,
      receipt: receiptUrl || undefined,
    };

    if (isEditMode && expenseId) {
      await updateExpense(expenseId, expenseData);
    } else {
      const newExpense: Expense = {
        id: `e${Date.now()}`,
        ...expenseData as any
      };
      await addExpense(newExpense);
    }

    if (isPersonalMode) {
      navigate("/personal-expenses");
    } else {
      navigate(isEditMode ? `/expenses/${expenseId}` : "/");
    }
  };

  // Get group members if a group is selected
  const getGroupMembers = () => {
    if (!groupId) return users;

    const group = groups.find(g => g.id === groupId);
    if (!group) return users;

    return users.filter(user => group.members.includes(user.id));
  };

  // Calculate total of current splits
  const calculateSplitTotal = () => {
    if (splitMethod === "percentage") {
      return Object.values(splitValues).reduce((sum, val) => sum + val, 0);
    } else if (splitMethod === "exact") {
      return Object.values(splitValues).reduce((sum, val) => sum + val, 0);
    }
    return 0;
  };

  const getPageTitle = () => {
    if (isEditMode) return "Edit Expense";
    return isPersonalMode ? "Add Personal Expense" : "Add Shared Expense";
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold">
            {isEditMode ? "Edit Expense" : "Add Expense"}
          </h1>

          <ToggleGroup type="single" value={mode} onValueChange={(val) => {
            if (val) setMode(val as "shared" | "personal");
          }}>
            <ToggleGroupItem value="shared" aria-label="Shared Expense">
              Shared
            </ToggleGroupItem>
            <ToggleGroupItem value="personal" aria-label="Personal Expense">
              Personal
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Details</CardTitle>
                  <CardDescription>Enter the details of your expense</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Group - HIDDEN IN PERSONAL MODE */}
                  {!isPersonalMode && (
                    <div className="space-y-2">
                      <Label htmlFor="group">Group (optional)</Label>
                      <Select value={groupId} onValueChange={setGroupId}>
                        <SelectTrigger id="group">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            if (!Array.isArray(groups)) return <SelectItem value="error" disabled>Error</SelectItem>;
                            if (groups.length === 0) return <SelectItem value="no-groups" disabled>No groups</SelectItem>;
                            return groups.map((group) => (
                              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="What was this expense for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  {/* Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        placeholder="0.00"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          id="date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(date) => date && setDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>



                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about this expense"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Receipt */}
                  <div className="space-y-2">
                    <Label>Receipt (optional)</Label>
                    <input
                      type="file"
                      id="receipt-upload"
                      className="hidden"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            alert("File size must be less than 10MB");
                            return;
                          }
                          setReceiptFile(file); // Store file for upload
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReceipt(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />

                    {!receipt ? (
                      <div
                        className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                      >
                        <ReceiptText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          Click to upload receipt image
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports JPG, PNG up to 10MB
                        </p>
                      </div>
                    ) : (
                      <div className="relative border rounded-lg p-2 group">
                        <img
                          src={receipt}
                          alt="Receipt preview"
                          className="max-h-48 mx-auto rounded object-contain"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                          {receiptFile && (
                            <div className="hidden" />
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setReceipt(null);
                              setReceiptFile(null);
                              const input = document.getElementById('receipt-upload') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column - Payment & Split Details */}
            {/* HIDDEN IN PERSONAL MODE */}
            {!isPersonalMode && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>
                      Who paid and how to split the bill?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Who paid */}
                    <div className="space-y-2">
                      <Label htmlFor="paidBy">Who paid?</Label>
                      <Select value={paidBy} onValueChange={setPaidBy}>
                        <SelectTrigger id="paidBy">
                          <SelectValue placeholder="Select who paid" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeMembers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.id === currentUser.id ? 'You' : user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Split method */}
                    <div className="space-y-2">
                      <Label>How do you want to split this?</Label>
                      <Tabs value={splitMethod} onValueChange={setSplitMethod}>
                        <TabsList className="w-full grid grid-cols-3">
                          <TabsTrigger value="equal">Equal</TabsTrigger>
                          <TabsTrigger value="percentage">Percentage</TabsTrigger>
                          <TabsTrigger value="exact">Exact</TabsTrigger>
                        </TabsList>

                        <TabsContent value="equal" className="pt-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            All members will pay the same amount
                          </p>

                          <div className="border rounded-lg p-3 space-y-2 bg-accent/20">
                            <p className="text-sm font-medium">Split Preview</p>
                            {(() => {
                              const count = selectedMembers.length;
                              const val = parseFloat(amount);
                              const baseShare = Math.floor((val / count) * 100) / 100;
                              const remainder = Math.round((val - (baseShare * count)) * 100);

                              return selectedMembers.map((id, index) => {
                                let share = baseShare;
                                if (index < remainder) {
                                  share = Number((share + 0.01).toFixed(2));
                                }
                                const user = users.find(u => u.id === id);

                                return (
                                  <div key={id} className="flex justify-between text-sm">
                                    <span>{id === currentUser.id ? 'You' : user?.name}</span>
                                    <span className="font-medium">{formatCurrency(share)}</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </TabsContent>

                        <TabsContent value="percentage" className="pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted-foreground">
                              Split by custom percentages
                            </p>
                            <Badge variant={splitErrors ? "destructive" : "outline"}>
                              Total: {calculateSplitTotal().toFixed(0)}%
                            </Badge>
                          </div>

                          {splitErrors && (
                            <p className="text-xs text-destructive mb-2">{splitErrors}</p>
                          )}

                          <div className="space-y-4 max-h-60 overflow-y-auto">
                            {activeMembers.map((user) => (
                              <div key={user.id} className="space-y-1">
                                <div className="flex justify-between">
                                  <Label className="text-sm">
                                    {user.id === currentUser.id ? 'You' : user.name}
                                  </Label>
                                  <span className="text-sm font-medium">
                                    {splitValues[user.id]?.toFixed(0) || "0"}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Slider
                                    value={[splitValues[user.id] || 0]}
                                    max={100}
                                    step={1}
                                    onValueChange={([value]) => handlePercentageChange(user.id, value)}
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-16 text-right"
                                    value={splitValues[user.id]?.toFixed(0) || "0"}
                                    onChange={(e) => handlePercentageChange(user.id, parseInt(e.target.value) || 0)}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        <TabsContent value="exact" className="pt-4">
                          <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted-foreground">
                              Specify exact amounts
                            </p>
                            <Badge variant={splitErrors ? "destructive" : "outline"}>
                              Total: {formatCurrency(calculateSplitTotal())}
                            </Badge>
                          </div>

                          {splitErrors && (
                            <p className="text-xs text-destructive mb-2">{splitErrors}</p>
                          )}

                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {amount && activeMembers.map((user) => (
                              <div key={user.id} className="flex items-center justify-between">
                                <Label className="text-sm">
                                  {user.id === currentUser.id ? 'You' : user.name}
                                </Label>
                                <div className="flex items-center w-32">
                                  <span className="text-sm mr-2">{CURRENCIES.find(c => c.code === currency)?.symbol}</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={splitValues[user.id]?.toFixed(2) || "0.00"}
                                    onChange={(e) => handleExactAmountChange(user.id, e.target.value)}
                                    className="text-right"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Split with - Search and Add User (Shared Mode Only) */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Split with</Label>

                      {/* Selected Users List */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedMembers.map(userId => {
                          const user = users.find(u => u.id === userId);
                          if (!user) return null;
                          const isCurrentUser = user.id === currentUser.id;

                          return (
                            <Badge key={userId} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                              {isCurrentUser ? "You" : user.name}
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => handleMemberToggle(userId)}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                  <span className="sr-only">Remove {user.name}</span>
                                </button>
                              )}
                            </Badge>
                          );
                        })}
                      </div>

                      {/* Search and Add User Popover */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            Search by Email or ID...
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Type email or custom ID..."
                              value={userSearchQuery}
                              onValueChange={setUserSearchQuery}
                            />
                            <CommandList>
                              {userSearchQuery.length > 0 && (
                                <>
                                  <div className="py-1 px-2 text-xs font-medium text-muted-foreground">
                                    Search Results
                                  </div>
                                  {users
                                    .filter(u => !selectedMembers.includes(u.id))
                                    .filter(u => {
                                      const query = userSearchQuery.toLowerCase();
                                      return (
                                        u.email.toLowerCase().includes(query) ||
                                        (u.customId && u.customId.toLowerCase().includes(query))
                                      );
                                    })
                                    .map((user) => (
                                      <CommandItem
                                        key={user.id}
                                        value={`${user.email} ${user.customId}`}
                                        onSelect={() => {
                                          handleMemberToggle(user.id);
                                          setUserSearchQuery(""); // Clear search after selection
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] overflow-hidden">
                                              {user.avatar ?
                                                <img src={user.avatar} className="h-full w-full object-cover" /> :
                                                getInitials(user.name)
                                              }
                                            </div>
                                            <span className="font-medium">{user.name}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground ml-7">
                                            {user.customId && <span className="mr-2">ID: {user.customId}</span>}
                                            <span>{user.email}</span>
                                          </div>
                                        </div>
                                        <Check
                                          className={cn(
                                            "ml-auto h-4 w-4",
                                            selectedMembers.includes(user.id) ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                      </CommandItem>
                                    ))}
                                  {users.filter(u => !selectedMembers.includes(u.id) && (
                                    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                    (u.customId && u.customId.toLowerCase().includes(userSearchQuery.toLowerCase()))
                                  )).length === 0 && (
                                      <CommandEmpty>No matching user found.</CommandEmpty>
                                    )}
                                </>
                              )}
                              {userSearchQuery.length === 0 && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                  Type to search users...
                                </div>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Buttons positioned at bottom when in right column is hidden */}
            <div className={cn("space-x-4 flex justify-end items-end", isPersonalMode && "lg:col-span-2")}>
              <div className="flex justify-end space-x-4 w-full">
                <Button variant="outline" onClick={() => navigate("/")} type="button">
                  Cancel
                </Button>
                <Button type="submit">{isEditMode ? "Update Expense" : "Save Expense"}</Button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </AppLayout>
  );
}