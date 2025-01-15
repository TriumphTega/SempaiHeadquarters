import Link from 'next/link';
import { novels } from '../novelsData';  // Import the novels data

export default function Home() {
  return (
    <div className='bg-black'>
      {/* Navbar */}
      <nav className="bg-dark navbar navbar-dark navbar-expand-lg">
        <div className="container">
          <Link href="/" className="navbar-brand">Sempai HQ</Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="me-auto navbar-nav">
              <li className="nav-item">
                <Link href="/" className="active nav-link">Home</Link>
              </li>
              <li className="nav-item">
                <Link href="/about" className="nav-link">About</Link>
              </li>
            </ul>
            <ul className="ms-auto navbar-nav">
              <li className="nav-item">
                <Link href="/about" className="btn btn-warning text-dark">Connect</Link>
              </li>
              {/* Creator Dashboard Link */}
              <li className="nav-item">
              <Link href="/creators-dashboard" className="btn btn-warning text-dark">Creator's Dashboard</Link>

              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-orange py-5 text-center text-white">
        <div className="container">
          <h1 className="display-4">Welcome to Sempai HQ</h1>
          <p className="lead">Explore your favorite novels and chapters!</p>
        </div>
      </header>

      {/* Novels Grid */}
      <div className="container my-5">
        <div className="g-4 row row-cols-1 row-cols-md-3">
          {Object.values(novels).map((novel, index) => (
            <div key={index} className="col">
              <div className="card h-100 shadow-sm bg-card">
                {/* Card Image */}
                <img
                  src={novel.image}
                  className="card-img-top"
                  alt={novel.title}
                />
                <div className="card-body">
                  {/* Card Title */}
                  <h5 className="card-title fw-bold text-orange text-uppercase">
                    {novel.title}
                  </h5>
                  <p className="card-text card-text">Click to explore chapters</p>
                  <Link href={`/novel/${index + 1}`} className="btn btn-dark">
                    Explore
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {/* Additional cards */}
          <div className="col">
            <div className="card h-100 shadow-sm bg-card">
              {/* Card Image */}
              <img
                src="/images/novel-3.jpg"
                className="card-img-top"
                alt="Hoard"
              />
              <div className="card-body">
                {/* Card Title */}
                <h5 className="card-title fw-bold text-orange text-uppercase">
                  Hoard
                </h5>
                <p className="card-text card-text">Click to explore chapters</p>
                <Link href="/novel/3" className="btn btn-dark">
                  Explore more books
                </Link>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="card h-100 shadow-sm bg-card">
              {/* Card Image */}
              <img
                src="/images/novel-4.jpg"
                className="card-img-top"
                alt="KISS(Keep It Simple, Stupid)"
              />
              <div className="card-body">
                {/* Card Title */}
                <h5 className="card-title fw-bold text-orange text-uppercase">
                  KISS (Keep It Simple, Stupid)
                </h5>
                <p className="card-text card-text">Click to explore chapters</p>
                <Link href="/novel/4" className="btn btn-dark">
                  Explore more books
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark py-4 text-center text-white">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
