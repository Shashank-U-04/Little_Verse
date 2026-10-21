import * as React from "react";
import { cn } from "@/lib/utils";

export type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-3xl bg-white border border-[#FFF4D6] shadow-[0_8px_30px_rgba(32,92,67,0.08)] overflow-hidden",
        className
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>

export function CardHeader({ className, ...props }: CardHeaderProps): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-1.5 p-7 pb-4", className)} {...props} />
  );
}

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>

export function CardTitle({ className, ...props }: CardTitleProps): React.ReactElement {
  return (
    <h2
      className={cn(
        "text-xl font-bold leading-tight tracking-tight text-[#205C43]",
        className
      )}
      {...props}
    />
  );
}

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>

export function CardContent({ className, ...props }: CardContentProps): React.ReactElement {
  return <div className={cn("p-7 pt-0", className)} {...props} />;
}

export default Card;
