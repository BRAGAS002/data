import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
}

const RefreshButton = ({ onClick, isLoading = false, className }: RefreshButtonProps) => {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading}
      className={cn("flex items-center gap-2", className)}
    >
      <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
      <span>Refresh</span>
    </Button>
  );
};

export default RefreshButton; 