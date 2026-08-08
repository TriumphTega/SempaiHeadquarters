"use client";

import React, { useState, useEffect, useCallback, useContext } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Table, Pagination, Form, FormControl, Nav, Button } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaUser, FaBook, FaImage, FaComment, FaClock, FaGift, FaStar, FaEdit, FaTrash, FaCheck, FaTimes, FaEye, FaEyeSlash } from "react-icons/fa";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import debounce from "lodash/debounce"; // Add lodash for debouncing
import styles from "../../styles/AdminPage.module.css";

export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const { wallet } = useContext(EmbeddedWalletContext);
  const [data, setData] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTable, setSelectedTable] = useState("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
      // Support both external and embedded wallets
      const activePublicKey = wallet?.publicKey
        ? wallet.publicKey
        : publicKey;
      
      if (!activePublicKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const walletAddress = activePublicKey.toString();
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
  }, [connected, publicKey, wallet, fetchTableData]);

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

  const getColSpan = (table) => {
    switch (table) {
      case "novels":
      case "manga":
        return 7;
      case "creator_applications":
      case "announcements":
      case "banned_devices":
      case "support_requests":
        return 5;
      case "chapter_queue":
        return 5;
      default:
        return 4;
    }
  };

  const toggleFeatured = async (table, id, currentStatus) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ featured: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`${table.slice(0, -1)} featured status updated`);
      fetchTableData(selectedTable, currentPage, searchQuery);
    } catch (err) {
      toast.error(`Failed to update featured status: ${err.message}`);
    }
  };

  const toggleVisibility = async (table, id, currentStatus) => {
    try {
      const column = table === "novels" ? "is_visible" : "is_visible";
      const { error } = await supabase
        .from(table)
        .update({ [column]: !currentStatus })
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`${table.slice(0, -1)} visibility updated`);
      fetchTableData(selectedTable, currentPage, searchQuery);
    } catch (err) {
      toast.error(`Failed to update visibility: ${err.message}`);
    }
  };

  const handleEdit = (row) => {
    setEditData(row);
    setEditModal(selectedTable);
  };

  const handleDelete = async (table, id) => {
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success(`${table.slice(0, -1)} deleted successfully`);
      setDeleteConfirm(null);
      fetchTableData(selectedTable, currentPage, searchQuery);
    } catch (err) {
      toast.error(`Failed to delete: ${err.message}`);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const { id, ...updateData } = editData;
      const { error } = await supabase
        .from(editModal)
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      toast.success(`${editModal.slice(0, -1)} updated successfully`);
      setEditModal(null);
      setEditData({});
      fetchTableData(selectedTable, currentPage, searchQuery);
    } catch (err) {
      toast.error(`Failed to update: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className="text-white">Loading {selectedTable.replace("_", " ")}...</p>
      </div>
    );
  }

  // Check if either external or embedded wallet is connected
  const isConnected = connected || (wallet?.publicKey);
  
  if (!isConnected) {
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
            { name: "announcements", icon: <FaComment /> },
            { name: "banned_devices", icon: <FaUser /> },
            { name: "support_requests", icon: <FaComment /> },
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
                  <th>Featured</th>
                  <th>Visible</th>
                  <th>Actions</th>
                </>
              )}
              {selectedTable === "manga" && (
                <>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Visible</th>
                  <th>Actions</th>
                </>
              )}
              {selectedTable === "creator_applications" && (
                <>
                  <th>ID</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
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
              {selectedTable === "announcements" && (
                <>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Release Date</th>
                  <th>Actions</th>
                </>
              )}
              {selectedTable === "banned_devices" && (
                <>
                  <th>ID</th>
                  <th>Device Hash</th>
                  <th>Reason</th>
                  <th>Banned At</th>
                  <th>Actions</th>
                </>
              )}
              {selectedTable === "support_requests" && (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr onClick={() => toggleRow(row.id)} className={styles.tableRow}>
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
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFeatured("novels", row.id, row.featured); }}
                            className={`btn btn-sm ${row.featured ? "btn-warning" : "btn-outline-warning"}`}
                          >
                            <FaStar /> {row.featured ? "Featured" : "Feature"}
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleVisibility("novels", row.id, row.is_visible); }}
                            className={`btn btn-sm ${row.is_visible ? "btn-success" : "btn-outline-secondary"}`}
                          >
                            {row.is_visible ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        </td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "novels", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                    {selectedTable === "manga" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.status}</td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFeatured("manga", row.id, row.featured); }}
                            className={`btn btn-sm ${row.featured ? "btn-warning" : "btn-outline-warning"}`}
                          >
                            <FaStar /> {row.featured ? "Featured" : "Feature"}
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleVisibility("manga", row.id, row.is_visible); }}
                            className={`btn btn-sm ${row.is_visible ? "btn-success" : "btn-outline-secondary"}`}
                          >
                            {row.is_visible ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        </td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "manga", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                    {selectedTable === "creator_applications" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.users?.name || "Unknown"}</td>
                        <td>{row.role}</td>
                        <td>{row.application_status}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "creator_applications", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
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
                    {selectedTable === "announcements" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.title}</td>
                        <td>{row.message?.slice(0, 50)}...</td>
                        <td>{new Date(row.release_date).toLocaleString()}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "announcements", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                    {selectedTable === "banned_devices" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.device_hash?.slice(0, 20)}...</td>
                        <td>{row.reason}</td>
                        <td>{new Date(row.banned_at).toLocaleString()}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "banned_devices", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                    {selectedTable === "support_requests" && (
                      <>
                        <td>{row.id}</td>
                        <td>{row.name}</td>
                        <td>{row.email}</td>
                        <td>{row.subject}</td>
                        <td>
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="btn btn-sm btn-primary me-1">
                            <FaEdit />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: "support_requests", id: row.id }); }} className="btn btn-sm btn-danger">
                            <FaTrash />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                  {expandedRow === row.id && (
                    <tr className={styles.expandedRow}>
                      <td colSpan={getColSpan(selectedTable)}>
                        <div className={styles.expandedContent}>
                          {selectedTable === "users" && (
                            <>
                              <p><strong>Wallet Address:</strong> {row.wallet_address}</p>
                              <p><strong>Email:</strong> {row.email || "N/A"}</p>
                              <p><strong>Balance:</strong> {row.balance || 0}</p>
                              <p><strong>Weekly Points:</strong> {row.weekly_points || 0}</p>
                              <p><strong>Total Points Read:</strong> {row.total_points_read || 0}</p>
                              <p><strong>Amethyst Count:</strong> {row.amethyst_count || 0}</p>
                              <div className="mt-3">
                                <button onClick={() => handleEdit(row)} className="btn btn-sm btn-primary me-2">
                                  <FaEdit /> Edit User
                                </button>
                                <button onClick={() => setDeleteConfirm({ table: "users", id: row.id })} className="btn btn-sm btn-danger">
                                  <FaTrash /> Delete User
                                </button>
                              </div>
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
                          {selectedTable === "announcements" && (
                            <>
                              <p><strong>Full Message:</strong> {row.message}</p>
                              <p><strong>Audience:</strong> {row.audience}</p>
                              <p><strong>User ID:</strong> {row.user_id}</p>
                              <p><strong>Is Superuser Announcement:</strong> {row.is_superuser_announcement ? "Yes" : "No"}</p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "banned_devices" && (
                            <>
                              <p><strong>Full Device Hash:</strong> {row.device_hash}</p>
                              <p><strong>Reason:</strong> {row.reason}</p>
                              <p><strong>Banned At:</strong> {new Date(row.banned_at).toLocaleString()}</p>
                            </>
                          )}
                          {selectedTable === "support_requests" && (
                            <>
                              <p><strong>Full Message:</strong> {row.message}</p>
                              <p><strong>Email:</strong> {row.email}</p>
                              <p><strong>Created At:</strong> {new Date(row.created_at).toLocaleString()}</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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

        {/* Edit Modal */}
        {editModal && (
          <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content" style={{ background: '#2c2c2c', color: '#e0e0e0' }}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit {editModal.slice(0, -1)}</h5>
                  <button type="button" className="btn-close" onClick={() => setEditModal(null)}></button>
                </div>
                <div className="modal-body">
                  {Object.keys(editData).filter(key => key !== 'id' && key !== 'users' && key !== 'novels').map(key => (
                    <div key={key} className="mb-3">
                      <label className="form-label text-capitalize">{key.replace(/_/g, ' ')}</label>
                      {typeof editData[key] === 'boolean' ? (
                        <select
                          className="form-control"
                          style={{ background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #ff9900' }}
                          value={editData[key]}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value === 'true' })}
                        >
                          <option value="true">True</option>
                          <option value="false">False</option>
                        </select>
                      ) : key.includes('date') || key.includes('_at') ? (
                        <input
                          type="datetime-local"
                          className="form-control"
                          style={{ background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #ff9900' }}
                          value={editData[key] ? new Date(editData[key]).toISOString().slice(0, 16) : ''}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                        />
                      ) : Array.isArray(editData[key]) ? (
                        <input
                          type="text"
                          className="form-control"
                          style={{ background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #ff9900' }}
                          value={JSON.stringify(editData[key])}
                          onChange={(e) => setEditData({ ...editData, [key]: JSON.parse(e.target.value) })}
                        />
                      ) : typeof editData[key] === 'object' ? (
                        <textarea
                          className="form-control"
                          style={{ background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #ff9900', minHeight: '100px' }}
                          value={JSON.stringify(editData[key], null, 2)}
                          onChange={(e) => setEditData({ ...editData, [key]: JSON.parse(e.target.value) })}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          style={{ background: '#3d3d3d', color: '#e0e0e0', border: '1px solid #ff9900' }}
                          value={editData[key] || ''}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content" style={{ background: '#2c2c2c', color: '#e0e0e0' }}>
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)}></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this {deleteConfirm.table.slice(0, -1)}? This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.table, deleteConfirm.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}

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