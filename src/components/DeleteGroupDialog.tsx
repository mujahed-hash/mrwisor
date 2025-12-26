import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface DeleteGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    groupName: string;
    expenseCount: number;
    onSuccess: () => void;
}

export function DeleteGroupDialog({
    open,
    onOpenChange,
    groupId,
    groupName,
    expenseCount,
    onSuccess,
}: DeleteGroupDialogProps) {
    const [step, setStep] = useState<'confirm' | 'deleting-expenses' | 'countdown' | 'final'>('confirm');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [remainingExpenses, setRemainingExpenses] = useState(expenseCount);

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setStep('confirm');
            setCountdown(5);
            setRemainingExpenses(expenseCount);
        }
    }, [open, expenseCount]);

    // Countdown timer
    useEffect(() => {
        if (step === 'countdown' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (step === 'countdown' && countdown === 0) {
            setStep('final');
        }
    }, [step, countdown]);

    const handleDeleteExpenses = async () => {
        setIsLoading(true);
        setStep('deleting-expenses');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/groups/${groupId}/expenses/all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete expenses');
            }

            setRemainingExpenses(0);
            setStep('countdown');
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete expenses');
            setStep('confirm');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/groups/${groupId}/soft-delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete group');
            }

            toast.success('Group deleted. History available in Settings for 4 days.');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete group');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-5 w-5" />
                        Delete Group
                    </DialogTitle>
                    <DialogDescription>
                        Delete <strong>"{groupName}"</strong> and all its data.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Step 1: Confirm */}
                    {step === 'confirm' && (
                        <>
                            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-amber-800 dark:text-amber-200">
                                            This is a 2-step process
                                        </p>
                                        <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                            <li>1. Delete all {remainingExpenses} expenses first</li>
                                            <li>2. Wait 5 seconds, then delete group</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                All members will be able to view the group history in Settings for 4 days.
                            </p>
                        </>
                    )}

                    {/* Step 2: Deleting expenses */}
                    {step === 'deleting-expenses' && (
                        <div className="text-center py-4">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-destructive" />
                            <p className="mt-2 font-medium">Deleting all expenses...</p>
                        </div>
                    )}

                    {/* Step 3: Countdown */}
                    {step === 'countdown' && (
                        <div className="text-center py-4">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold text-destructive">{countdown}</span>
                                </div>
                                <svg className="w-20 h-20 transform -rotate-90">
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        className="text-muted"
                                    />
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="36"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={226}
                                        strokeDashoffset={226 - (226 * (5 - countdown)) / 5}
                                        className="text-destructive transition-all duration-1000"
                                    />
                                </svg>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Please wait before proceeding...
                            </p>
                        </div>
                    )}

                    {/* Step 4: Final confirmation */}
                    {step === 'final' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="h-8 w-8 text-destructive" />
                            </div>
                            <p className="font-medium">Ready to delete group</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                This action cannot be undone.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading || step === 'countdown'}
                    >
                        Cancel
                    </Button>

                    {step === 'confirm' && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteExpenses}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            Delete All Expenses ({remainingExpenses})
                        </Button>
                    )}

                    {step === 'countdown' && (
                        <Button variant="destructive" disabled>
                            <Clock className="mr-2 h-4 w-4" />
                            Wait {countdown}s...
                        </Button>
                    )}

                    {step === 'final' && (
                        <Button
                            variant="destructive"
                            onClick={handleDeleteGroup}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Group Forever
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
