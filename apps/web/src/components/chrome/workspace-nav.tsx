"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type DocumentRecord
} from "../../lib/app-shell";

interface WorkspaceNavProps {
  documents: DocumentRecord[];
}

const profileColors = [
  { value: "rose", label: "Rose" },
  { value: "amber", label: "Amber" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" }
] as const;

export function WorkspaceNav({ documents }: WorkspaceNavProps) {
  const pathname = usePathname();
  const recentFiles = documents.slice(0, 8);
  const [fontFamily, setFontFamily] = useState("sans");
  const [fontSize, setFontSize] = useState("32");
  const [profileColor, setProfileColor] = useState("rose");

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty(
      "--editor-font-family",
      fontFamily === "mono"
        ? '"IBM Plex Mono", "SFMono-Regular", ui-monospace, monospace'
        : '"IBM Plex Sans", "Segoe UI", sans-serif'
    );
    root.style.setProperty("--editor-font-size", `${fontSize}px`);
    root.style.setProperty(
      "--profile-accent",
      profileColor === "amber"
        ? "#d5b231"
        : profileColor === "green"
          ? "#4ab36c"
          : profileColor === "blue"
            ? "#4f88d8"
            : "#d85d66"
    );
  }, [fontFamily, fontSize, profileColor]);

  return (
    <nav className="workspace-nav" aria-label="Workspace navigation">
      <div className="workspace-nav-section">
        <div className="workspace-nav-heading">
          <span>Documents</span>
          <small>{documents.length}</small>
        </div>
        <div className="workspace-folder-label">
          <span className="workspace-folder-icon" aria-hidden="true" />
          <span>Shared space</span>
        </div>
        {recentFiles.map((document) => {
          const href = `/documents/${document.id}`;
          const isActive = pathname === href;

          return (
            <Link
              className={`workspace-nav-link${isActive ? " workspace-nav-link-active" : ""}`}
              href={href}
              key={href}
            >
              <span className="workspace-nav-link-icon" aria-hidden="true" />
              <span>{document.title}</span>
              <small>{document.updatedLabel}</small>
            </Link>
          );
        })}
      </div>

      <div className="workspace-settings-panel">
        <div className="workspace-nav-section">
          <div className="workspace-nav-heading">
            <span>Account</span>
          </div>
          <Link
            className={`workspace-nav-link${pathname === "/auth" ? " workspace-nav-link-active" : ""}`}
            href="/auth"
          >
            <span className="workspace-nav-link-icon" aria-hidden="true" />
            <span>Sign in</span>
            <small>Google account access</small>
          </Link>
        </div>

        <div className="workspace-nav-heading">
          <span>Settings</span>
        </div>
        <label className="workspace-setting-field">
          <span>Font</span>
          <select onChange={(event) => setFontFamily(event.target.value)} value={fontFamily}>
            <option value="sans">Sans</option>
            <option value="mono">Mono</option>
          </select>
        </label>
        <label className="workspace-setting-field">
          <span>Profile color</span>
          <div className="workspace-color-picker" role="radiogroup" aria-label="Profile color">
            {profileColors.map((option) => (
              <button
                aria-checked={profileColor === option.value}
                className={`workspace-color-swatch workspace-color-swatch-${option.value}${profileColor === option.value ? " workspace-color-swatch-active" : ""}`}
                key={option.value}
                onClick={() => setProfileColor(option.value)}
                role="radio"
                type="button"
              >
                <span className="workspace-color-swatch-dot" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </label>
        <label className="workspace-setting-field">
          <span>Text size</span>
          <select onChange={(event) => setFontSize(event.target.value)} value={fontSize}>
            <option value="24">24</option>
            <option value="28">28</option>
            <option value="32">32</option>
            <option value="36">36</option>
          </select>
        </label>
      </div>
    </nav>
  );
}
