import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF8F5]">
          <div className="editorial-card p-6 sm:p-8 bg-white max-w-md w-full text-center space-y-4 border border-[#2D160E] shadow-[4px_4px_0_#2D160E]">
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-[#2D160E]">Terjadi Kendala</h2>
            <p className="text-xs text-[#6B5347] leading-relaxed">
              {this.state.error?.message || 'Halaman mengalami kesalahan saat memuat tampilan.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary text-xs py-2 px-5 flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCcw size={14} />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
