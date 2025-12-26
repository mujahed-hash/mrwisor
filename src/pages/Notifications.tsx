import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { formatDate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Notifications() {
    const { state, markNotificationRead, markAllNotificationsRead } = useAppContext();
    const { notifications } = state;

    const unreadCount = notifications.filter(n => !n.read).length;

    const navigate = useNavigate();

    useEffect(() => {
        markAllNotificationsRead();
    }, []);

    const handleNotificationClick = async (notification: any) => {
        // Mark as read immediately
        if (!notification.read) {
            markNotificationRead(notification.id);
        }

        // Parse data and navigate
        try {
            const data = notification.data ? JSON.parse(notification.data) : {};

            if (data.expenseId) {
                navigate(`/expenses/${data.expenseId}`);
            } else if (data.groupId) {
                navigate(`/groups/${data.groupId}`);
            }
        } catch (e) {
            console.error("Failed to parse notification data", e);
        }
    };

    return (
        <AppLayout>
            <div className="container mx-auto py-6 px-4 sm:px-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllNotificationsRead}>
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                <div className="grid gap-4">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <Card
                                key={notification.id}
                                className={`transition-opacity cursor-pointer hover:bg-accent/50 ${notification.read ? "bg-muted/50" : "border-l-4 border-l-primary"}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <CardHeader className="pb-2 cursor-pointer">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Bell className={`h-5 w-5 ${notification.read ? "text-gray-500" : "text-blue-600"}`} />
                                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">{notification.title}</CardTitle>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                    </div>
                                    <CardDescription className="text-gray-700 dark:text-gray-300 font-medium">{notification.message}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-gray-600 dark:text-gray-400 font-medium">No notifications yet</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
