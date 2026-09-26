import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Catches render errors in its children so a single broken section can never
 * unmount the entire React tree (which otherwise shows as a blank white page).
 * Renders a compact fallback showing the error message so the root cause is
 * visible, plus a button to reset / close.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught render error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-lg border-2 border-red-200 bg-red-50 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="font-semibold text-red-900">This section couldn't be displayed</h3>
          <p className="text-xs text-red-700 text-left bg-white/70 p-2 rounded font-mono break-all max-h-32 overflow-auto">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={this.handleReset}>
            {this.props.resetLabel || 'Close'}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}