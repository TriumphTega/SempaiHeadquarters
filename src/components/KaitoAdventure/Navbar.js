 
import { Navbar as BootstrapNavbar, Nav, Container, Button } from "react-bootstrap";
import Image from "next/image";
import Link from "next/link";
import { FaHome, FaUser, FaGamepad, FaBars, FaTimes } from "react-icons/fa";
import styles from "../../styles/Combat.module.css";

const Navbar = ({ menuOpen, toggleMenu }) => (
  <BootstrapNavbar className={`${styles.navbar} ${styles.glow}`} sticky="top">
    <Container>
      <BootstrapNavbar.Brand as={Link} href="/" className={styles.logoLink}>
        <Image src="/images/logo.jpg" alt="Sempai HQ" width={40} height={40} className={styles.logo} />
        <span className={styles.logoText}>Sempai HQ</span>
      </BootstrapNavbar.Brand>
      <Button variant="link" className={styles.menuToggle} onClick={toggleMenu}>
        {menuOpen ? <FaTimes /> : <FaBars />}
      </Button>
      <Nav className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
        <Nav.Link as={Link} href="/" className={styles.navLink}>
          <FaHome className={styles.navIcon} /> Home
        </Nav.Link>
        <Nav.Link as={Link} href="/profile" className={styles.navLink}>
          <FaUser className={styles.navIcon} /> Profile
        </Nav.Link>
        <Nav.Link as={Link} href="/kaito-adventure" className={`${styles.navLink} active`}>
          <FaGamepad className={styles.navIcon} /> Game
        </Nav.Link>
      </Nav>
    </Container>
  </BootstrapNavbar>
);

export default Navbar;