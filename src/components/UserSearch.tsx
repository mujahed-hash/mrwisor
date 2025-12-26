import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface UserSearchProps {
    onSelect: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function UserSearch({ onSelect, placeholder = "Search users...", className }: UserSearchProps) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            if (searchQuery.length < 2) {
                setUsers([]);
                return;
            }

            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error("Error searching users:", error);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {value
                        ? value
                        : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {loading && <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>}
                        {!loading && users.length === 0 && searchQuery.length >= 2 && (
                            <CommandEmpty>
                                No user found.
                                <Button
                                    variant="link"
                                    className="h-auto p-0 text-xs mt-1"
                                    onClick={() => {
                                        onSelect(searchQuery);
                                        setOpen(false);
                                    }}
                                >
                                    Add "{searchQuery}" as new/shadow user
                                </Button>
                            </CommandEmpty>
                        )}
                        {!loading && searchQuery.length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">Type at least 2 characters</div>
                        )}
                        <CommandGroup>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.email} // Use email or ID as value
                                    onSelect={(currentValue) => {
                                        setValue(user.name); // Display name in button
                                        onSelect(user.customId || user.email); // Pass ID/Email to parent
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="text-[10px]">{getInitials(user.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-medium">{user.name}</span>
                                            <span className="truncate text-xs text-muted-foreground">{user.email} • {user.customId}</span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                value === user.name ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
