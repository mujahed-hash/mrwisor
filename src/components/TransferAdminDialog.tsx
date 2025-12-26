import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getInitials } from '@/lib/utils';

interface Member {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

interface TransferAdminDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    groupId: string;
    groupName: string;
    members: Member[];
    currentAdminId: string;
    onSuccess: () => void;
}

export function TransferAdminDialog({
    open,
    onOpenChange,
    groupId,
    groupName,
    members,
    currentAdminId,
    onSuccess,
}: TransferAdminDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');

    // Filter out current admin from selectable members
    const eligibleMembers = members.filter(m => m.id !== currentAdminId);

    const handleTransfer = async () => {
        if (!selectedMemberId) {
            toast.error('Please select a new admin');
            return;
        }

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/groups/${groupId}/transfer-admin`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newAdminId: selectedMemberId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to transfer admin role');
            }

            const newAdmin = members.find(m => m.id === selectedMemberId);
            toast.success(`${newAdmin?.name} is now the group admin`);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || 'Failed to transfer admin role');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-amber-500" />
                        Transfer Admin Role
                    </DialogTitle>
                    <DialogDescription>
                        Select a new admin for <strong>"{groupName}"</strong>.
                        You will become a regular member after transferring.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select new admin" />
                        </SelectTrigger>
                        <SelectContent>
                            {eligibleMembers.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={member.avatar} />
                                            <AvatarFallback className="text-xs">
                                                {getInitials(member.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{member.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {eligibleMembers.length === 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                            No other members to transfer to. Add members first.
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleTransfer}
                        disabled={isLoading || !selectedMemberId}
                        className="bg-amber-500 hover:bg-amber-600"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Transferring...
                            </>
                        ) : (
                            'Transfer Admin'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
