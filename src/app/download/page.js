"use client";

import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function DownloadPage() {
  const [downloadInfo, setDownloadInfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDownloadInfo() {
      try {
        const res = await fetch('/api/android-download');
        if (!res.ok) throw new Error('Failed to fetch download info');
        const data = await res.json();
        const normalized = Array.isArray(data) ? data : [];
        // If API returns empty, fall back to local files for 1.0.3 and 1.0.2
        if (normalized.length === 0) {
          setDownloadInfo([
            {
              version: '1.0.3',
              download_url: '/apk/sempai-1.0.3.apk',
              created_at: '2005-08-16T00:00:00.000Z',
            },
            {
              version: '1.0.2',
              download_url: '/apk/sempai-1.0.2.apk',
              created_at: '2005-08-16T00:00:00.000Z',
            },
          ]);
        } else {
          setDownloadInfo(normalized);
        }
      } catch (err) {
        // On error, still provide local fallback
        setDownloadInfo([
          {
            version: '1.0.3',
            download_url: '/apk/sempai-1.0.3.apk',
            created_at: '2005-08-16T00:00:00.000Z',
          },
          {
            version: '1.0.2',
            download_url: '/apk/sempai-1.0.2.apk',
            created_at: '2005-08-16T00:00:00.000Z',
          },
        ]);
        setError('Could not load download info. Showing local downloads.');
      } finally {
        setLoading(false);
      }
    }
    fetchDownloadInfo();
  }, []);

  return (
    <div className="bg-light min-vh-100 py-5 px-3 px-md-4">
      <div className="container">
        <h1 className="display-5 fw-bold text-center mb-5 text-dark">
          Download Android App
        </h1>

        {loading && (
          <div className="text-center">
            <div
              className="spinner-border text-warning"
              style={{ width: '2rem', height: '2rem' }}
              role="status"
            >
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading...</p>
          </div>
        )}

        {error && (
          <p className="text-center text-danger fw-medium">{error}</p>
        )}

        {downloadInfo.length > 0 && (
          <div className="row g-4">
            {downloadInfo.map((apk) => (
              <div key={apk.version} className="col-12">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
                    <div>
                      <h5 className="card-title mb-1 fw-semibold">
                        Version {apk.version}
                      </h5>
                      {apk.created_at && (
                        <p className="card-text text-muted small mb-0">
                          Released: {new Date(apk.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <a
                      href={apk.download_url}
                      className="btn btn-warning text-white fw-medium px-4"
                      style={{ backgroundColor: '#ff6600', borderColor: '#ff6600' }}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download APK
                    </a>
                  </div>
                </div>
              </div>
            ))}
            <p className="text-center text-muted small mt-4">
              If you have issues installing, make sure "Install from Unknown Sources" is enabled on your device.
            </p>
          </div>
        )}

        {downloadInfo.length === 0 && !loading && !error && (
          <p className="text-center text-muted fw-medium">
            No APK versions available.
          </p>
        )}
      </div>
    </div>
  );
}