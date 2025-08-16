import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Met à jour l’état pour déclencher le rendu de fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 Caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="bg-white shadow-md rounded-lg p-6 max-w-lg text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Oups... une erreur est survenue ⚠️
            </h1>
            <p className="text-gray-700 mb-2">
              {this.state.error?.message || "Erreur inconnue"}
            </p>
            <p className="text-sm text-gray-500">
              Recharge la page ou contacte le support si ça persiste.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
