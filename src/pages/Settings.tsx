import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAppContext } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation as useLocationHook } from "@/hooks/useLocation";
import { PushManager } from "@/services/PushManager";

import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Layout from "@/components/layout/Layout";
import { AdminAdSettings } from "@/components/settings/AdminAdSettings";
import { Check, X, Loader2, MapPin, RefreshCw, Trash2, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Location Settings Card Component
function LocationSettingsCard() {
  const { location, loading, error, refreshLocation, permissionStatus } = useLocationHook();
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Fetch current saved location on mount
  useEffect(() => {
    const fetchCurrentLocation = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const user = await response.json();
          if (user.city || user.country) {
            setCurrentLocation({
              city: user.city,
              state: user.state,
              country: user.country,
              zipCode: user.zipCode,
              address: user.address
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch current location:', err);
      }
    };
    fetchCurrentLocation();
  }, []);

  const handleUpdateLocation = async () => {
    setIsUpdating(true);
    setUpdateSuccess(false);
    try {
      const newLocation = await refreshLocation();
      if (newLocation) {
        setCurrentLocation({
          city: newLocation.city,
          state: newLocation.state,
          country: newLocation.country,
          zipCode: newLocation.zipCode,
          address: newLocation.address
        });
        setUpdateSuccess(true);
        toast.success("Location updated successfully!");
        localStorage.setItem('userLocationSet', 'true');
        setTimeout(() => setUpdateSuccess(false), 3000);
      } else {
        toast.error("Failed to get location. Please allow location access.");
      }
    } catch (err) {
      toast.error("Failed to update location");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-500" />
          Location
        </CardTitle>
        <CardDescription>
          Share your location to get personalized deals and connect with nearby friends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Display - Simplified for users */}
        {currentLocation ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Location Enabled
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                {[currentLocation.city, currentLocation.country].filter(Boolean).join(', ') || 'Location shared'}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No location set</p>
            <p className="text-xs text-gray-400 mt-1">Click the button below to share your location</p>
          </div>
        )}

        {/* Update Button */}
        <Button
          onClick={handleUpdateLocation}
          disabled={isUpdating}
          className="w-full"
          variant={currentLocation ? "outline" : "default"}
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting location...
            </>
          ) : updateSuccess ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Location Updated!
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              {currentLocation ? "Update My Location" : "Share My Location"}
            </>
          )}
        </Button>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        {/* Privacy Note */}
        <p className="text-xs text-gray-400 text-center">
          Your location is stored securely and used to personalize your experience.
        </p>
      </CardContent>
    </Card>
  );
}

// --- Form Schemas ---

const preferencesSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.string(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

const profileSchema = z.object({
  customId: z.string().min(3, "Custom ID must be at least 3 characters").max(20, "Custom ID must be at most 20 characters").regex(/^[a-zA-Z0-9_-]+$/, "Only letters, numbers, underscores and hyphens allowed"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const API_URL = '/api';

// Security Password Card with OTP verification
function SecurityPasswordCard({ user }: { user: any }) {
  const [step, setStep] = useState<'initial' | 'otp' | 'password'>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [codeSentAt, setCodeSentAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Countdown timer
  useEffect(() => {
    if (!codeSentAt) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - codeSentAt.getTime()) / 1000);
      const remaining = 60 - elapsed;
      if (remaining <= 0) {
        setCanResend(true);
        setCountdown(0);
        clearInterval(timer);
      } else {
        setCountdown(remaining);
        setCanResend(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [codeSentAt]);

  const sendOTP = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      setCodeSentAt(new Date());
      setCanResend(false);
      setCountdown(60);
      setStep('otp');
      toast.success("Verification code sent to your email");
    } catch (err) {
      setError("Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setResetToken(data.resetToken);
      setStep('password');
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: values.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      toast.success("Password updated successfully");
      setStep('initial');
      passwordForm.reset();
      setOtp("");
      setResetToken("");
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          {step === 'initial' && "Change your password securely with email verification."}
          {step === 'otp' && `Enter the 6-digit code sent to ${user.email}`}
          {step === 'password' && "Set your new password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        {step === 'initial' && (
          <Button onClick={sendOTP} disabled={isLoading}>
            {isLoading ? "Sending..." : "Change Password"}
          </Button>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="flex gap-1 justify-center">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center text-xl font-bold"
                  value={otp[i] || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newOtp = otp.split('');
                    newOtp[i] = val;
                    setOtp(newOtp.join('').slice(0, 6));
                    if (val && i < 5) {
                      const next = e.target.nextElementSibling as HTMLInputElement;
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otp[i] && i > 0) {
                      const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                      prev?.focus();
                    }
                  }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={verifyOTP} disabled={isLoading || otp.length !== 6} className="flex-1">
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                variant="outline"
                onClick={sendOTP}
                disabled={!canResend || isLoading}
              >
                {canResend ? "Resend" : `${countdown}s`}
              </Button>
            </div>
            <Button variant="ghost" onClick={() => { setStep('initial'); setOtp(""); }} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {step === 'password' && (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Updating..." : "Update Password"}
                </Button>
                <Button variant="ghost" onClick={() => { setStep('initial'); setOtp(""); setResetToken(""); }} type="button">
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}


export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { state } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  // Custom ID Check States
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idAvailability, setIdAvailability] = useState<'idle' | 'available' | 'taken'>('idle');
  const [deletedGroups, setDeletedGroups] = useState<any[]>([]);
  const [isLoadingDeletedGroups, setIsLoadingDeletedGroups] = useState(false);
  const [isDeletedGroupsExpanded, setIsDeletedGroupsExpanded] = useState(false);

  const preferences = user?.preferences || {
    theme: "system",
    emailNotifications: true,
    pushNotifications: true,
    language: "en",
    defaultCurrency: "USD",
  };

  // --- Forms ---

  const preferencesForm = useForm<z.infer<typeof preferencesSchema>>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: (preferences.theme as "light" | "dark" | "system") || "system",
      language: preferences.language || "en",
      emailNotifications: preferences.emailNotifications ?? true,
      pushNotifications: preferences.pushNotifications ?? true,
    },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      customId: user?.customId || "",
      name: user?.name || "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Update form values if user loads late
  useEffect(() => {
    if (user) {
      profileForm.reset({
        customId: user.customId || "",
        name: user.name || "",
      });
    }
  }, [user, profileForm]);

  // Fetch deleted groups
  useEffect(() => {
    const fetchDeletedGroups = async () => {
      try {
        setIsLoadingDeletedGroups(true);
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/groups/deleted', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setDeletedGroups(data);
        }
      } catch (error) {
        console.error('Failed to fetch deleted groups:', error);
      } finally {
        setIsLoadingDeletedGroups(false);
      }
    };

    fetchDeletedGroups();
  }, []);

  // Real-time Custom ID check
  const watchedCustomId = profileForm.watch("customId");

  useEffect(() => {
    const checkAvailability = async () => {
      if (!watchedCustomId || watchedCustomId === user?.customId || watchedCustomId.length < 3) {
        setIdAvailability('idle');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) return; // Prevent 403 if token missing

      setIsCheckingId(true);
      try {
        const response = await fetch(`/api/users/check-custom-id?customId=${watchedCustomId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.available) {
          setIdAvailability('available');
        } else {
          setIdAvailability('taken');
        }
      } catch (error) {
        console.error("Failed to check custom ID", error);
        setIdAvailability('idle');
      } finally {
        setIsCheckingId(false);
      }
    };

    const timeoutId = setTimeout(checkAvailability, 500); // Debounce 500ms
    return () => clearTimeout(timeoutId);
  }, [watchedCustomId, user?.customId]);


  if (!user) {
    navigate("/login");
    return null;
  }

  // --- Handlers ---

  const onPreferencesSubmit = async (values: z.infer<typeof preferencesSchema>) => {
    setIsLoading(true);
    try {
      await updateUser({
        preferences: {
          ...preferences,
          theme: values.theme,
          language: values.language,
          emailNotifications: values.emailNotifications,
          pushNotifications: values.pushNotifications,
        },
      });
      toast.success("Preferences updated successfully");

      // If push notifications enabled, register device
      if (values.pushNotifications) {
        PushManager.register();
      }

    } catch (error) {
      toast.error("Failed to update preferences");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (idAvailability === 'taken') {
      toast.error("Custom ID is already taken");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update context
      updateUser(updatedUser);

      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: values.password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update password');
      }

      passwordForm.reset();
      toast.success("Password updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAds = async (enabled: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token} `
        },
        body: JSON.stringify({ ads_enabled: enabled })
      });

      if (!response.ok) throw new Error('Failed');

      toast.success(`Ads ${enabled ? 'enabled' : 'disabled'} successfully.Refreshing...`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Failed to update ad settings");
    }
  };

  return (
    <Layout>
      <div className="container max-w-4xl py-8 mb-10 px-2 sm:px-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <Separator />

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Identification</CardTitle>
              <CardDescription>
                Update your display name and unique Custom ID.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="customId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom ID</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input placeholder="unique-id" {...field} />
                          </FormControl>
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            {isCheckingId && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {!isCheckingId && idAvailability === 'available' && <Check className="h-4 w-4 text-green-500" />}
                            {!isCheckingId && idAvailability === 'taken' && <X className="h-4 w-4 text-red-500" />}
                          </div>
                        </div>
                        <FormDescription>
                          {idAvailability === 'taken' ? (
                            <span className="text-red-500 font-medium">This ID is already taken.</span>
                          ) : (
                            "A unique ID for searching and tagging (3-20 characters)."
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading || idAvailability === 'taken'}>Save Profile</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security Settings with OTP Verification */}
          <SecurityPasswordCard user={user} />

          {/* Location Settings */}
          <LocationSettingsCard />

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the appearance of the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                  <FormField
                    control={preferencesForm.control}
                    name="theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Theme</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={preferencesForm.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>Save Preferences</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {user.role === 'admin' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>System Settings (Admin)</CardTitle>
                  <CardDescription>Global configuration for the application</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Ads</FormLabel>
                      <FormDescription>
                        Show advertisements to all users
                      </FormDescription>
                    </div>
                    <Switch
                      checked={state.settings?.ads_enabled === 'true'}
                      onCheckedChange={toggleAds}
                    />
                  </div>
                </CardContent>
              </Card>

              <AdminAdSettings />
            </>
          )}

          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...preferencesForm}>
                <form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)} className="space-y-6">
                  <FormField
                    control={preferencesForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Email Notifications</FormLabel>
                          <FormDescription>
                            Receive email notifications about new expenses
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={preferencesForm.control}
                    name="pushNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Push Notifications</FormLabel>
                          <FormDescription>
                            Receive push notifications on your device
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading}>Save Notifications</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Recently Deleted Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                Recently Deleted Groups
              </CardTitle>
              <CardDescription>
                Deleted groups are available for viewing for 4 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeletedGroups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deletedGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recently deleted groups</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Show only first 2 by default, all when expanded */}
                  {(isDeletedGroupsExpanded ? deletedGroups : deletedGroups.slice(0, 2)).map((group) => (
                    <div
                      key={group.id}
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-muted/30 hover:bg-muted cursor-pointer transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                          <AvatarFallback className="bg-destructive/10 text-destructive text-xs sm:text-sm">
                            {group.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{group.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Deleted {new Date(group.deletedAt).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                        {group.daysRemaining > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            {group.daysRemaining}d left
                          </span>
                        ) : (
                          <span className="text-destructive">Expiring</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Show More / Show Less button */}
                  {deletedGroups.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsDeletedGroupsExpanded(!isDeletedGroupsExpanded)}
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      {isDeletedGroupsExpanded
                        ? `Show Less`
                        : `Show ${deletedGroups.length - 2} More`}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Manage your account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Logout</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will be logged out of your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      logout();
                      navigate("/login");
                    }}>
                      Logout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}