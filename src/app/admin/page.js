"use client";

import React, { useState, useEffect, useContext, useRef } from "react";
import { supabase } from "../../services/supabase/supabaseClient";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaUser, FaBook, FaImage, FaComment, FaClock, FaGift, FaBullhorn, FaBan,
  FaLifeRing, FaPenNib, FaStar, FaEdit, FaTrash, FaEye, FaEyeSlash, FaSearch,
  FaBars, FaTimes, FaChevronLeft, FaChevronRight, FaInbox,
} from "react-icons/fa";
import { EmbeddedWalletContext } from "../../components/EmbeddedWalletProvider";
import styles from "../../styles/AdminPage.module.css";

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const fmtDate = (v) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
const clip = (s, n = 80) => (!s ? "—" : s.length > n ? s.slice(0, n).trimEnd() + "…" : s);
const shortId = (id) => (String(id).length > 8 ? String(id).slice(0, 8) : String(id));

const toLocalInput = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return "";
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const statusTone = (s) => {
  const v = String(s || "").toLowerCase();
  if (["approved", "published", "released", "done", "completed"].includes(v)) return "ok";
  if (["rejected", "failed", "banned"].includes(v)) return "danger";
  return "amber";
};

/* ------------------------------------------------------------------ */
/* Table configuration — one place describes every table              */
/* title/subtitle/chips → mobile cards · columns → desktop table      */
/* details → the detail sheet                                          */
/* ------------------------------------------------------------------ */
const TABLES = {
  users: {
    label: "Users", noun: "user", icon: FaUser, search: "name", select: "*", joins: [],
    title: (r) => r.name || "Unnamed user",
    subtitle: (r) => r.email || "No email",
    chips: (r) => [
      r.isSuperuser && { t: "Superuser", tone: "amber" },
      r.isWriter && { t: "Writer", tone: "blue" },
      r.isArtist && { t: "Artist", tone: "violet" },
    ],
    columns: [
      ["Name", (r) => r.name || "—"],
      ["Email", (r) => r.email || "—"],
      ["Roles", (r, c) => <Chips items={c.chips(r)} empty="Member" />],
    ],
    details: [
      ["Wallet", (r) => r.wallet_address, { mono: true }],
      ["Email", (r) => r.email],
      ["Balance", (r) => r.balance ?? 0],
      ["Weekly points", (r) => r.weekly_points ?? 0],
      ["Total points read", (r) => r.total_points_read ?? 0],
      ["Amethyst", (r) => r.amethyst_count ?? 0],
    ],
  },
  novels: {
    label: "Novels", noun: "novel", icon: FaBook, search: "title",
    select: "*, users!novels_user_id_fkey(name)", joins: ["users"],
    toggles: { featured: "featured", visible: "is_visible" },
    title: (r) => r.title,
    subtitle: (r) => `by ${r.users?.name || "Unknown"}`,
    chips: (r) => [r.featured && { t: "Featured", tone: "amber" }, !r.is_visible && { t: "Hidden", tone: "muted" }],
    columns: [
      ["Title", (r) => r.title],
      ["Author", (r) => r.users?.name || "Unknown"],
      ["Summary", (r) => clip(r.summary, 60)],
    ],
    details: [
      ["Summary", (r) => r.summary, { long: true }],
      ["Author", (r) => r.users?.name],
      ["User ID", (r) => r.user_id, { mono: true }],
      ["Cover", (r) => r.image, { link: true }],
    ],
  },
  manga: {
    label: "Manga", noun: "manga", icon: FaImage, search: "title",
    select: "*, users!manga_user_id_fkey(name)", joins: ["users"],
    toggles: { featured: "featured", visible: "is_visible" },
    title: (r) => r.title,
    subtitle: (r) => `by ${r.users?.name || "Unknown"}`,
    chips: (r) => [
      r.status && { t: r.status, tone: statusTone(r.status) },
      r.featured && { t: "Featured", tone: "amber" },
      !r.is_visible && { t: "Hidden", tone: "muted" },
    ],
    columns: [
      ["Title", (r) => r.title],
      ["Author", (r) => r.users?.name || "Unknown"],
      ["Status", (r) => r.status || "—"],
    ],
    details: [
      ["Summary", (r) => r.summary, { long: true }],
      ["Cover", (r) => r.cover_image, { link: true }],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  creator_applications: {
    label: "Applications", noun: "application", icon: FaPenNib, search: "name",
    select: "*, users!creator_applications_user_id_fkey(name)", joins: ["users"],
    title: (r) => r.users?.name || r.name || "Unknown applicant",
    subtitle: (r) => r.role || "No role",
    chips: (r) => [r.application_status && { t: r.application_status, tone: statusTone(r.application_status) }],
    columns: [
      ["Applicant", (r) => r.users?.name || r.name || "Unknown"],
      ["Role", (r) => r.role || "—"],
      ["Status", (r, c) => <Chips items={c.chips(r)} />],
    ],
    details: [
      ["Email", (r) => r.email],
      ["Reason", (r) => r.reason, { long: true }],
      ["Submission", (r) => r.submission_link, { link: true }],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  comments: {
    label: "Comments", noun: "comment", icon: FaComment, search: "content",
    select: "*, users!comments_user_id_fkey(name), novels!comments_novel_id_fkey(title)",
    joins: ["users", "novels"],
    title: (r) => clip(r.content, 90),
    subtitle: (r) => `${r.users?.name || "Unknown"} on ${r.novels?.title || "Unknown"}`,
    chips: () => [],
    columns: [
      ["User", (r) => r.users?.name || "Unknown"],
      ["Novel", (r) => r.novels?.title || "Unknown"],
      ["Comment", (r) => clip(r.content, 70)],
    ],
    details: [
      ["Comment", (r) => r.content, { long: true }],
      ["Chapter ID", (r) => r.chapter_id, { mono: true }],
      ["Parent ID", (r) => r.parent_id || "None", { mono: true }],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  chapter_queue: {
    label: "Chapter queue", noun: "queued chapter", icon: FaClock, search: "status",
    select: "*, novels!chapter_queue_novel_id_fkey(title)", joins: ["novels"],
    title: (r) => `${r.novels?.title || "Unknown"} · Ch. ${r.chapter_number}`,
    subtitle: (r) => `Releases ${fmtDate(r.release_date)}`,
    chips: (r) => [
      r.status && { t: r.status, tone: statusTone(r.status) },
      r.is_advance && { t: "Advance", tone: "blue" },
    ],
    columns: [
      ["Novel", (r) => r.novels?.title || "Unknown"],
      ["Chapter", (r) => r.chapter_number],
      ["Status", (r, c) => <Chips items={[c.chips(r)[0]]} />],
      ["Releases", (r) => fmtDate(r.release_date)],
    ],
    details: [
      ["Novel ID", (r) => r.novel_id, { mono: true }],
      ["Advance chapter", (r) => (r.is_advance ? "Yes" : "No")],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  gifs: {
    label: "GIFs", noun: "GIF", icon: FaGift, search: "title", select: "*", joins: [],
    title: (r) => r.title,
    subtitle: (r) => clip(r.url, 48),
    chips: (r) => (r.tags || []).slice(0, 3).map((t) => ({ t, tone: "muted" })),
    columns: [
      ["Title", (r) => r.title],
      ["URL", (r) => <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className={styles.link}>{clip(r.url, 40)}</a>],
    ],
    details: [
      ["URL", (r) => r.url, { link: true }],
      ["Tags", (r) => (r.tags || []).join(", ")],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  announcements: {
    label: "Announcements", noun: "announcement", icon: FaBullhorn, search: "title", select: "*", joins: [],
    title: (r) => r.title,
    subtitle: (r) => clip(r.message, 90),
    chips: (r) => [r.audience && { t: r.audience, tone: "blue" }, r.is_superuser_announcement && { t: "Admins only", tone: "amber" }],
    columns: [
      ["Title", (r) => r.title],
      ["Message", (r) => clip(r.message, 60)],
      ["Releases", (r) => fmtDate(r.release_date)],
    ],
    details: [
      ["Message", (r) => r.message, { long: true }],
      ["Audience", (r) => r.audience],
      ["Release", (r) => fmtDate(r.release_date)],
      ["User ID", (r) => r.user_id, { mono: true }],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
  banned_devices: {
    label: "Banned devices", noun: "banned device", icon: FaBan, search: "reason", select: "*", joins: [],
    title: (r) => clip(r.device_hash, 18),
    subtitle: (r) => r.reason || "No reason given",
    chips: () => [],
    columns: [
      ["Device", (r) => <span className={styles.mono}>{clip(r.device_hash, 20)}</span>],
      ["Reason", (r) => r.reason || "—"],
      ["Banned", (r) => fmtDate(r.banned_at)],
    ],
    details: [
      ["Device hash", (r) => r.device_hash, { mono: true }],
      ["Reason", (r) => r.reason, { long: true }],
      ["Banned", (r) => fmtDate(r.banned_at)],
    ],
  },
  support_requests: {
    label: "Support", noun: "support request", icon: FaLifeRing, search: "subject", select: "*", joins: [],
    title: (r) => r.subject || "No subject",
    subtitle: (r) => `${r.name || "Unknown"} · ${r.email || "no email"}`,
    chips: () => [],
    columns: [
      ["Subject", (r) => r.subject || "—"],
      ["Name", (r) => r.name || "—"],
      ["Email", (r) => r.email || "—"],
    ],
    details: [
      ["Message", (r) => r.message, { long: true }],
      ["Name", (r) => r.name],
      ["Email", (r) => r.email],
      ["Created", (r) => fmtDate(r.created_at)],
    ],
  },
};
const TABLE_KEYS = Object.keys(TABLES);
const READ_ONLY = ["id", "created_at", "updated_at"];

/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */
function Chips({ items = [], empty }) {
  const list = items.filter(Boolean);
  if (!list.length) return empty ? <span className={styles.muted}>{empty}</span> : <span className={styles.muted}>—</span>;
  return (
    <span className={styles.chips}>
      {list.map((c) => (
        <span key={c.t} className={`${styles.chip} ${styles[`tone_${c.tone}`]}`}>{c.t}</span>
      ))}
    </span>
  );
}

function Toggles({ row, cfg, onToggle }) {
  if (!cfg.toggles) return null;
  const { featured, visible } = cfg.toggles;
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <span className={styles.toggles}>
      <button
        type="button"
        className={`${styles.toggle} ${row[featured] ? styles.toggleOnAmber : ""}`}
        aria-pressed={!!row[featured]}
        onClick={stop(() => onToggle(row, featured))}
      >
        <FaStar aria-hidden /> {row[featured] ? "Featured" : "Feature"}
      </button>
      <button
        type="button"
        className={`${styles.toggle} ${row[visible] ? styles.toggleOnGreen : ""}`}
        aria-pressed={!!row[visible]}
        onClick={stop(() => onToggle(row, visible))}
      >
        {row[visible] ? <FaEye aria-hidden /> : <FaEyeSlash aria-hidden />} {row[visible] ? "Visible" : "Hidden"}
      </button>
    </span>
  );
}

function Sheet({ title, subtitle, onClose, footer, children, variant = "sheet" }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section
        className={variant === "dialog" ? styles.dialog : styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {variant === "sheet" && <div className={styles.grabber} aria-hidden />}
        <header className={styles.sheetHead}>
          <div className={styles.sheetTitles}>
            <h2 className={styles.sheetTitle}>{title}</h2>
            {subtitle && <p className={styles.sheetSub}>{subtitle}</p>}
          </div>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <footer className={styles.sheetFoot}>{footer}</footer>}
      </section>
    </div>
  );
}

function kindOf(key, v) {
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return "number";
  if (Array.isArray(v) || (v && typeof v === "object")) return "json";
  if (/(_at|_date)$/.test(key) || key === "release_date") return "date";
  if (typeof v === "string" && (v.length > 80 || /message|summary|content|reason|description/.test(key))) return "long";
  return "text";
}

function EditForm({ row, cfg, saving, onSave, onCancel }) {
  const keys = Object.keys(row).filter((k) => !READ_ONLY.includes(k) && !cfg.joins.includes(k));
  const initial = useRef(null);
  if (!initial.current) {
    initial.current = Object.fromEntries(
      keys.map((k) => {
        const v = row[k];
        const kind = kindOf(k, v);
        if (kind === "bool") return [k, !!v];
        if (kind === "json") return [k, JSON.stringify(v, null, 2)];
        if (kind === "date") return [k, toLocalInput(v)];
        return [k, v ?? ""];
      })
    );
  }
  const [values, setValues] = useState(initial.current);
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const changes = {};
    for (const k of keys) {
      if (values[k] === initial.current[k]) continue;
      const kind = kindOf(k, row[k]);
      try {
        if (kind === "json") changes[k] = JSON.parse(values[k]);
        else if (kind === "number") changes[k] = values[k] === "" ? null : Number(values[k]);
        else if (kind === "date") changes[k] = values[k] ? new Date(values[k]).toISOString() : null;
        else if (kind === "bool") changes[k] = values[k];
        else changes[k] = values[k] === "" && row[k] === null ? null : values[k];
      } catch {
        toast.error(`“${k.replace(/_/g, " ")}” isn’t valid JSON`);
        return;
      }
    }
    onSave(changes);
  };

  return (
    <form id="admin-edit-form" className={styles.form} onSubmit={submit}>
      {keys.map((k) => {
        const kind = kindOf(k, row[k]);
        const label = k.replace(/_/g, " ");
        return (
          <div key={k} className={styles.field}>
            <label className={styles.label} htmlFor={`f-${k}`}>{label}</label>
            {kind === "bool" ? (
              <button
                id={`f-${k}`}
                type="button"
                role="switch"
                aria-checked={values[k]}
                className={`${styles.switch} ${values[k] ? styles.switchOn : ""}`}
                onClick={() => set(k, !values[k])}
              >
                <span className={styles.knob} />
                <span className={styles.switchText}>{values[k] ? "On" : "Off"}</span>
              </button>
            ) : kind === "long" || kind === "json" ? (
              <textarea
                id={`f-${k}`}
                className={`${styles.input} ${kind === "json" ? styles.mono : ""}`}
                rows={kind === "json" ? 5 : 4}
                value={values[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            ) : (
              <input
                id={`f-${k}`}
                className={styles.input}
                type={kind === "date" ? "datetime-local" : kind === "number" ? "number" : "text"}
                inputMode={kind === "number" ? "decimal" : undefined}
                value={values[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            )}
          </div>
        );
      })}
      <div className={styles.formActions}>
        <button type="button" className={styles.btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Pager({ page, totalPages, total, onPage }) {
  if (total === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <nav className={styles.pager} aria-label="Pagination">
      <span className={styles.pagerRange}>{from}–{to} of {total}</span>
      <div className={styles.pagerBtns}>
        <button type="button" className={styles.pageBtn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
          <FaChevronLeft />
        </button>
        <span className={styles.pageNow}>{page} / {totalPages}</span>
        <button type="button" className={styles.pageBtn} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
          <FaChevronRight />
        </button>
      </div>
    </nav>
  );
}

function NavList({ current, onPick }) {
  return (
    <nav className={styles.navList} aria-label="Tables">
      {TABLE_KEYS.map((k) => {
        const Icon = TABLES[k].icon;
        return (
          <button
            key={k}
            type="button"
            className={`${styles.navItem} ${current === k ? styles.navItemActive : ""}`}
            aria-current={current === k ? "page" : undefined}
            onClick={() => onPick(k)}
          >
            <Icon aria-hidden /> <span>{TABLES[k].label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Gate({ title, children }) {
  return (
    <div className={`${styles.root} ${styles.gate}`}>
      <div className={styles.gateCard}>
        <h1 className={styles.gateTitle}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function AdminPage() {
  const { connected, publicKey } = useWallet();
  const { wallet } = useContext(EmbeddedWalletContext);

  const [authLoading, setAuthLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [table, setTable] = useState("users");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [navOpen, setNavOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("view");
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  const reqId = useRef(0);
  const cfg = TABLES[table];
  const TableIcon = cfg.icon;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* Auth: works with external and embedded wallets */
  useEffect(() => {
    const key = wallet?.publicKey || publicKey;
    if (!key) {
      setIsSuperuser(false);
      setAuthLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setAuthLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("isSuperuser")
        .eq("wallet_address", key.toString())
        .single();
      if (cancelled) return;
      if (error || !data?.isSuperuser) {
        setAuthError("This wallet doesn’t have admin access.");
        setIsSuperuser(false);
      } else {
        setIsSuperuser(true);
      }
      setAuthLoading(false);
    })();
    return () => { cancelled = true; };
  }, [connected, publicKey, wallet]);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced((prev) => {
        if (prev !== query) setPage(1);
        return query;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  /* Fetch rows (single select string keeps the exact count) */
  useEffect(() => {
    if (!isSuperuser) return;
    const id = ++reqId.current;
    setLoading(true);
    (async () => {
      let q = supabase
        .from(table)
        .select(cfg.select, { count: "exact" })
        .order("id", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (debounced && cfg.search) q = q.ilike(cfg.search, `%${debounced}%`);
      const { data, error, count } = await q;
      if (id !== reqId.current) return;
      if (error) {
        toast.error(`Couldn’t load ${cfg.label.toLowerCase()}: ${error.message}`);
        setRows([]);
        setTotal(0);
      } else if (!data?.length && page > 1) {
        setPage((p) => p - 1); // deleted the last row of the last page
        return;
      } else {
        setRows(data || []);
        setTotal(count || 0);
      }
      setLoading(false);
    })();
  }, [isSuperuser, table, page, debounced, refresh, cfg]);

  const pickTable = (k) => {
    setTable(k);
    setQuery("");
    setDebounced("");
    setPage(1);
    setRows([]);
    setSelected(null);
    setMode("view");
    setNavOpen(false);
  };

  const patchRow = (id, patch) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const toggle = async (row, col) => {
    const next = !row[col];
    patchRow(row.id, { [col]: next });
    const { error } = await supabase.from(table).update({ [col]: next }).eq("id", row.id);
    if (error) {
      patchRow(row.id, { [col]: !next });
      toast.error(`Couldn’t update: ${error.message}`);
    } else {
      toast.success(col === "featured" ? (next ? "Featured" : "Unfeatured") : next ? "Now visible" : "Now hidden");
    }
  };

  const save = async (changes) => {
    if (!Object.keys(changes).length) return setMode("view");
    setSaving(true);
    const { error } = await supabase.from(table).update(changes).eq("id", selected.id);
    setSaving(false);
    if (error) return toast.error(`Couldn’t save: ${error.message}`);
    patchRow(selected.id, changes);
    setMode("view");
    toast.success("Saved");
  };

  const remove = async () => {
    const { error } = await supabase.from(table).delete().eq("id", confirm.id);
    if (error) return toast.error(`Couldn’t delete: ${error.message}`);
    toast.success("Deleted");
    setConfirm(null);
    setSelected(null);
    setRefresh((n) => n + 1);
  };

  const openRow = (r) => { setSelected(r); setMode("view"); };

  /* ---------------- Gates ---------------- */
  if (authLoading) {
    return (
      <div className={`${styles.root} ${styles.gate}`}>
        <div className={styles.spinner} role="status" aria-label="Checking access" />
      </div>
    );
  }
  if (!(connected || wallet?.publicKey)) {
    return (
      <Gate title="Connect your wallet">
        <p className={styles.gateText}>Connect an admin wallet to open the dashboard.</p>
        <WalletMultiButton className={styles.btnPrimary} />
      </Gate>
    );
  }
  if (!isSuperuser) {
    return (
      <Gate title="No access">
        <p className={styles.gateText}>{authError || "This wallet doesn’t have admin access."}</p>
        <WalletMultiButton className={styles.btnPrimary} />
      </Gate>
    );
  }

  /* ---------------- Dashboard ---------------- */
  const hasToggles = !!cfg.toggles;

  return (
    <div className={styles.root}>
      {/* Desktop sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Admin</div>
        <NavList current={table} onPick={pickTable} />
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <div className={styles.drawerWrap} onMouseDown={(e) => e.target === e.currentTarget && setNavOpen(false)}>
          <aside className={styles.drawer} aria-label="Navigation">
            <div className={styles.drawerHead}>
              <span className={styles.brand}>Admin</span>
              <button type="button" className={styles.iconBtn} onClick={() => setNavOpen(false)} aria-label="Close menu">
                <FaTimes />
              </button>
            </div>
            <NavList current={table} onPick={pickTable} />
          </aside>
        </div>
      )}

      <div className={styles.main}>
        {/* Top bar */}
        <header className={styles.topbar}>
          <button type="button" className={`${styles.iconBtn} ${styles.menuBtn}`} onClick={() => setNavOpen(true)} aria-label="Open menu">
            <FaBars />
          </button>
          <div className={styles.heading}>
            <TableIcon className={styles.headingIcon} aria-hidden />
            <h1 className={styles.title}>{cfg.label}</h1>
            <span className={styles.count}>{total}</span>
          </div>
          <label className={styles.search}>
            <FaSearch aria-hidden className={styles.searchIcon} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${cfg.label.toLowerCase()}`}
              aria-label={`Search ${cfg.label}`}
            />
          </label>
        </header>

        <main className={`${styles.content} ${loading && rows.length ? styles.dim : ""}`} aria-busy={loading}>
          {/* Mobile + tablet: cards */}
          <ul className={styles.cards}>
            {rows.map((r) => (
              <li key={r.id}>
                <article
                  className={styles.card}
                  tabIndex={0}
                  onClick={() => openRow(r)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openRow(r))}
                >
                  <div className={styles.cardTop}>
                    <h2 className={styles.cardTitle}>{cfg.title(r)}</h2>
                    <span className={styles.cardId}>#{shortId(r.id)}</span>
                  </div>
                  <p className={styles.cardSub}>{cfg.subtitle(r)}</p>
                  <div className={styles.cardMeta}>
                    <Chips items={cfg.chips(r)} empty="" />
                  </div>
                  {hasToggles && <Toggles row={r} cfg={cfg} onToggle={toggle} />}
                </article>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thId}>ID</th>
                  {cfg.columns.map(([label]) => <th key={label}>{label}</th>)}
                  {hasToggles && <th>Status</th>}
                  <th className={styles.thActions}><span className={styles.srOnly}>Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={styles.tr}
                    tabIndex={0}
                    onClick={() => openRow(r)}
                    onKeyDown={(e) => e.key === "Enter" && openRow(r)}
                  >
                    <td className={`${styles.mono} ${styles.muted}`}>{shortId(r.id)}</td>
                    {cfg.columns.map(([label, render], i) => (
                      <td key={label} className={i === 0 ? styles.tdStrong : undefined}>{render(r, cfg)}</td>
                    ))}
                    {hasToggles && <td><Toggles row={r} cfg={cfg} onToggle={toggle} /></td>}
                    <td className={styles.tdActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Edit ${cfg.noun}`}
                        onClick={(e) => { e.stopPropagation(); setSelected(r); setMode("edit"); }}
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconDanger}`}
                        aria-label={`Delete ${cfg.noun}`}
                        onClick={(e) => { e.stopPropagation(); setConfirm(r); }}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading skeleton */}
          {loading && !rows.length && (
            <div className={styles.skeletons} aria-hidden>
              {Array.from({ length: 5 }, (_, i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}

          {/* Empty */}
          {!loading && !rows.length && (
            <div className={styles.empty}>
              <FaInbox className={styles.emptyIcon} aria-hidden />
              <p className={styles.emptyTitle}>
                {debounced ? `Nothing matches “${debounced}”` : `No ${cfg.label.toLowerCase()} yet`}
              </p>
              {debounced && (
                <button type="button" className={styles.btnGhost} onClick={() => setQuery("")}>
                  Clear search
                </button>
              )}
            </div>
          )}

          <Pager page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </main>
      </div>

      {/* Detail / edit sheet */}
      {selected && (
        <Sheet
          title={mode === "edit" ? `Edit ${cfg.noun}` : cfg.title(selected)}
          subtitle={mode === "edit" ? cfg.title(selected) : cfg.subtitle(selected)}
          onClose={() => { setSelected(null); setMode("view"); }}
          footer={
            mode === "view" && (
              <>
                <button type="button" className={styles.btnDanger} onClick={() => setConfirm(selected)}>
                  <FaTrash aria-hidden /> Delete
                </button>
                <button type="button" className={styles.btnPrimary} onClick={() => setMode("edit")}>
                  <FaEdit aria-hidden /> Edit
                </button>
              </>
            )
          }
        >
          {mode === "edit" ? (
            <EditForm key={selected.id} row={selected} cfg={cfg} saving={saving} onSave={save} onCancel={() => setMode("view")} />
          ) : (
            <>
              <div className={styles.sheetChips}>
                <Chips items={cfg.chips(selected)} empty="" />
              </div>
              {hasToggles && <Toggles row={selected} cfg={cfg} onToggle={toggle} />}
              <dl className={styles.details}>
                {cfg.details.map(([label, get, opts = {}]) => {
                  const v = get(selected);
                  const empty = v === null || v === undefined || v === "";
                  return (
                    <div key={label} className={styles.detailRow}>
                      <dt>{label}</dt>
                      <dd className={`${opts.mono ? styles.mono : ""} ${opts.long ? styles.long : ""}`}>
                        {empty ? <span className={styles.muted}>—</span> : opts.link ? (
                          <a href={v} target="_blank" rel="noopener noreferrer" className={styles.link}>{v}</a>
                        ) : v}
                      </dd>
                    </div>
                  );
                })}
                <div className={styles.detailRow}>
                  <dt>ID</dt>
                  <dd className={styles.mono}>{selected.id}</dd>
                </div>
              </dl>
            </>
          )}
        </Sheet>
      )}

      {/* Delete confirmation */}
      {confirm && (
        <Sheet
          variant="dialog"
          title={`Delete this ${cfg.noun}?`}
          subtitle={cfg.title(confirm)}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className={styles.btnGhost} onClick={() => setConfirm(null)}>Keep it</button>
              <button type="button" className={styles.btnDangerSolid} onClick={remove}>Delete {cfg.noun}</button>
            </>
          }
        >
          <p className={styles.confirmText}>This can’t be undone.</p>
        </Sheet>
      )}

      <ToastContainer position="bottom-center" autoClose={2500} theme="dark" hideProgressBar />
    </div>
  );
}