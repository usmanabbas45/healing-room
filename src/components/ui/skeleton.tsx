import { cn } from "@/libs/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-border-primary", className)}
      {...props}
    />
  );
}

export { Skeleton };
