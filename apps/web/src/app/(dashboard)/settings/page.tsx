"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";
import { useCollectionStore } from "@/stores/collectionStore";
import { apiClient, ApiError } from "@/lib/api";
import { generateExport, downloadFile } from "@/lib/exportGenerators";
import type {
  BookmarkImportResult,
  ApiResponse as ApiResponseType,
  ExportableLink,
  ExportFormat,
} from "@linkvault/shared";

// ============================================================
// Settings Page — Profile, Security, and Account management
// Editorial design system: warm dark palette, Syne + DM Sans
// ============================================================

const validatePassword = (pw: string): string | null => {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain a number.";
  return null;
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, signOut } = useAuth();

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <p className="editorial-label text-paper-faint mb-1">Account</p>
        <h1 className="font-display text-display-sm font-bold text-paper">
          Settings
        </h1>
        <div className="h-px bg-ink-300 mt-6" />
      </div>

      <div className="max-w-xl space-y-8">
        <ProfileSection
          user={user}
          onSave={updateProfile}
        />

        <SecuritySection onUpdatePassword={updatePassword} />

        <ImportBookmarksSection />

        <ExportBookmarksSection />

        <DangerZoneSection onSignOut={signOut} />
      </div>
    </div>
  );
}

// ============================================================
// Profile Section
// ============================================================

