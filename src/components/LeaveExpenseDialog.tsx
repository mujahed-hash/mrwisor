import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    expenseId: string;
    expenseDescription: string;
    userShare: number;
    onSuccess: () => void;
}

export function LeaveExpenseDialog({
    open,
    onOpenChange,
    expenseId,
    expenseDescription,
    userShare,
    onSuccess,
}: LeaveExpenseDialogProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleLeave = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/expenses/${expenseId}/members/me`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to leave expense');
            }

            toast.success('You have left the expense');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to leave expense');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Leave Expense?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Are you sure you want to leave <strong>"{expenseDescription}"</strong>?
                        </p>
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                            Your share of ${userShare.toFixed(2)} will be redistributed proportionally
                            to the remaining members.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            This action cannot be undone.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleLeave}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Leaving...
                            </>
                        ) : (
                            'Leave Expense'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
