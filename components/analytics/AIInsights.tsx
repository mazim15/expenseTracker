"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExpenseType } from "@/types/expense";
import { AIService } from "@/lib/ai";
import { SpendingInsight, SpendingAnomaly } from "@/types/ai";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  RefreshCw,
  Lightbulb,
  Target,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AIInsightsProps {
  expenses: ExpenseType[];
  className?: string;
}

export function AIInsights({ expenses, className }: AIInsightsProps) {
  const [insights, setInsights] = useState<{
    quickInsight: string;
    keyInsights: SpendingInsight[];
    recommendations: string[];
    healthScore: number;
  } | null>(null);
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const aiService = AIService.getInstance();

  const loadAIInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardInsights, detectedAnomalies] = await Promise.all([
        aiService.getDashboardInsights(expenses),
        aiService.checkForAnomalies(expenses)
      ]);

      setInsights(dashboardInsights);
      setAnomalies(detectedAnomalies);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      setError('Failed to generate AI insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [expenses, aiService]);

  useEffect(() => {
    setAiEnabled(aiService.isAIEnabled());
    if (expenses.length > 0 && aiService.isAIEnabled()) {
      loadAIInsights();
    } else {
      setLoading(false);
    }
  }, [expenses, aiService, loadAIInsights]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'trend':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!aiEnabled) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            AI Insights
          </CardTitle>
          <CardDescription>
            Powered by Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              AI insights are not available. Please configure your Gemini API key to enable intelligent spending analysis.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Add some expenses to get AI-powered insights about your spending patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: loading ? 360 : 0 }}
                transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}
              >
                <Brain className="h-5 w-5 text-primary" />
              </motion.div>
              AI Insights
            </CardTitle>
            <CardDescription>
              Intelligent analysis powered by Gemini AI
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAIInsights}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Quick Insight */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Quick Insight
          </h4>
          {loading ? (
            <Skeleton className="h-4 w-full" />
          ) : insights?.quickInsight ? (
            <motion.p 
              className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {insights.quickInsight}
            </motion.p>
          ) : null}
        </div>

        {/* Financial Health Score */}
        {insights?.healthScore && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Financial Health Score
            </h4>
            <div className="flex items-center gap-3">
              <motion.div 
                className={`text-2xl font-bold ${getHealthScoreColor(insights.healthScore)}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {insights.healthScore}/100
              </motion.div>
              <div className="flex-1">
                <div className="w-full bg-secondary rounded-full h-2">
                  <motion.div 
                    className="bg-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${insights.healthScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Key Insights</h4>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : insights?.keyInsights?.length ? (
            <AnimatePresence>
              <div className="space-y-2">
                {insights.keyInsights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        {getInsightIcon(insight.type)}
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground">{insight.description}</p>
                        </div>
                      </div>
                      <Badge variant={getSeverityColor(insight.severity) as "default" | "secondary" | "destructive" | "outline"} className="text-xs">
                        {insight.severity}
                      </Badge>
                    </div>
                    {insight.actionable && insight.action && (
                      <div className="text-xs text-primary bg-primary/10 p-2 rounded">
                        💡 {insight.action}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          ) : (
            <p className="text-sm text-muted-foreground">No specific insights available.</p>
          )}
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Spending Anomalies
            </h4>
            <div className="space-y-2">
              {anomalies.slice(0, 3).map((anomaly, index) => (
                <motion.div
                  key={anomaly.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-yellow-200 rounded-lg p-3 bg-yellow-50/50 dark:bg-yellow-900/10"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{anomaly.description}</p>
                    <Badge variant={getSeverityColor(anomaly.severity) as "default" | "secondary" | "destructive" | "outline"} className="text-xs">
                      {anomaly.severity}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights?.recommendations?.length ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {insights.recommendations.slice(0, 3).map((recommendation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-sm bg-green-50/50 dark:bg-green-900/10 border border-green-200 rounded-lg p-3"
                >
                  💡 {recommendation}
                </motion.div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default AIInsights;