function ProfileSection({
  user,
  onSave,
}: {
  user: ReturnType<typeof useAuth>["user"];
  onSave: (updates: { display_name?: string | null }) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Sync display name from user profile
  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user?.display_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("Display name cannot be empty.");
      return;
    }

    try {
      setIsLoading(true);
      await onSave({ display_name: trimmed });
      setSuccess(true);
      // Clear success after a few seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const initials = user?.display_name
    ? user.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  const hasChanges =
    displayName.trim() !== (user?.display_name || "");

  return (
    <section>
      <p className="editorial-label text-paper-faint mb-3">Profile</p>
      <div
        className="border border-ink-300 bg-ink-50 p-6"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        {/* Avatar + Email */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 bg-ink-200 border border-ink-300 flex items-center justify-center flex-shrink-0"
            style={{ borderRadius: "var(--radius-md)" }}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                style={{ borderRadius: "var(--radius-md)" }}
              />
            ) : (
              <span className="text-sm font-display font-semibold text-paper-dim">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-paper font-medium text-sm truncate">
              {user?.display_name || "No display name"}
            </p>
            <p className="mono-domain text-paper-muted truncate">
              {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="px-3.5 py-2.5 border border-success/30 bg-success-subtle text-success text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              Profile updated successfully.
            </div>
          )}

          <div>
            <label className="block text-caption text-paper-dim mb-1.5 font-medium">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              placeholder="Your name"
              maxLength={50}
              className="input-editorial"
            />
          </div>

          {/* Member since */}
          {user?.created_at && (
            <p className="text-micro text-paper-faint uppercase tracking-editorial">
              Member since {formatDate(user.created_at)}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="btn-primary"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              "Save changes"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

// ============================================================
// Security Section (Change Password)
// ============================================================

function SecuritySection({
  onUpdatePassword,
}: {
  onUpdatePassword: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      await onUpdatePassword(password);
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const msg = err.message || "Failed to update password.";
      if (msg.toLowerCase().includes("same password")) {
        setError("New password must be different from your current password.");
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = password.length >= 8 && confirmPassword.length >= 8;

  return (
    <section>
      <p className="editorial-label text-paper-faint mb-3">Security</p>
      <div
        className="border border-ink-300 bg-ink-50 p-6"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="mb-4">
          <h3 className="font-display font-semibold text-heading text-paper mb-1">
            Change password
          </h3>
          <p className="text-caption text-paper-muted">
            Update your password to keep your account secure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div
              className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="px-3.5 py-2.5 border border-success/30 bg-success-subtle text-success text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              Password updated successfully.
            </div>
          )}

          <div>
            <label className="block text-caption text-paper-dim mb-1.5 font-medium">
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              placeholder="New password"
              required
              autoComplete="new-password"
              minLength={8}
              className="input-editorial"
            />
          </div>

          <div>
            <label className="block text-caption text-paper-dim mb-1.5 font-medium">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              minLength={8}
              className="input-editorial"
            />
          </div>

          <p className="text-micro text-paper-faint px-0.5 uppercase tracking-editorial">
            Min 8 characters with uppercase, lowercase & number
          </p>

          <button
            type="submit"
            disabled={isLoading || !canSubmit}
            className="btn-primary"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </span>
            ) : (
              "Update password"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

// ============================================================
// Import Bookmarks Section
// ============================================================

type ImportState = "idle" | "reading" | "importing" | "done" | "error";

function ImportBookmarksSection() {
  const { accessToken } = useAuthStore();
  const { collections } = useCollectionStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ImportState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookmarkImportResult | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setState("idle");
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !accessToken) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".html") && !selectedFile.name.endsWith(".htm")) {
      setError("Please select an HTML bookmark file (.html or .htm).");
      return;
    }

    // Validate file size (5 MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5 MB.");
      return;
    }

    setError(null);
    setResult(null);
    setState("reading");

    try {
      // Read file as text
      const html = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsText(selectedFile);
      });

      setState("importing");

      // Send to API
      const response = await apiClient.post<ApiResponseType<BookmarkImportResult>>(
        "/links/import",
        {
          html,
          collection_id: collectionId,
        },
        accessToken
      );

      if (response.success) {
        setResult(response.data);
        setState("done");
        // Clear the file input
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (err) {
      setState("error");
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to import bookmarks. Please try again.");
      }
    }
  }, [selectedFile, accessToken, collectionId]);

  const isProcessing = state === "reading" || state === "importing";

  return (
    <section>
      <p className="editorial-label text-paper-faint mb-3">Data</p>
      <div
        className="border border-ink-300 bg-ink-50 p-6"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="mb-4">
          <h3 className="font-display font-semibold text-heading text-paper mb-1">
            Import bookmarks
          </h3>
          <p className="text-caption text-paper-muted">
            Import bookmarks from your browser. Export your bookmarks as an HTML
            file from Chrome, Firefox, Safari, or Edge, then upload it here.
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div
              className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {error}
            </div>
          )}

          {result && state === "done" && (
            <div
              className="px-3.5 py-2.5 border border-success/30 bg-success-subtle text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <p className="text-success font-medium mb-1">Import complete</p>
              <div className="flex gap-4 text-paper-dim">
                <span>{result.imported} imported</span>
                {result.duplicates > 0 && (
                  <span>{result.duplicates} duplicates skipped</span>
                )}
                {result.errors > 0 && (
                  <span className="text-danger">{result.errors} errors</span>
                )}
              </div>
            </div>
          )}

          {/* File input */}
          <div>
            <label className="block text-caption text-paper-dim mb-1.5 font-medium">
              Bookmark File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileChange}
              disabled={isProcessing}
              className="block w-full text-sm text-paper-dim
                file:mr-3 file:py-2 file:px-4
                file:border file:border-ink-300
                file:text-sm file:font-medium file:font-body
                file:bg-ink-200 file:text-paper-dim
                hover:file:bg-ink-300 file:transition-colors
                file:cursor-pointer cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: "var(--radius-sm)" }}
            />
            <p className="text-micro text-paper-faint mt-1.5 px-0.5 uppercase tracking-editorial">
              HTML file exported from your browser (max 5 MB, up to 500 bookmarks)
            </p>
          </div>

          {/* Collection selector */}
          <div>
            <label className="block text-caption text-paper-dim mb-1.5 font-medium">
              Import into collection (optional)
            </label>
            <select
              value={collectionId || ""}
              onChange={(e) => setCollectionId(e.target.value || null)}
              disabled={isProcessing}
              className="input-editorial"
            >
              <option value="">No collection (All Links)</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Import button */}
          <button
            onClick={handleImport}
            disabled={!selectedFile || isProcessing}
            className="btn-primary"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {state === "reading" ? "Reading file..." : "Importing..."}
              </span>
            ) : (
              "Import bookmarks"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Export Bookmarks Section
// ============================================================

type ExportState = "idle" | "fetching" | "generating" | "done" | "error";

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string }[] = [
  { value: "json", label: "JSON", desc: "Structured data, easy to process programmatically" },
  { value: "csv", label: "CSV", desc: "Spreadsheet-compatible, opens in Excel / Google Sheets" },
  { value: "html", label: "HTML", desc: "Netscape Bookmark format, importable by any browser" },
  { value: "markdown", label: "Markdown", desc: "Readable text format, great for notes and documentation" },
];

