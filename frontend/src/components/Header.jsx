import { Menu, Sparkles } from "lucide-react";

export default function Header({ onMenu }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Sparkles size={17} /></div>
        <div>
          <div className="brand-name">Sunrise Suites</div>
          <div className="brand-subtitle">HOTEL & RESORT</div>
        </div>
      </div>

      <nav className="topnav">
        <a href="#assistant">Assistant</a>
        <a href="#hotel">About</a>
      </nav>

      <button className="icon-button mobile-menu" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
    </header>
  );
}
