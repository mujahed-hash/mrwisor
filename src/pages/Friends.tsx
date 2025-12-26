import { useAppContext } from "@/contexts/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { getInitials, calculateBalanceBetweenUsers, formatCurrency } from "@/lib/utils";
import { Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Friends() {
    const { state } = useAppContext();
    const { users, groups, currentUser, expenses, payments } = state;

    // Logic: Find all users who share at least one group with the current user
    const friendIds = new Set<string>();

    groups.forEach(group => {
        // Only consider groups the current user belongs to
        if (group.members.includes(currentUser.id)) {
            group.members.forEach(memberId => {
                if (memberId !== currentUser.id) {
                    friendIds.add(memberId);
                }
            });
        }
    });

    const friends = users.filter(u => friendIds.has(u.id));

    // Calculate global balance with each friend
    const friendsWithBalance = friends.map(friend => {
        const balance = calculateBalanceBetweenUsers(currentUser.id, friend.id, expenses, payments);
        return {
            ...friend,
            balance
        };
    });

    return (
        <AppLayout>
            <div className="container mx-auto py-6 px-4 md:px-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
                        <p className="text-muted-foreground mt-1">
                            People you share groups and expenses with.
                        </p>
                    </div>
                </div>

                {friendsWithBalance.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent className="flex flex-col items-center justify-center space-y-4">
                            <div className="bg-muted p-4 rounded-full">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <CardTitle className="mb-2">No friends found yet</CardTitle>
                                <CardDescription className="max-w-sm mx-auto">
                                    You haven't been added to any groups with other people yet. create a group or get added to one to see friends here.
                                </CardDescription>
                            </div>
                            <Link to="/groups">
                                <Button>Go to Groups</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {friendsWithBalance.map((friend) => (
                            <Link to={`/users/${friend.id}`} key={friend.id}>
                                <Card className="hover:bg-accent/50 transition-colors h-full">
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                                        <Avatar className="h-12 w-12 border-2 border-background">
                                            <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                                {getInitials(friend.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 overflow-hidden">
                                            <CardTitle className="text-base truncate">{friend.name}</CardTitle>
                                            <CardDescription className="truncate text-xs">
                                                {friend.email}
                                            </CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Net Balance</span>
                                            <div className="flex items-center gap-2">
                                                {Math.abs(friend.balance) < 0.01 ? (
                                                    <Badge variant="outline" className="text-muted-foreground font-normal">
                                                        Settled up
                                                    </Badge>
                                                ) : (
                                                    <span className={`font-semibold ${friend.balance > 0
                                                            ? "text-green-600 dark:text-green-400"
                                                            : "text-red-600 dark:text-red-400"
                                                        }`}>
                                                        {friend.balance > 0 ? "Owes you" : "You owe"} {formatCurrency(Math.abs(friend.balance))}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Shared Groups Count */}
                                        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                                            <Users className="h-3 w-3" />
                                            In {groups.filter(g => g.members.includes(currentUser.id) && g.members.includes(friend.id)).length} shared group(s)
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
