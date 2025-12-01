import React from "react";
import { Link } from "react-router-dom";
import "../styles.css";

export default function Navbar() {
  return (
    <header className="nav">
      <div className="container nav-row">
        <Link className="brand" to="/">Clarynt</Link>
        <nav className="nav-links">
          <a
            className="btn btn-primary"
            href="mailto:logan42.ld@gmail.com?subject=Clarynt%20pilot%20intro&body=We%27d%20like%20to%20book%20a%2025-min%20intro.%20Our%20company%20is%20..."
          >
            Book intro
          </a>
        </nav>
      </div>
    </header>
  );
}
