"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Table, Pagination, Form, FormControl, Nav, Button } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUser, FaBook, FaImage, FaComment, FaClock, FaGift } from "react-icons/fa";
import debounce from "lodash/debounce"; // Add lodash for debouncing
import styles from "../../styles/AdminPage.module.css";

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const [data, setData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const itemsPerPage = 10;

  // Fetch data for the selected table with pagination and search
  const fetchTableData = useCallback(async (table, page, query) => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from(table)
        .select("*", { count: "exact" })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      // Add search filter
      if (query) {
        if (table === "users") queryBuilder = queryBuilder.ilike("name", `%${query}%`);
        if (table === "novels") queryBuilder = queryBuilder.ilike("title", `%${query}%`);
        if (table === "manga") queryBuilder = queryBuilder.ilike("title", `%${query}%`);
        if (table === "creator_applications") queryBuilder = queryBuilder.ilike("name", `%${query}%`);
        if (table === "comments") queryBuilder = queryBuilder.ilike("content", `%${query}%`);
        if (table === "chapter_queue") queryBuilder = queryBuilder.ilike("status", `%${query}%`);
        if (table === "gifs") queryBuilder = queryBuilder.ilike("title", `%${query}%`);
      }

      // Join related data server-side
      if (table === "novels" || table === "manga" || table === "creator_applications" || table === "comments" || table === "chapter_queue") {
        queryBuilder = queryBuilder.select(`
          *,
          users!${table}_user_id_fkey(name)
        `);
      }
      if (table === "comments") {
        queryBuilder = queryBuilder.select(`
          *,
          users!comments_user_id_fkey(name),
          novels!comments_novel_id_fkey(title)
        `);
      }
      if (table === "chapter_queue") {
        queryBuilder = queryBuilder.select(`
          *,
          novels!chapter_queue_novel_id_fkey(title)
        `);
      }

      const { data, error, count } = await queryBuilder;
      if (error) throw error;

      setData(data || []);
      setTotalRows(count || 0);
    } catch (err) {
      toast.error(`Error fetching ${table}: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((table, page, query) => fetchTableData(table, page, query), 500),
    [fetchTableData]
  );

  // Check superuser and fetch initial data
  useEffect(() => {
    const checkSuperuser = async () => {
      if (!connected || !publicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const walletAddress = publicKey.toString();
      const { data, error } = await supabase
        .from("users")
        .select("isSuperuser")
        .eq("wallet_address", walletAddress)
        .single();

      if (error || !data || !data.isSuperuser) {
        setError("Access denied. Superuser only.");
        setIsSuperuser(false);
        setLoading(false);
        return;
      }

      setIsSuperuser(true);
      await fetchTableData("users", 1, ""); // Initial load
    };

    checkSuperuser();
  }, [connected, publicKey, fetchTableData]);

  // Fetch data when table, page, or search changes
  useEffect(() => {
    if (isSuperuser) {
      fetchTableData(selectedTable, currentPage, searchQuery);
    }
  }, [selectedTable, currentPage, isSuperuser, fetchTableData]);

  useEffect(() => {
    if (isSuperuser && searchQuery) {
      debouncedSearch(selectedTable, 1, searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }
  }, [searchQuery, selectedTable, isSuperuser, debouncedSearch]);

  const totalPages = Math.ceil(totalRows / itemsPerPage);
  const handlePageChange = (page) => setCurrentPage(page);
  const toggleRow = (id) => setExpandedRow(expandedRow === id ? null : id);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className="text-white">Loading {selectedTable.replace("_", " ")}...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={styles.connectContainer}>
        <h2 className={styles.connectTitle}>Connect Your Wallet</h2>
        <p className="text-muted mb-4">Please connect your wallet to access the admin dashboard.</p>
        <WalletMultiButton className={styles.btnConnect} />
      </div>
    );
  }

  if (!isSuperuser) {
    return (
      <div className={styles.connectContainer}>
        <h2 className={styles.connectTitle}>Access Denied</h2>
        <p className="text-muted mb-4">{error}</p>
        <WalletMultiButton className={styles.btnConnect} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 className={styles.sidebarTitle}>Admin Panel</h3>
        </div>
        <Nav className="flex-column">
          {[
            { name: "users", icon: <FaUser /> },
            { name: "novels", icon: <FaBook /> },
            { name: "manga", icon: <FaImage /> },
            { name: "creator_applications", icon: <FaUser /> },
            { name: "comments", icon: <FaComment /> },
            { name: "chapter_queue", icon: <FaClock /> },
            { name: "gifs", icon: <FaGift /> },
          ].map((item) => (
            <Nav.Link
              key={item.name}
              onClick={() => {
                setSelectedTable(item.name);
                setCurrentPage(1);
                setSearchQuery("");
              }}
              className={`${styles.navLink} ${selectedTable === item.name ? styles.activeNavLink : ""}`}
            >
              {item.icon} <span className="ms-2">{item.name.replace("_", " ")}</span>
            </Nav.Link>
          ))}
        </Nav>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <h1 className={styles.mainTitle}>{selectedTable.replace("_", " ").toUpperCase()}</h1>

        {/* Search Bar */}
        <Form className="mb-4">
          <FormControl
            type="text"
            placeholder={`Search ${selectedTable}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </Form>

        {/* Table */}
        <Table striped bordered hover className={styles.table}>
          <thead>
            <tr>
              {selectedTable === "users" && (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Roles</th>
                </>
              )}
              {selectedTable === "novels" && (
                <>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Summary</th>
                </>
              )}
              {selectedTable === "manga" && (
                <>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                </>
              )}
              {selectedTable === "creator_applications" && (
                <>
                  <th>ID</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                </>
              )}
              {selectedTable === "comments" && (
                <>
                  <th>ID</th>
                  <th>User</th>
                  <th>Novel</th>
                  <th>Content</th>
                </>
              )}
              {selectedTable === "chapter_queue" && (
                <>
                  <th>ID</th>
                  <th>Novel</th>
                  <th>Chapter #</th>
                  <th>Status</th>
                  <th>Release Date</th>
                </>
              )}
              {selectedTable === "gifs" && (
                <>
                  <th>ID</th>
                  <th>Title</th>
                  <th>URL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row) => (
                <>
                  <tr key={row.id} onClick={() => toggleRow(row.id)} className={styles.tableRow}>
                    {selectedTable === "users" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.name || "N/A"}</td>
                        <td>{row.email || "N/A"}</td>
                        <td>
                          {row.isSuperuser && "Superuser "}
                          {row.isWriter && "Writer "}
                          {row.isArtist && "Artist"}
                        </td>
                      </>
                    )}
                    {selectedTable === "novels" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.summary?.slice(0, 50)}...</td>
                      </>
                    )}
                    {selectedTable === "manga" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.status}</td>
                      </>
                    )}
                    {selectedTable === "creator_applications" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.role}</td>
                        <td>{row.application_status}</td>
                      </>
                    )}
                    {selectedTable === "comments" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.novels?.title || "Unknown"}</td>
                        <td>{row.content.slice(0, 50)}...</td>
                      </>
                    )}
                    {selectedTable === "chapter_queue" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.novels?.title || "Unknown"}</td>
                        <td>{row.chapter_number}</td>
                        <td>{row.status}</td>
                        <td>{new Date(row.release_date).toLocaleString()}</td>
                      </>
                    )}
                    {selectedTable === "gifs" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>
                          <a href={row.url} target="_blank" rel="noopener noreferrer">
                            {row.url.slice(0, 30)}...
                          </a>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedRow === row.id && (
                    <tr className={styles.expandedRow}>
                      <td colSpan={selectedTable === "chapter_queue" ? 5 : 4}>
                        <div className={styles.expandedContent}>
                          {selectedTable === "users" && (
                            <>
                              <p><strong>Wallet Address:</strong> {row.wallet_address}</p>
                              <p><strong>Balance:</strong> {row.balance || 0}</p>
                              <p><strong>Weekly Points:</strong> {row.weekly_points || 0}</p>
                            </>
                          )}
                          {selectedTable === "novels" && (
                            <>
                              <p><strong>Summary:</strong> {row.summary}</p>
                              <p><strong>User ID:</strong> {row.user_id}</p>
                              <p><strong>Image:</strong> <a href={row.image} target="_blank">{row.image}</a></p>
                            </>
                          )}
                          {selectedTable === "manga" && (
                            <>
                              <p><strong>Summary:</strong> {row.summary}</p>
                              <p><strong>Cover Image:</strong> <a href={row.cover_image} target="_blank">{row.cover_image}</a></p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "creator_applications" && (
                            <>
                              <p><strong>Email:</strong> {row.email}</p>
                              <p><strong>Reason:</strong> {row.reason}</p>
                              <p><strong>Submission Link:</strong> <a href={row.submission_link} target="_blank">{row.submission_link}</a></p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "comments" && (
                            <>
                              <p><strong>Full Content:</strong> {row.content}</p>
                              <p><strong>Chapter ID:</strong> {row.chapter_id}</p>
                              <p><strong>Parent ID:</strong> {row.parent_id || "N/A"}</p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "chapter_queue" && (
                            <>
                              <p><strong>Novel ID:</strong> {row.novel_id}</p>
                              <p><strong>Is Advance:</strong> {row.is_advance ? "Yes" : "No"}</p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "gifs" && (
                            <>
                              <p><strong>Tags:</strong> {row.tags?.join(", ")}</p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            ) : (
              <tr>
                <td colSpan={selectedTable === "chapter_queue" ? 5 : 4} className="text-center text-muted">
                  No records available
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        {/* Pagination */}
        <Pagination className={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => (
            <Pagination.Item
              key={i + 1}
              active={i + 1 === currentPage}
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </div>
  );
}