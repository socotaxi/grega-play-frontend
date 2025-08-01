import React from 'react';

const Button = ({ children, type = "button", onClick, loading, disabled, className = '', variant = "primary" }) => {
  const base = "inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "text-white bg-indigo-600 hover:bg-indigo-700 border-transparent focus:ring-indigo-500",
    secondary: "text-gray-700 bg-white hover:bg-gray-100 border-gray-300 focus:ring-indigo-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {loading ? (
        <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
