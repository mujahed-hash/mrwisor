import { useAppContext } from "@/contexts/AppContext";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, calculateBalanceBetweenUsers } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@radix-ui/react-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function GroupsList() {
  const { state, createGroup } = useAppContext();
  const { groups, currentUser, expenses, payments, users } = state;

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembersForNewGroup, setSelectedMembersForNewGroup] = useState<string[]>([]);

  // State for search
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Debounced search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearchingUsers(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setIsSearchingUsers(false);
          return;
        }
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(userSearchTerm)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.filter((u: any) => u.id !== currentUser.id));
        }
      } catch (error) {
        console.error("Failed to search users", error);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [userSearchTerm, currentUser.id]);

  const handleCreateNewGroup = async () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name.");
      return;
    }

    const newGroup = {
      id: "",
      name: newGroupName.trim(),
      members: [currentUser.id, ...selectedMembersForNewGroup],
      total: 0,
      createdBy: currentUser.id,
    };

    await createGroup(newGroup);
    setIsCreateGroupModalOpen(false);
    setNewGroupName("");
    setSelectedMembersForNewGroup([]);
    setUserSearchTerm("");
    setSearchResults([]);
  };

  const toggleMember = (userId: string) => {
    if (userId === currentUser.id) return;

    if (selectedMembersForNewGroup.includes(userId)) {
      setSelectedMembersForNewGroup(selectedMembersForNewGroup.filter(id => id !== userId));
    } else {
      setSelectedMembersForNewGroup([...selectedMembersForNewGroup, userId]);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Your Groups</CardTitle>
          <CardDescription>
            Manage expenses with friends and roommates
          </CardDescription>
        </div>
        <Button size="sm" className="h-8" onClick={() => setIsCreateGroupModalOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Group
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No groups yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateGroupModalOpen(true)}>
                Create Your First Group
              </Button>
            </div>
          ) : (
            groups.map((group) => {
              // Get expenses specific to this group
              const groupExpenses = expenses.filter(exp => exp.groupId === group.id);

              // Get payments specific to this group
              const groupPayments = payments.filter(pay => pay.groupId === group.id);

              // Calculate what current user owes or is owed in this group
              let userBalanceInGroup = 0;
              group.members.forEach(memberId => {
                if (memberId !== currentUser.id) {
                  userBalanceInGroup += calculateBalanceBetweenUsers(currentUser.id, memberId, groupExpenses, groupPayments);
                }
              });

              return (
                <Link to={`/groups/${group.id}`} key={group.id}>
                  <div className="flex items-center justify-between p-4 rounded-lg hover:bg-accent cursor-pointer transition-all">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {group.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {group.members.length} members
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant={userBalanceInGroup >= -0.005 ? "outline" : "destructive"} className="mb-1">
                        {Math.abs(userBalanceInGroup) < 0.005 ? "Settled" : (userBalanceInGroup >= 0 ? "You are owed" : "You owe")}
                      </Badge>
                      <p className={`text-sm font-semibold ${Math.abs(userBalanceInGroup) < 0.005 ? 'text-blue-600 dark:text-blue-400' : (userBalanceInGroup >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
                        {formatCurrency(Math.abs(userBalanceInGroup))}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
      {/* New Group Creation Modal */}
      <Dialog open={isCreateGroupModalOpen} onOpenChange={setIsCreateGroupModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Start a new group to split expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="Weekend Trip, Apartment Bills, etc."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-search" className="text-sm">Find Users</Label>
              <div className="relative">
                <Input
                  id="user-search"
                  placeholder="Search users..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
                {isSearchingUsers && (
                  <div className="absolute right-3 top-2">
                    <PlusCircle className="animate-spin h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm mb-2 block">
                {userSearchTerm ? "Search Results:" : "Search to add members:"}
              </Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded-md">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedMembersForNewGroup.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </Label>
                    </div>
                  ))
                ) : userSearchTerm && !isSearchingUsers ? (
                  <p className="text-sm text-muted-foreground p-2">No users found.</p>
                ) : (
                  <p className="text-sm text-muted-foreground p-2">Type to search users...</p>
                )}
              </div>
            </div>

            {/* Selected Members Summary */}
            {selectedMembersForNewGroup.length > 0 && (
              <div className="mt-2">
                <Label className="text-xs text-muted-foreground">Selected ({selectedMembersForNewGroup.length} added):</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMembersForNewGroup.map(id => {
                    const u = users.find(u => u.id === id) || searchResults.find(u => u.id === id);
                    return (
                      <div key={id} className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        {u ? u.name : "User"}
                        <span className="cursor-pointer font-bold ml-1 hover:text-destructive" onClick={() => toggleMember(id)}>x</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleCreateNewGroup} disabled={!newGroupName.trim()}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}