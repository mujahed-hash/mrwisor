import { Link, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getUserById, getInitials } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ArrowUpRight, TrendingUp, DollarSign, Wallet } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface AllExpensesProps {
  mode: "shared" | "personal";
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AllExpenses({ mode }: AllExpensesProps) {
  const { state } = useAppContext();
  const { expenses, currentUser, users, groups } = state;
  const navigate = useNavigate();

  const [filterPeriod, setFilterPeriod] = useState<string>("1-month");

  // Filter expenses based on mode (Shared vs Personal)
  const modeFilteredExpenses = expenses.filter(expense => {
    if (mode === "shared") {
      return !!expense.groupId; // Only expenses belonging to a group
    } else {
      return !expense.groupId;  // Only expenses WITHOUT a group (Personal)
    }
  });

  // Sort expenses by date (newest first)
  const sortedExpenses = [...modeFilteredExpenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Filter expenses based on selected period
  const getFilteredExpenses = (period: string) => {
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case "1-month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "3-months":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "6-months":
        startDate.setMonth(now.getMonth() - 6);
        break;
      case "this-year":
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
      case "all-time":
        startDate = new Date(0);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return sortedExpenses.filter(expense => new Date(expense.date) >= startDate);
  };

  const filteredExpenses = getFilteredExpenses(filterPeriod);

  // --- Summary Metrics & Charts Data ---

  // 1. Total Spend (Current filtered view)
  const totalSpend = modeFilteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 2. Average Daily Spend (Based on last 30 days regardless of filter)
  const last30DaysExpenses = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    return modeFilteredExpenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
  }, [modeFilteredExpenses]);

  const avgDailySpend = useMemo(() => {
    const totalLast30 = last30DaysExpenses.reduce((sum, e) => sum + e.amount, 0);
    return totalLast30 / 30;
  }, [last30DaysExpenses]);

  // 3. Top Category
  const topCategory = useMemo(() => {
    const catTotals: Record<string, number> = {};
    last30DaysExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });
    let topCat = "None";
    let maxAmount = 0;
    Object.entries(catTotals).forEach(([cat, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCat = cat;
      }
    });
    // Map ID to Name
    const categoryName = EXPENSE_CATEGORIES.find(c => c.id === topCat)?.name || topCat;
    return { name: categoryName, amount: maxAmount };
  }, [last30DaysExpenses]);


  // 4. Spending Trends Data (Last 7 Days)
  const spendingTrendsData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTotal = modeFilteredExpenses
        .filter(e => e.date.startsWith(dateStr))
        .reduce((sum, e) => sum + e.amount, 0);
      data.push({
        name: format(d, 'EEE'), // Mon, Tue...
        amount: dayTotal
      });
    }
    return data;
  }, [modeFilteredExpenses]);

  // 5. Category Breakdown Data (limit to top 5, group rest as "Other")
  const categoryData = useMemo(() => {
    const catTotals: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    });

    const sorted = Object.entries(catTotals)
      .map(([id, value]) => {
        const catName = EXPENSE_CATEGORIES.find(c => c.id === id)?.name || id;
        return { name: catName, value };
      })
      .sort((a, b) => b.value - a.value);

    // Limit to top 5, group rest as "Other"
    if (sorted.length <= 5) return sorted;

    const top5 = sorted.slice(0, 5);
    const otherTotal = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
    if (otherTotal > 0) {
      top5.push({ name: 'Other', value: otherTotal });
    }
    return top5;
  }, [filteredExpenses]);


  const pageTitle = mode === "shared" ? "Shared Expenses" : "Personal Expenses";
  const emptyMessage = mode === "shared"
    ? "No shared expenses recorded yet."
    : "No personal expenses recorded yet.";

  const addLink = mode === "shared" ? "/expenses/new" : "/expenses/new?mode=personal";

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">{pageTitle}</h1>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
              <p className="text-xs text-muted-foreground">Lifetime total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Daily Spend</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgDailySpend)}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Category</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topCategory.name}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(topCategory.amount)} in last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        {modeFilteredExpenses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Spending Trends</CardTitle>
                <CardDescription>Your daily spending over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spendingTrendsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Amount']}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Where your money went (Selected Period)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Expenses List</TabsTrigger>
            <TabsTrigger value="custom">Custom View</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Expenses</CardTitle>
                </div>
                <CardDescription>A list of your {mode} expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {sortedExpenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">{emptyMessage}</p>
                      <Link to={addLink}>
                        <Button className="mt-4">Add Your First {mode === "shared" ? "Shared" : "Personal"} Expense</Button>
                      </Link>
                    </div>
                  ) : (
                    sortedExpenses.map((expense) => {
                      const payer = getUserById(expense.paidBy, users);
                      return (
                        <div
                          key={expense.id}
                          onClick={() => navigate(`/expenses/${expense.id}`)}
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            {payer && (
                              <Link
                                to={`/users/${payer.id}`}
                                className="flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={payer.avatar} alt={payer.name} />
                                  <AvatarFallback>{getInitials(payer.name)}</AvatarFallback>
                                </Avatar>
                              </Link>
                            )}
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {payer?.id === currentUser.id ? (
                                  "You"
                                ) : payer && (
                                  <Link
                                    to={`/users/${payer.id}`}
                                    className="underline hover:no-underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {payer.name}
                                  </Link>
                                )}
                                {" paid "}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatDate(expense.date)}</p>
                            <p className="text-xs text-muted-foreground">
                              {expense.category}
                              {mode === "shared" && expense.groupId &&
                                ` in ${groups.find(g => g.id === expense.groupId)?.name}`
                              }
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          <TabsContent value="custom" className="space-y-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>Custom Expenses Filter</CardTitle>
                </div>
                <CardDescription>Filter and view expenses by specific time periods.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select onValueChange={setFilterPeriod} defaultValue={filterPeriod}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-month">Last 1 Month</SelectItem>
                      <SelectItem value="3-months">Last 3 Months</SelectItem>
                      <SelectItem value="6-months">Last 6 Months</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="all-time">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  {filteredExpenses.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No expenses found for this period.</p>
                    </div>
                  ) : (
                    filteredExpenses.map((expense) => {
                      const payer = getUserById(expense.paidBy, users);
                      return (
                        <div
                          key={expense.id}
                          onClick={() => navigate(`/expenses/${expense.id}`)}
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            {payer && (
                              <Link
                                to={`/users/${payer.id}`}
                                className="flex items-center"
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={payer.avatar} alt={payer.name} />
                                  <AvatarFallback>{getInitials(payer.name)}</AvatarFallback>
                                </Avatar>
                              </Link>
                            )}
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              <p className="text-sm text-muted-foreground">
                                {payer?.id === currentUser.id ? (
                                  "You"
                                ) : payer && (
                                  <Link
                                    to={`/users/${payer.id}`}
                                    className="underline hover:no-underline"
                                    onClick={(e) => e.stopPropagation()} // Prevent row click
                                  >
                                    {payer.name}
                                  </Link>
                                )}
                                {" paid "}
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(expense.amount, expense.currency)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{formatDate(expense.date)}</p>
                            <p className="text-xs text-muted-foreground">{expense.category}
                              {expense.groupId &&
                                ` in ${groups.find(g => g.id === expense.groupId)?.name}`}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}