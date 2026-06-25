interface Props {
  value: number;            // 0..max, 0.5 addımlarla
  onChange?: (v: number) => void;
  max?: number;             // default 5
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showLabel?: boolean;
}

const sizeMap = {
  sm: { dot: "w-5 h-5", gap: "gap-1.5" },
  md: { dot: "w-7 h-7", gap: "gap-2" },
  lg: { dot: "w-9 h-9", gap: "gap-2.5" },
};

/**
 * 0–N rating using solid filled circles (dark blue).
 * Hər dairənin sol yarısı → 0.5 bal, sağ yarısı → tam bal verir.
 * Eyni dəyəri yenidən seçmək → 0-a sıfırlayır.
 */
export const RatingCircles = ({
  value,
  onChange,
  max = 5,
  size = "md",
  readOnly = false,
  showLabel = true,
}: Props) => {
  const cls = sizeMap[size];
  const handle = (next: number) => {
    if (readOnly || !onChange) return;
    onChange(value === next ? 0 : next);
  };
  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1);
  return (
    <div className={`flex items-center ${cls.gap}`}>
      {Array.from({ length: max }).map((_, i) => {
        // Bu dairənin doluluğu: tam dolu, yarı dolu, və ya boş
        const fill: "full" | "half" | "empty" =
          value >= i + 1 ? "full" : value >= i + 0.5 ? "half" : "empty";
        return (
          <div key={i} className={`${cls.dot} relative rounded-full ${fill === "empty" ? "border-2 border-border" : ""}`}>
            {/* Vizual fon */}
            {fill === "full" && <div className="absolute inset-0 rounded-full bg-blue-700" />}
            {fill === "half" && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-border" />
                <div
                  className="absolute inset-0 rounded-full bg-blue-700"
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              </>
            )}
            {/* Klik zonaları (sol yarı = .5, sağ yarı = tam) */}
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`${i + 0.5} bal`}
                  onClick={() => handle(i + 0.5)}
                  className="absolute inset-y-0 left-0 w-1/2 rounded-l-full hover:bg-blue-500/10 cursor-pointer"
                />
                <button
                  type="button"
                  aria-label={`${i + 1} bal`}
                  onClick={() => handle(i + 1)}
                  className="absolute inset-y-0 right-0 w-1/2 rounded-r-full hover:bg-blue-500/10 cursor-pointer"
                />
              </>
            )}
          </div>
        );
      })}
      {showLabel && (
        <span className="ml-3 text-sm font-medium text-foreground tabular-nums">
          {fmt(value)}/{max}
        </span>
      )}
    </div>
  );
};

export default RatingCircles;
