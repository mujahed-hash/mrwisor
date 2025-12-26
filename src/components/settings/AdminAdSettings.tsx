import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Plus, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Ad } from "@/types";

const adSchema = z.object({
    title: z.string().min(2, "Title must be at least 2 characters"),
    content: z.string().min(2, "Content is required"),
    type: z.enum(["TOP_BANNER", "BOTTOM_STICKY", "FEED"]),
    isActive: z.boolean().default(true),
    startDate: z.string().optional(), // Simply using string for date input for now
    endDate: z.string().optional(),
});

export function AdminAdSettings() {
    const [ads, setAds] = useState<Ad[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Ad | null>(null);

    const form = useForm<z.infer<typeof adSchema>>({
        resolver: zodResolver(adSchema),
        defaultValues: {
            title: "",
            content: "",
            type: "TOP_BANNER",
            isActive: true,
        },
    });

    const fetchAds = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/ads', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to fetch ads');
            const data = await response.json();
            setAds(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load ads");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const onSubmit = async (values: z.infer<typeof adSchema>) => {
        try {
            const token = localStorage.getItem('token');
            const url = editingAd ? `/api/ads/${editingAd.id}` : '/api/ads';
            const method = editingAd ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) throw new Error('Failed to save ad');

            toast.success(editingAd ? "Ad updated" : "Ad created");
            setIsDialogOpen(false);
            setEditingAd(null);
            form.reset({
                title: "",
                content: "",
                type: "TOP_BANNER",
                isActive: true,
            });
            fetchAds();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save ad");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this ad?")) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/ads/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) throw new Error('Failed to delete');
            toast.success("Ad deleted");
            fetchAds();
        } catch (error) {
            toast.error("Failed to delete ad");
        }
    };

    const openEdit = (ad: Ad) => {
        setEditingAd(ad);
        form.reset({
            title: ad.title,
            content: ad.content,
            type: ad.type as any,
            isActive: ad.isActive,
            startDate: ad.startDate ? new Date(ad.startDate).toISOString().split('T')[0] : undefined,
            endDate: ad.endDate ? new Date(ad.endDate).toISOString().split('T')[0] : undefined,
        });
        setIsDialogOpen(true);
    };

    const openNew = () => {
        setEditingAd(null);
        form.reset({
            title: "",
            content: "",
            type: "TOP_BANNER",
            isActive: true,
        });
        setIsDialogOpen(true);
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Ad Management</CardTitle>
                    <CardDescription>Create and manage advertisements</CardDescription>
                </div>
                <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> New Ad</Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-4">No ads found</TableCell>
                                    </TableRow>
                                ) : ads.map((ad) => (
                                    <TableRow key={ad.id}>
                                        <TableCell className="font-medium">{ad.title}</TableCell>
                                        <TableCell>{ad.type}</TableCell>
                                        <TableCell>
                                            {ad.isActive ? (
                                                <div className="flex items-center text-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Active</div>
                                            ) : (
                                                <div className="flex items-center text-muted-foreground"><XCircle className="mr-1 h-3 w-3" /> Inactive</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{editingAd ? 'Edit Ad' : 'Create New Ad'}</DialogTitle>
                            <DialogDescription>
                                Configuration for the advertisement.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Internal Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Summer Sale Banner" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Position Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a display type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="TOP_BANNER">Top Banner</SelectItem>
                                                    <SelectItem value="BOTTOM_STICKY">Bottom Sticky</SelectItem>
                                                    <SelectItem value="FEED">Internal Feed</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Content / Text</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Get 50% off premium now!" {...field} />
                                            </FormControl>
                                            <FormDescription>The text or HTML to display.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel>Active Status</FormLabel>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit">Save Ad</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
