 
import { Navbar as BootstrapNavbar, Nav, Container, Button } from "react-bootstrap";
import Link from "next/link";
import { FaHome, FaUser, FaGamepad, FaBars, FaTimes, FaToriiGate } from "react-icons/fa";
import styles from "../../styles/KaitoAdventure.module.css";

const Navbar = ({ menuOpen, toggleMenu }) => (
  <BootstrapNavbar
    sticky="top"
    style={{
      background: "linear-gradient(180deg, #0c0c0c 0%, #141210 100%)",
      borderBottom: "1px solid #2d2418",
      boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 40px rgba(204,85,0,0.04)",
      padding: "0",
    }}
  >
    <Container style={{ maxWidth: "960px", position: "relative" }}>
      {/* Top amber accent line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "2px",
        background: "linear-gradient(90deg, transparent, #cc5500, #c9a84c, #cc5500, transparent)",
        opacity: 0.5,
      }} />

      <BootstrapNavbar.Brand
        as={Link}
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#f5e6d3",
          fontWeight: 700,
          fontSize: "1rem",
          letterSpacing: "2px",
          fontFamily: "'Noto Serif JP', Georgia, serif",
          textDecoration: "none",
          padding: "12px 0",
        }}
      >
        <FaToriiGate size={28} style={{ color: "#cc5500", filter: "drop-shadow(0 0 8px rgba(204,85,0,0.4))" }} />
        <span>Kaito&apos;s Adventure</span>
      </BootstrapNavbar.Brand>

      <Button
        variant="link"
        onClick={toggleMenu}
        style={{ color: "#a09080", padding: "8px" }}
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </Button>

      <Nav
        className={menuOpen ? "d-flex" : "d-none d-md-flex"}
        style={{ gap: "8px", alignItems: "center" }}
      >
        {[
          { href: "/", icon: <FaHome size={14} />, label: "Home" },
          { href: "/profile", icon: <FaUser size={14} />, label: "Profile" },
          { href: "/kaito-adventure", icon: <FaGamepad size={14} />, label: "Game", active: true },
        ].map((link) => (
          <Nav.Link
            key={link.href}
            as={Link}
            href={link.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: link.active ? "#ff6b35" : "#a09080",
              fontSize: "0.85rem",
              letterSpacing: "1px",
              padding: "6px 12px",
              borderRadius: "2px",
              border: link.active ? "1px solid rgba(204,85,0,0.3)" : "1px solid transparent",
              background: link.active ? "rgba(204,85,0,0.08)" : "transparent",
              transition: "all 0.2s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f5e6d3";
              e.currentTarget.style.borderColor = "rgba(204,85,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = link.active ? "#ff6b35" : "#a09080";
              e.currentTarget.style.borderColor = link.active ? "rgba(204,85,0,0.3)" : "transparent";
            }}
          >
            {link.icon}
            {link.label}
          </Nav.Link>
        ))}
      </Nav>
    </Container>
  </BootstrapNavbar>
);

export default Navbar;