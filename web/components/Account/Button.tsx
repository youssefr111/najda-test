import { FC, ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'danger' | 'secondary';
  [key: string]: unknown;
}

const Button: FC<ButtonProps> = ({ children, variant = "primary", ...props }) => {
  const base = "px-4 py-2 rounded-lg transition font-medium";

  const variants: Record<string, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-black"
  };

  return (
    <button {...props} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
};

export default Button;