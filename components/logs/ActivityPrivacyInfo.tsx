import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Info, Eye, Clock } from "lucide-react";

export function ActivityPrivacyInfo() {
  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Shield className="h-5 w-5" />
          Your Privacy & Activity Tracking
        </CardTitle>
        <CardDescription className="text-blue-700 dark:text-blue-300">
          Understanding what we track and how your data is protected
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">What We Track</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Actions</Badge>
                <span className="text-blue-800 dark:text-blue-200">
                  Expense creation, updates, and deletions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Auth</Badge>
                <span className="text-blue-800 dark:text-blue-200">
                  Login, logout, and password resets
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Features</Badge>
                <span className="text-blue-800 dark:text-blue-200">
                  Receipt uploads and analysis
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Performance</Badge>
                <span className="text-blue-800 dark:text-blue-200">
                  App performance and load times
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Data Retention</h4>
            </div>
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p>• Activity logs are kept for 90 days</p>
              <p>• Only you can see your activity logs</p>
              <p>• Logs help improve app performance</p>
              <p>• No sensitive data like passwords are logged</p>
            </div>
          </div>
        </div>
        
        <Alert className="border-blue-300 bg-blue-100 dark:border-blue-700 dark:bg-blue-900">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Privacy First:</strong> Your activity data is private and encrypted. 
            We only track actions to help improve your experience and debug issues.
            You can export or request deletion of your data at any time.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}