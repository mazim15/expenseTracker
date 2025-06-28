"use client";

import { motion } from "framer-motion";
import { Loader2, BarChart3 } from "lucide-react";

interface EnhancedLoadingProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "chart" | "pulse" | "dots";
}

export function EnhancedLoading({ 
  message = "Loading...", 
  size = "md", 
  variant = "default" 
}: EnhancedLoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  const containerSizes = {
    sm: "p-4",
    md: "p-8",
    lg: "p-12"
  };

  if (variant === "dots") {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`bg-primary rounded-full ${size === "sm" ? "w-2 h-2" : size === "md" ? "w-3 h-3" : "w-4 h-4"}`}
              animate={{
                y: [0, -20, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        {message && (
          <motion.p 
            className="text-sm text-muted-foreground mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        <motion.div
          className={`bg-primary/20 rounded-full ${sizeClasses[size]}`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {message && (
          <motion.p 
            className="text-sm text-muted-foreground mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <BarChart3 className={`${sizeClasses[size]} text-primary`} />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
        {message && (
          <motion.p 
            className="text-sm text-muted-foreground mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {message}
          </motion.p>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${containerSizes[size]}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className={`${sizeClasses[size]} text-primary`} />
      </motion.div>
      {message && (
        <motion.p 
          className="text-sm text-muted-foreground mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <motion.div 
      className="rounded-lg border bg-card p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-4"></div>
        </div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
        <div className="h-3 bg-muted rounded w-1/4"></div>
      </div>
    </motion.div>
  );
}

export function SkeletonChart() {
  return (
    <motion.div 
      className="rounded-lg border bg-card p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="animate-pulse space-y-4">
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
        <div className="h-[300px] bg-muted rounded flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <BarChart3 className="w-12 h-12 text-muted-foreground/50" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}