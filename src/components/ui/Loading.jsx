import React from 'react';

const Loading = ({ fullPage = false }) => {
  const wrapperClass = fullPage
    ? "flex justify-center items-center min-h-screen"
    : "flex justify-center items-center py-8";

  return (
    <div className={wrapperClass}>
      <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
    </div>
  );
};

export default Loading;
