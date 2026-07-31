import { Component } from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBoundary — catches render/lifecycle errors in its subtree and shows
 * a recoverable fallback instead of unmounting the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep the error visible for debugging without crashing the UI
    console.error('[ErrorBoundary] Caught error:', error, info?.componentStack || '');
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary" role="alert">
          <svg className="icon icon-empty" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>Something went wrong</h2>
          <p className="error-boundary-detail">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="btn btn-primary" onClick={this.handleReset} type="button">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
