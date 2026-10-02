"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";
import { useAuth } from "@/lib/auth/AuthContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertCircle, Bell, Check, Coins, Moon, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfileUpdate {
  displayName?: string | null;
  photoURL?: string | null;
}

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (user) {
      const firebaseUser = user as User;
      setDisplayName(firebaseUser.displayName || "");
      setEmail(firebaseUser.email || "");
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const profileUpdate: UserProfileUpdate = {
        displayName: displayName || null,
      };

      await updateUser(profileUpdate);

      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 lg:px-8 lg:py-2">
      <div className="flex flex-col space-y-5">
        <div className="bg-hero shadow-lift relative flex items-center gap-4 overflow-hidden rounded-3xl p-6">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <Avatar className="h-16 w-16 ring-4 ring-white/25">
            <AvatarFallback className="bg-white/20 text-2xl font-bold text-inherit">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="relative min-w-0">
            <p className="truncate text-xl font-extrabold tracking-tight">
              {displayName || email.split("@")[0]}
            </p>
            <p className="truncate text-sm opacity-80">{email}</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:inline-grid sm:w-auto">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-success/40 bg-success/10 text-success mb-4 rounded-2xl">
                    <Check className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={email} disabled />
                        <p className="text-muted-foreground text-sm">
                          Your email cannot be changed
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Changes are saved automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {success && (
                  <Alert className="border-success/40 bg-success/10 text-success mb-4 rounded-2xl">
                    <Check className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <SettingRow
                  icon={Coins}
                  tone="bg-highlight/40 text-highlight-foreground"
                  label="Currency"
                  htmlFor="currency"
                  description="Used for every amount in the app"
                >
                  <Select
                    value={settings.currency}
                    onValueChange={(value) => updateSettings({ currency: value })}
                  >
                    <SelectTrigger id="currency" className="w-[190px]">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PKR">Pakistani Rupee (₨)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                      <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
                      <SelectItem value="CAD">Canadian Dollar (C$)</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>

                <SettingRow
                  icon={Bell}
                  tone="bg-orange-500/12 text-orange-600 dark:text-orange-300"
                  label="Notifications"
                  htmlFor="notifications"
                  description="Spending alerts and recurring-expense updates in the bell"
                >
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={(checked) => updateSettings({ notifications: checked })}
                  />
                </SettingRow>

                <SettingRow
                  icon={Moon}
                  tone="bg-violet-500/12 text-violet-600 dark:text-violet-300"
                  label="Dark Mode"
                  htmlFor="darkMode"
                  description="Use dark theme for the application"
                >
                  <Switch
                    id="darkMode"
                    checked={resolvedTheme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <ChangePasswordCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  tone,
  label,
  htmlFor,
  description,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  htmlFor: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hover:bg-muted/50 -mx-3 flex flex-wrap items-center gap-4 rounded-2xl p-3 transition-colors">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={htmlFor} className="font-semibold">
          {label}
        </Label>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ChangePasswordCard() {
  const { changePassword } = useAuth();
  const [error, setError] = useState("");
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError("");
    try {
      await changePassword(values.currentPassword, values.newPassword);
      form.reset();
      toast.success("Password changed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't change your password.");
    }
  });

  const field = (name: keyof ChangePasswordInput, label: string, autoComplete: string) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={!!errors[name]}
        {...form.register(name)}
      />
      {errors[name] && <p className="text-destructive text-xs">{errors[name]?.message}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          At least 8 characters with upper and lower case letters, a number and a symbol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive" className="rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {field("currentPassword", "Current password", "current-password")}
          {field("newPassword", "New password", "new-password")}
          {field("confirmNewPassword", "Confirm new password", "new-password")}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
