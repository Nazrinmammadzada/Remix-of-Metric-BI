import * as React from "react";
import { cn } from "@/lib/utils";

interface WeightInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type" | "min" | "max" | "step"> {
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/**
 * Standart "Çəki (%)" numeric input.
 * - Yalnız rəqəm qəbul edir (0-9)
 * - Fokus alanda mövcud dəyəri seçir (0 və ya digər), ilk yazılan rəqəm 0-ı əvəz edir
 * - min=0, max=100 klemplənir; artıq başında sıfırlar ("05") saxlanılmır
 */
export const WeightInput = React.forwardRef<HTMLInputElement, WeightInputProps>(
  ({ value, onChange, min = 0, max = 100, className, onFocus, onKeyDown, onBeforeInput, ...rest }, ref) => {
    const display = value === undefined || value === null || value === "" ? "" : String(Number(value));

    const clamp = (n: number) => Math.max(min, Math.min(max, n));

    return (
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={display}
        onFocus={(e) => {
          e.currentTarget.select();
          onFocus?.(e);
        }}
        onBeforeInput={(e: any) => {
          const data: string | null = e.data;
          if (data != null && !/^\d+$/.test(data)) {
            e.preventDefault();
          }
          onBeforeInput?.(e);
        }}
        onKeyDown={(e) => {
          if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
          onKeyDown?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          if (raw === "") {
            onChange(0);
            return;
          }
          const n = clamp(parseInt(raw, 10));
          onChange(isNaN(n) ? 0 : n);
        }}
        className={cn(
          "w-full px-2.5 py-1.5 text-sm border border-border rounded bg-background disabled:opacity-60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className,
        )}
        {...rest}
      />
    );
  },
);
WeightInput.displayName = "WeightInput";
