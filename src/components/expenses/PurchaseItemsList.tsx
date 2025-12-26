import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PurchaseItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
}

interface PurchaseItemsListProps {
    items: PurchaseItem[];
    status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    currency: string;
}

export function PurchaseItemsList({ items, status, currency }: PurchaseItemsListProps) {
    // If no status is provided, assume completed/legacy
    const currentStatus = status || 'COMPLETED';

    if (currentStatus === 'PROCESSING' || currentStatus === 'PENDING') {
        return (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        Scanning Receipt...
                    </h3>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>
                </div>
                <Progress value={60} className="h-2 w-full animate-pulse" />
                <p className="text-sm text-muted-foreground">
                    AI is analyzing your receipt. This takes 3-5 seconds.
                </p>
            </div>
        );
    }

    if (currentStatus === 'FAILED') {
        return (
            <div className="border rounded-lg p-4 bg-red-50 text-red-900">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <h3 className="text-sm font-semibold">Scan Failed</h3>
                </div>
                <p className="text-xs">
                    We couldn't extract items from this receipt. You can verify the image clarity and try again, or add items manually (coming soon).
                </p>
            </div>
        );
    }

    // COMPLETED state
    if (items.length === 0) {
        return (
            <div className="text-center py-6 border rounded-lg border-dashed text-muted-foreground bg-muted/10">
                <p className="text-sm">No items extracted.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Purchase Items ({items.length})
                </h3>
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Scanned</Badge>
            </div>

            <div className="border rounded-lg divide-y bg-card">
                {items.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            {item.quantity > 1 && <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>}
                        </div>
                        <div className="font-mono font-medium text-sm">
                            {formatCurrency(item.price, currency)}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center pt-2 px-1">
                <span className="text-sm font-medium text-muted-foreground">Total Extracted</span>
                <span className="text-sm font-bold">
                    {formatCurrency(items.reduce((sum, item) => sum + item.price, 0), currency)}
                </span>
            </div>
        </div>
    );
}
