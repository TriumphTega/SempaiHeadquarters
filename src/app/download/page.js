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
    <div className="bg-light min-vh-100 px-3 px-md-4 py-5">
      <div className="container">
        <h1 className="display-5 fw-bold mb-5 text-center text-dark">
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
          <p className="fw-medium text-center text-danger">{error}</p>
        )}

        {downloadInfo.length > 0 && (
          <div className="g-4 row">
            {downloadInfo.map((apk) => (
              <div key={apk.version} className="col-12">
                <div className="border-0 card h-100 shadow-sm">
                  <div className="align-items-md-center card-body d-flex flex-column flex-md-row gap-3 justify-content-md-between">
                    <div>
                      <h5 className="card-title fw-semibold mb-1">
                        Version {apk.version}
                      </h5>
                      {apk.created_at && (
                        <p className="card-text mb-0 small text-muted">
                          Released: {new Date(apk.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <a
                      href={apk.download_url}
                      className="btn btn-warning fw-medium px-4 text-white"
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
            <p className="mt-4 small text-center text-muted">
              If you have issues installing, make sure "Install from Unknown Sources" is enabled on your device.
            </p>
          </div>
        )}

        {downloadInfo.length === 0 && !loading && !error && (
          <p className="fw-medium text-center text-muted">
            No APK versions available.
          </p>
        )}
      </div>
    </div>
  );
}