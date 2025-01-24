'use client';

import Link from 'next/link';
import { novels } from '../../novelsData'; // Ensure this path is correct

export default function NovelsPage() {
  return (
    <div className="novels-container py-5">
      {/* Page Header */}
      <div className="header text-center mb-4">
        <h1 className="text-uppercase fw-bold" style={{ color: 'rgb(243, 99, 22)' }}>
          Explore Our Novels
        </h1>
        <p className="text-muted">
          Discover a collection of captivating stories and immersive worlds.
        </p>
      </div>

      {/* Novels Grid */}
      <div className="novels-grid row g-4">
        {Object.entries(novels).map(([id, novel]) => (
          <div key={id} className="col-md-4">
            <Link href={`/novel/${id}`} className="novel-link text-decoration-none">
              <div className="novel-card shadow-sm rounded overflow-hidden">
                {/* Novel Image */}
                <img
                  src={novel.image}
                  alt={novel.title}
                  className="novel-image img-fluid w-100"
                  style={{ height: '250px', objectFit: 'cover' }}
                />
                {/* Novel Info */}
                <div className="novel-info p-3" style={{ backgroundColor: '#1c1c1c', color: '#fff' }}>
                  <h3 className="fw-bold text-truncate" style={{ color: 'rgb(243, 99, 22)' }}>
                    {novel.title}
                  </h3>
                  <p className="small text-muted text-truncate">
                    {novel.description || 'No description available'}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
