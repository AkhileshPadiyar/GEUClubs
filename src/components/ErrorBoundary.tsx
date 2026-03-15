import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Database Error: ${parsed.error} during ${parsed.operationType} on ${parsed.path}`;
            isFirestoreError = true;
          }
        }
      } catch (e) {
        // Not a JSON error message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 shadow-sm text-center">
            <div className="bg-red-100 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-4">Something went wrong</h2>
            <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-stone-600 font-mono break-words">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center space-x-2 w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              <RefreshCw className="h-5 w-5" />
              <span>Reload Application</span>
            </button>
            {isFirestoreError && (
              <p className="mt-4 text-xs text-stone-400">
                This might be due to missing permissions or a configuration issue.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
