'use client';

import Link from 'next/link';
import { novels } from '../../novelsData'; // Ensure this path is correct

export default function NovelsPage() {
  return (
    <div className="novels-container">
      <div className="header">
        <h1>All Novels</h1>
      </div>
      <div className="novels-grid">
        {Object.entries(novels).map(([id, novel]) => (
          <div key={id} className="novel-card">
            <Link href={`/novel/${id}`} className="novel-link">
              <img
                src={novel.image}
                alt={novel.title}
                className="novel-image"
              />
              <div className="novel-info">
                <h3>{novel.title}</h3>
                <p>{novel.description || 'No description available'}</p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
