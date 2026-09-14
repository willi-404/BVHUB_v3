import { forwardRef, type InputHTMLAttributes } from "react";

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Checkbox(
  { className = "", type = "checkbox", ...props },
  ref,
) {
  return <input ref={ref} type={type} data-slot="checkbox" className={`size-4 shrink-0 accent-primary ${className}`} {...props} />;
});

