import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null, info:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error("UI crash:", error, info); this.setState({ info: info?.componentStack }); }
  render(){
    if(this.state.hasError){
      return (
        <div style={{ padding: 16 }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace:"pre-wrap" }}>{String(this.state.error)}</pre>
          {this.state.info && <pre style={{ whiteSpace:"pre-wrap", opacity:0.7 }}>{this.state.info}</pre>}
        </div>
      );
    }
    return this.props.children;
  }
}
