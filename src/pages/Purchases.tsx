
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingBag, Loader2 } from "lucide-react";

interface PurchaseItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
    Expense: {
        description: string;
        date: string;
        currency: string;
    };
}

export default function Purchases() {
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const response = await fetch('/api/purchases', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            }
        } catch (error) {
            console.error("Failed to fetch purchases", error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalSpent = items.reduce((sum, item) => sum + item.price, 0);

    return (
        <AppLayout>
            <div className="container mx-auto py-6 px-4 sm:px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            <ShoppingBag className="h-8 w-8" />
                            Purchases
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Individual items scanned from your receipts.
                        </p>
                    </div>
                    <Card className="w-full md:w-auto min-w-[200px]">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Itemized Spend</CardTitle>
                            <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
                        </CardHeader>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Item History</CardTitle>
                        <CardDescription>
                            {items.length} items found across your personal expenses.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No items found.</p>
                                <p className="text-sm mt-2">Upload a receipt when adding an expense to see items here.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item Name</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Expense</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="w-[120px]">
                                                {formatDate(item.Expense?.date)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {item.name}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(item.price, item.Expense?.currency)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {item.Expense?.description}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