function ExportBookmarksSection() {
  const { accessToken } = useAuthStore();

  const [state, setState] = useState<ExportState>("idle");
  const [format, setFormat] = useState<ExportFormat>("html");
  const [error, setError] = useState<string | null>(null);
  const [exportCount, setExportCount] = useState<number | null>(null);

  const handleExport = useCallback(async () => {
    if (!accessToken) return;

    setError(null);
    setExportCount(null);
    setState("fetching");

    try {
      // Fetch all links from the export endpoint
      const response = await apiClient.get<ApiResponseType<ExportableLink[]>>(
        "/links/export",
        accessToken
      );

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch links for export.");
      }

      const links = response.data;

      if (links.length === 0) {
        setError("No links to export. Save some links first!");
        setState("error");
        return;
      }

      setState("generating");

      // Generate file content
      const { content, mimeType, extension } = generateExport(links, format);

      // Build filename with date
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const filename = `linkvault-export-${date}.${extension}`;

      // Download
      downloadFile(content, filename, mimeType);

      setExportCount(links.length);
      setState("done");
    } catch (err) {
      setState("error");
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to export bookmarks. Please try again.");
      }
    }
  }, [accessToken, format]);

  const isProcessing = state === "fetching" || state === "generating";

  return (
    <section>
      <p className="editorial-label text-paper-faint mb-3">Export</p>
      <div
        className="border border-ink-300 bg-ink-50 p-6"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="mb-4">
          <h3 className="font-display font-semibold text-heading text-paper mb-1">
            Export bookmarks
          </h3>
          <p className="text-caption text-paper-muted">
            Download all your saved links as a file. Choose a format that works
            for your use case.
          </p>
        </div>

        <div className="space-y-4">
          {error && (
            <div
              className="px-3.5 py-2.5 border border-danger/20 bg-danger-subtle text-danger text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              {error}
            </div>
          )}

          {state === "done" && exportCount !== null && (
            <div
              className="px-3.5 py-2.5 border border-success/30 bg-success-subtle text-caption"
              style={{ borderRadius: "var(--radius-sm)" }}
            >
              <p className="text-success font-medium">
                Exported {exportCount} links as {format.toUpperCase()}
              </p>
            </div>
          )}

          {/* Format selector */}
          <div>
            <label className="block text-caption text-paper-dim mb-2 font-medium">
              Format
            </label>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                    format === opt.value
                      ? "border-accent bg-accent/5"
                      : "border-ink-300 hover:border-ink-400"
                  }`}
                  style={{ borderRadius: "var(--radius-md)" }}
                >
                  <input
                    type="radio"
                    name="export-format"
                    value={opt.value}
                    checked={format === opt.value}
                    onChange={() => {
                      setFormat(opt.value);
                      setError(null);
                      setState("idle");
                    }}
                    disabled={isProcessing}
                    className="mt-0.5 accent-accent"
                  />
                  <div>
                    <span className="text-sm font-medium text-paper">
                      {opt.label}
                    </span>
                    <p className="text-micro text-paper-muted mt-0.5">
                      {opt.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="btn-primary"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {state === "fetching" ? "Fetching links..." : "Generating file..."}
              </span>
            ) : (
              `Export as ${format.toUpperCase()}`
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Danger Zone Section (Sign Out)
// ============================================================

function DangerZoneSection({
  onSignOut,
}: {
  onSignOut: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await onSignOut();
    } catch {
      // signOut clears state regardless — if the API call fails
      // the user is still effectively signed out locally
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section>
      <p className="editorial-label text-paper-faint mb-3">Danger Zone</p>
      <div
        className="border border-danger/20 bg-ink-50 p-6"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-heading text-paper mb-1">
              Sign out
            </h3>
            <p className="text-caption text-paper-muted">
              Sign out of your account on this device.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="btn-danger flex-shrink-0"
          >
            {isLoading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </section>
  );
}
