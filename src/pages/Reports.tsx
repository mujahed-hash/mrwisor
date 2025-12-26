import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { calculateBalanceBetweenUsers, cleanItemName, levenshteinDistance } from "@/lib/utils";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, LabelList } from "recharts";
import { ChartLegendContent, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { RadialBarChart, RadialBar } from "recharts";

import { Download, Lightbulb, TrendingUp, AlertTriangle, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const { state } = useAppContext();
  const { expenses, users, payments } = state;
  const { currentUser } = state;

  const [filterPeriod, setFilterPeriod] = useState<string>("all-time");
  const [purchaseItems, setPurchaseItems] = useState<any[]>([]);

  // Fetch purchase items on component mount
  useEffect(() => {
    const fetchPurchaseItems = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const response = await fetch('/api/purchases', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPurchaseItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch purchase items:', error);
      }
    };
    fetchPurchaseItems();
  }, []);

  // Generate Smart Insights from purchase items
  interface ItemInsight {
    name: string;
    count: number;
    totalSpent: number;
    avgPrice: number;
    dates: string[];
  }

  const generateInsights = () => {
    // 1. First pass: Clean names and aggregating basic stats
    const cleanItemMap: Record<string, ItemInsight> = {};

    purchaseItems.forEach((item: any) => {
      // Use our new helper to clean the name
      const cleanName = cleanItemName(item.name || '');
      if (!cleanName || cleanName.length < 2) return;

      const expenseDate = item.Expense?.date || item.createdAt;

      if (!cleanItemMap[cleanName]) {
        cleanItemMap[cleanName] = {
          name: cleanName, // Normalized name
          count: 0,
          totalSpent: 0,
          avgPrice: 0,
          dates: []
        };
      }

      const quantity = item.quantity || 1;
      const price = item.price || 0;

      cleanItemMap[cleanName].count += quantity;
      cleanItemMap[cleanName].totalSpent += price * quantity;
      if (expenseDate) {
        cleanItemMap[cleanName].dates.push(expenseDate);
      }
    });

    // 2. Second pass: Fuzzy clustering
    // We'll group "Monster Energy" and "Monster Energy Zero" together
    const clusters: ItemInsight[] = [];
    const processedNames = new Set<string>();

    // Sort keys by length (longest first) to catch "Monster Energy Zero" before "Monster Energy"
    // potentially, or just iterate. Actually, treating them as separate nodes and merging is better.
    // For simplicity: Simple greedy clustering.

    const cleanItems = Object.values(cleanItemMap).sort((a, b) => b.count - a.count); // Process frequent items first

    cleanItems.forEach(item => {
      if (processedNames.has(item.name)) return;

      // Start a new cluster with this item
      const cluster = { ...item };
      processedNames.add(item.name);

      // Find similar items to merge into this cluster
      cleanItems.forEach(otherItem => {
        if (processedNames.has(otherItem.name)) return;

        // Calculate similarity
        const distance = levenshteinDistance(item.name, otherItem.name);
        const maxLength = Math.max(item.name.length, otherItem.name.length);
        const similarity = 1 - (distance / maxLength);

        // If > 70% similar or (short distance for long strings), merge
        // "Monster Energy" vs "Monster Energy Zero" -> distance is ~5, length ~18 -> ~72% match
        if (similarity > 0.70 || (distance <= 2 && maxLength > 5)) {
          cluster.count += otherItem.count;
          cluster.totalSpent += otherItem.totalSpent;
          cluster.dates.push(...otherItem.dates);
          processedNames.add(otherItem.name);

          // Optional: Keep the shorter name as the display name?
          if (otherItem.name.length < cluster.name.length) {
            cluster.name = otherItem.name;
          }
        }
      });

      // Calculate final average for the cluster
      cluster.avgPrice = cluster.totalSpent / cluster.count;
      clusters.push(cluster);
    });

    // Sort by count (frequency)
    const sortedItems = clusters.sort((a, b) => b.count - a.count);

    // Generate insights
    const insights: { type: string; icon: any; title: string; message: string; savings?: number }[] = [];

    // 1. Frequent purchases (bought 3+ times)
    const frequentItems = sortedItems.filter(i => i.count >= 3);
    frequentItems.slice(0, 3).forEach(item => {
      // Suggest bulk buying if item is small price (under $15)
      if (item.avgPrice < 15 && item.count >= 4) {
        const potentialSavings = Math.round(item.totalSpent * 0.15); // Assume 15% bulk savings
        insights.push({
          type: 'bulk',
          icon: Package,
          title: `Bulk Savings: ${item.name}`,
          message: `You bought ${item.count} units at avg ${formatCurrency(item.avgPrice)} each = ${formatCurrency(item.totalSpent)}. Buying in bulk could save ~${formatCurrency(potentialSavings)}/month!`,
          savings: potentialSavings
        });
      }
    });

    // 2. Top spending items
    const topSpenders = [...sortedItems].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 3);
    if (topSpenders.length > 0) {
      insights.push({
        type: 'top',
        icon: TrendingUp,
        title: 'Your Top Purchases',
        message: topSpenders.map(i => `${i.name}: ${formatCurrency(i.totalSpent)}`).join(', ')
      });
    }

    // 3. Daily habit detection (same item on 5+ different days)
    const dailyHabits = sortedItems.filter(item => {
      const uniqueDays = new Set(item.dates.map((d: string) => new Date(d).toDateString())).size;
      return uniqueDays >= 5;
    });
    dailyHabits.slice(0, 2).forEach(item => {
      insights.push({
        type: 'habit',
        icon: AlertTriangle,
        title: `Daily Habit: ${item.name}`,
        message: `You're buying this almost daily! Consider home alternatives or bulk options.`,
        savings: Math.round(item.totalSpent * 0.5) // Potential 50% savings by cutting back
      });
    });

    // 4. If few items, show general tip
    if (insights.length < 2) {
      insights.push({
        type: 'tip',
        icon: Lightbulb,
        title: 'Scan More Receipts',
        message: 'Keep scanning receipts to get personalized savings insights based on your purchase patterns!'
      });
    }

    return { insights, frequentItems: sortedItems.slice(0, 10), totalItems: purchaseItems.length };
  };

  const { insights, frequentItems, totalItems } = generateInsights();

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
        startDate.setMonth(0); // January
        startDate.setDate(1);
        break;
      case "all-time":
        startDate = new Date(0); // Epoch start
        break;
      default:
        startDate = new Date(0); // Default to All Time
    }

    return expenses.filter(expense => new Date(expense.date) >= startDate);
  };

  // Filter payments based on selected period
  const getFilteredPayments = (period: string) => {
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
        startDate = new Date(0); // Epoch start
        break;
      default:
        startDate = new Date(0); // Default to All Time
    }
    return payments.filter(payment => new Date(payment.date) >= startDate);
  };

  const filteredExpenses = getFilteredExpenses(filterPeriod);
  const filteredPayments = getFilteredPayments(filterPeriod); // Get filtered payments

  // Calculate spending by category
  const spendingByCategory = filteredExpenses.reduce((acc, expense) => {
    const category = expense.category || "Uncategorized";
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly spending trends
  const monthlySpending: Record<string, number> = {};
  filteredExpenses.forEach(expense => {
    const date = new Date(expense.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + expense.amount;
  });
  const sortedMonths = Object.keys(monthlySpending).sort();

  // Transform monthlySpending into an array for Recharts
  const monthlyChartData = sortedMonths.map(month => ({
    month: month, // e.g., "2023-07"
    amount: monthlySpending[month],
  }));

  // Chart configuration for Monthly Trends (Bar Chart)
  const monthlyChartConfig = {
    amount: {
      label: "Spending",
      color: "hsl(var(--chart-1))", // Use a theme-consistent color
    },
  } satisfies ChartConfig;

  // Chart configuration for Spending by Category (Pie Chart)
  const categoryChartConfig: ChartConfig = Object.keys(spendingByCategory).length > 0 ? Object.fromEntries(
    Object.keys(spendingByCategory).map((category, index) => [
      `category-${index + 1}`, // Use generic keys for config
      {
        label: category, // Display original category name as label
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      },
    ])
  ) : {
    "no-data": {
      label: "No Data",
      color: "hsl(var(--muted-foreground))",
    },
  };

  // Prepare data for Pie Chart
  const categoryChartData = Object.entries(spendingByCategory).map(([category, amount], index) => ({
    name: category, // Keep original category name for nameKey
    value: amount,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`, // Assign color directly to data
  }));

  // Calculate total amount paid by each user
  const paymentsByUser: Record<string, number> = {};
  filteredExpenses.forEach(expense => {
    const userId = expense.paidBy; // This should be expense.paidBy, not expense.userId
    if (userId) {
      paymentsByUser[userId] = (paymentsByUser[userId] || 0) + expense.amount;
    }
  });

  // Calculate balances for who owes currentUser and who currentUser owes (for reporting)
  const youOweReports: { userId: string; amount: number }[] = [];
  const youAreOwedReports: { userId: string; amount: number }[] = [];

  users.forEach(user => {
    if (user.id === currentUser.id) return; // Skip current user

    const balance = calculateBalanceBetweenUsers(
      currentUser.id,
      user.id,
      filteredExpenses, // Use filtered expenses
      filteredPayments // Use filtered payments
    );

    if (balance < 0) {
      youOweReports.push({ userId: user.id, amount: balance });
    } else if (balance > 0) {
      youAreOwedReports.push({ userId: user.id, amount: balance });
    }
  });

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) {
      return names[0][0];
    }
    return `${names[0][0]}${names[1][0]}`;
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Description", "Category", "Amount", "Paid By", "Currency"];
    const csvContent = [
      headers.join(","),
      ...filteredExpenses.map(expense => {
        const date = new Date(expense.date).toLocaleDateString();
        const description = `"${expense.description.replace(/"/g, '""')}"`; // Escape quotes
        const category = expense.category || "Uncategorized";
        const user = users.find(u => u.id === expense.paidBy);
        const paidBy = user ? user.name : "Unknown";
        return [date, description, category, expense.amount, paidBy, expense.currency || "USD"].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${filterPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
          <Button variant="outline" size="sm" className="hidden md:flex gap-2" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="insights" className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <TabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5 gap-1">
              <TabsTrigger value="insights" className="whitespace-nowrap text-xs md:text-sm">Insights</TabsTrigger>
              <TabsTrigger value="category" className="whitespace-nowrap text-xs md:text-sm">Category</TabsTrigger>
              <TabsTrigger value="monthly" className="whitespace-nowrap text-xs md:text-sm">Monthly</TabsTrigger>
              <TabsTrigger value="who-paid" className="whitespace-nowrap text-xs md:text-sm">Who Paid</TabsTrigger>
              <TabsTrigger value="balances" className="whitespace-nowrap text-xs md:text-sm">Balances</TabsTrigger>
            </TabsList>
          </div>

          <div className="my-4">
            <div className="flex gap-2">
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
              <Button variant="outline" size="icon" className="md:hidden" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Smart Insights Tab */}
          <TabsContent value="insights" className="space-y-4 pt-4">
            {/* Summary Card */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Smart Insights
                </CardTitle>
                <CardDescription>
                  Smart algorithmic analysis of your purchase patterns to find savings opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{totalItems}</p>
                    <p className="text-sm text-muted-foreground">Items Tracked</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{frequentItems.length}</p>
                    <p className="text-sm text-muted-foreground">Unique Items</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">
                      {formatCurrency(insights.filter(i => i.savings).reduce((sum, i) => sum + (i.savings || 0), 0))}
                    </p>
                    <p className="text-sm text-muted-foreground">Potential Savings</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insight Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {insights.map((insight, index) => {
                const IconComponent = insight.icon;
                return (
                  <Card key={index} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {insight.title}
                        {insight.savings && (
                          <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                            Save {formatCurrency(insight.savings)}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{insight.message}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Frequent Items List */}
            {frequentItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Most Purchased Items</CardTitle>
                  <CardDescription>Items you buy most frequently from scanned receipts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {frequentItems.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-muted-foreground w-8">{index + 1}</span>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.count}x purchased • avg {formatCurrency(item.avgPrice)}
                            </p>
                          </div>
                        </div>
                        <span className="font-semibold">{formatCurrency(item.totalSpent)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="category" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Spending Breakdown by Category</CardTitle>
                <CardDescription>View how your expenses are distributed across different categories.</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(spendingByCategory).length === 0 ? (
                  <div className="text-center py-8"><p className="text-muted-foreground">No category spending data for this period.</p></div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ChartContainer config={categoryChartConfig} className="mx-auto aspect-square max-h-[300px]">
                          <PieChart>
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Pie
                              data={categoryChartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={60}
                              outerRadius={100} // Increase outer radius
                              strokeWidth={5}
                            >
                              <LabelList
                                dataKey="name"
                                className="fill-foreground"
                                stroke="none"
                                fontSize={12}
                                formatter={(value: keyof typeof categoryChartConfig) =>
                                  categoryChartConfig[value]?.label
                                }
                              />
                            </Pie>
                            {/* <ChartLegend content={<ChartLegendContent nameKey="name" />} className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center" /> */}
                          </PieChart>
                        </ChartContainer>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      {Object.entries(spendingByCategory)
                        .sort(([, a], [, b]) => b - a) // Sort by amount desc
                        .map(([category, amount], index) => (
                          <div key={category} className="flex items-center justify-between p-2 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }} />
                              <span className="font-medium">{category}</span>
                            </div>
                            <span className="font-bold">{formatCurrency(amount)}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Spending Trends</CardTitle>
                <CardDescription>Track your total spending over time.</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedMonths.length === 0 ? (
                  <div className="text-center py-8"><p className="text-muted-foreground">No monthly spending data for this period.</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ChartContainer config={monthlyChartConfig}>
                      <BarChart accessibilityLayer data={monthlyChartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          tickFormatter={(value) => value.slice(5)} // Show only MM part of YYYY-MM
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="who-paid" className="space-y-4 pt-4"> {/* New tab content */}
            <Card>
              <CardHeader>
                <CardTitle>Who Paid For What</CardTitle>
                <CardDescription>Summary of total amounts paid by each user.</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(paymentsByUser).length === 0 ? (
                  <div className="text-center py-8"><p className="text-muted-foreground">No payments found for this period.</p></div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(paymentsByUser).map(([userId, amount]) => {
                      const user = users.find(u => u.id === userId); // Access users from state
                      return (
                        <div key={userId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{user ? getInitials(user.name) : "UN"}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user ? user.name : "Unknown User"}</span>
                          </div>
                          <span className="font-semibold">{formatCurrency(amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances" className="space-y-4 pt-4"> {/* New tab content */}
            <Card>
              <CardHeader>
                <CardTitle>Balances Overview</CardTitle>
                <CardDescription>Your financial standing with other users.</CardDescription>
              </CardHeader>
              <CardContent>
                {
                  (youOweReports.length === 0 && youAreOwedReports.length === 0) ? (
                    <div className="text-center py-8"><p className="text-muted-foreground">No outstanding balances in this period.</p></div>
                  ) : (
                    <div className="space-y-6">
                      {youOweReports.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Money You Owe</h3>
                          <div className="space-y-2">
                            {youOweReports.map(balanceEntry => {
                              const user = users.find(u => u.id === balanceEntry.userId);
                              if (!user) return null;
                              return (
                                <div key={user.id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.name}</span>
                                  </div>
                                  <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(Math.abs(balanceEntry.amount))}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {youAreOwedReports.length > 0 && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Money You Are Owed</h3>
                          <div className="space-y-2">
                            {youAreOwedReports.map(balanceEntry => {
                              const user = users.find(u => u.id === balanceEntry.userId);
                              if (!user) return null;
                              return (
                                <div key={user.id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{user.name}</span>
                                  </div>
                                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(balanceEntry.amount)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}