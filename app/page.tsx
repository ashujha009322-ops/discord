"use client";
import React, { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  Globe2,
  FolderKanban,
  CheckCircle2,
  XCircle,
  ArrowRight,
  MessageSquare,
  Building2,
  Users,
  FileCheck,
  Zap,
  ChevronRight,
  SlidersHorizontal,
  ChevronDown,
  Menu,
  X,
  Share2,
  KeyRound,
  Database,
  Layers,
  Terminal,
  Activity,
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("isolation");
  const [comparisonMode, setComparisonMode] = useState("whatsapp");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll handler for navbar elevation blur
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const features = [
    {
      id: "isolation",
      title: "Workspace Isolation",
      subtitle: "Strict Domain Verification & Zero Personal Exposure",
      description:
        "Keep work identity completely divorced from personal phone numbers or unvetted email aliases. Authenticate via enterprise SSO, SAML 2.0, or custom domain federation.",
      icon: Building2,
      tag: "IDENTITY & SECURITY",
      details: [
        "No phone number disclosure required for external contacts",
        "Automatic domain-level encryption keys and access provisioning",
        "Strict partition between personal lifestyle apps and work assets",
        "Multi-entity hierarchy support for parent & subsidiary networks",
      ],
      previewContent: (
        <div className="space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-zinc-300 font-semibold text-sm">
                acme-corp.vault.net
              </span>
            </div>
            <span className="text-zinc-500 text-[10px] uppercase tracking-wider border border-zinc-800 px-2 py-0.5 rounded">
              Verified Domain
            </span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/80 space-y-2">
            <div className="text-zinc-400 text-[11px]">
              Active Session Identifier
            </div>
            <div className="text-zinc-200 text-sm truncate">
              usr_sso_99a8f2739410@apex-ventures.com
            </div>
            <div className="flex items-center space-x-4 text-[10px] text-zinc-500 pt-1">
              <span>IP: 192.0.2.145 (Encrypted)</span>
              <span>2FA: Hardware Key</span>
            </div>
          </div>
          <div className="p-3 bg-zinc-900/30 rounded border border-zinc-800/50 flex items-center justify-between text-zinc-400">
            <span className="text-zinc-300">Personal Phone Number</span>
            <span className="text-red-400 text-[11px] font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" /> HIDDEN & ISOLATED
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "sovereignty",
      title: "Data Sovereignty",
      subtitle: "Immutable Audit Logging & Automated Offboarding",
      description:
        "Retain 100% legal ownership over company intellectual property. Revoke access instantly upon personnel departures without leaving residual cached files on personal hardware.",
      icon: Lock,
      tag: "GOVERNANCE & COMPLIANCE",
      details: [
        "Zero-trust cloud infrastructure with localized data residency choices",
        "One-click instant cryptographic access revocation across all devices",
        "Granular retention rules with automated compliance auto-archiving",
        "SOC2 Type II, HIPAA, and GDPR enterprise compliance certified",
      ],
      previewContent: (
        <div className="space-y-3 text-xs font-mono">
          <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded flex items-center justify-between text-red-300">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-red-400" />
              <span>Access Revocation Triggered</span>
            </div>
            <span className="text-[10px] bg-red-900/50 px-1.5 py-0.5 rounded">
              EXEC_OFFBOARD
            </span>
          </div>
          <div className="space-y-1.5 text-zinc-400 text-[11px] bg-zinc-950 p-3 rounded border border-zinc-800">
            <div className="flex justify-between border-b border-zinc-800/60 pb-1">
              <span className="text-zinc-500">Target User:</span>
              <span className="text-zinc-200">v.chen@partner-firm.com</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-1">
              <span className="text-zinc-500">Shared Repos:</span>
              <span className="text-zinc-200">14 Enterprise Vaults</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Wipe Status:</span>
              <span className="text-emerald-400">
                Cache Cleared / Encryption Keys Rotated
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "federation",
      title: "Cross-Corporate Federation",
      subtitle: "Structured B2B Channels Without Guest Account Sprawl",
      description:
        "Connect directly with external legal teams, suppliers, and client executive boards in unified rooms governed by mutual cryptographic parameters.",
      icon: Globe2,
      tag: "B2B INTEROPERABILITY",
      details: [
        "Bilateral access policies tailored per corporate partnership",
        "No per-guest seat penalties or chaotic guest account invitations",
        "Verified corporate badges to eliminate spear-phishing attempts",
        "Dedicated inter-company negotiation and deal rooms",
      ],
      previewContent: (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-zinc-900 rounded border border-zinc-800">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 border border-zinc-700">
                A
              </div>
              <div>
                <div className="text-zinc-200 font-medium text-xs">
                  Apex Holdings
                </div>
                <div className="text-zinc-500 text-[10px]">
                  Host Organization
                </div>
              </div>
            </div>
            <div className="text-zinc-500 text-xs font-mono">
              &lt;== Vault Link ==&gt;
            </div>
            <div className="flex items-center space-x-2">
              <div>
                <div className="text-zinc-200 font-medium text-xs text-right">
                  Vanguard Legal
                </div>
                <div className="text-zinc-500 text-[10px] text-right">
                  External Partner
                </div>
              </div>
              <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 border border-zinc-700">
                V
              </div>
            </div>
          </div>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800/80 text-zinc-400 space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-zinc-500">
              <span>Channel: #q4-merger-terms</span>
              <span className="text-emerald-400">Encrypted B2B Node</span>
            </div>
            <p className="text-zinc-300 text-xs pt-1 italic">
              Term sheet v4 signed by executive committee. Audit trail logged.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "hub",
      title: "Structured Asset Hub",
      subtitle: "Contextual Document Repositories Attached to Workstreams",
      description:
        "Ditch the search through endlessly scrolling unstructured chat timelines. Files, spreadsheets, and legal documents remain indexed and persistently stored in context.",
      icon: FolderKanban,
      tag: "CONTEXTUAL KNOWLEDGE",
      details: [
        "Persistent file drawers bound directly to specific project threads",
        "In-line document versioning and audit history tracking",
        "Native preview for CAD files, legal PDFs, and financial models",
        "Strict DLP (Data Loss Prevention) watermarking on export",
      ],
      previewContent: (
        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200 font-mono text-xs">
                Master_Supply_Contract_2026.pdf
              </span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              v3.4 Final
            </span>
          </div>
          <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-zinc-400" />
              <span className="text-zinc-200 font-mono text-xs">
                Q3_Financial_Projections.xlsx
              </span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              Restricted
            </span>
          </div>
          <div className="text-[10px] text-zinc-500 text-right pt-1 font-mono">
            Automated DLP Policy: Export Disabled for non-board members
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100">
      {/* Background Grid Accent */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* Subtle Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-zinc-800/15 via-zinc-900/5 to-transparent blur-3xl pointer-events-none z-0"></div>

      {/* Hero Section */}
      <section className="relative z-10 pt-36 pb-24 md:pt-44 md:pb-32 max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-zinc-100 leading-[1.1]">
            The enterprise network built for{" "}
            <span className="font-semibold text-white">
              high-stakes business.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Move cross-company communication off personal chat apps and chaotic
            guest channels. Reclaim data sovereignty, enforce clean boundaries,
            and centralize corporate assets.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="w-full sm:w-auto px-7 py-3.5 rounded bg-zinc-100 text-zinc-950 font-medium hover:bg-zinc-300 transition-all flex items-center justify-center space-x-2 group shadow-lg shadow-zinc-950">
              <span>Deploy Corporate Node</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto px-7 py-3.5 rounded bg-zinc-900 text-zinc-300 font-medium hover:bg-zinc-800 hover:text-white border border-zinc-800 transition-all flex items-center justify-center space-x-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span>Schedule Architecture Review</span>
            </button>
          </div>

          {/* Trust Badges / Stats */}
          <div className="pt-16 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl md:text-3xl font-light text-zinc-100 font-mono">
                0%
              </div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                Personal Phone Leak
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-light text-zinc-100 font-mono">
                SOC2 Type II
              </div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                Certified Security
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-light text-zinc-100 font-mono">
                256-bit
              </div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                End-to-End Vaulted
              </div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-light text-zinc-100 font-mono">
                100%
              </div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                IP Ownership Retention
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Feature Deep-Dive */}
      <section
        id="features"
        className="py-24 border-t border-zinc-900 bg-zinc-950/40 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Architectural Pillars
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-zinc-100">
              Designed for corporate governance, not casual chatter
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Feature Tabs Nav */}
            <div className="lg:col-span-5 space-y-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                const isActive = activeTab === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id)}
                    className={`w-full text-left p-5 rounded-lg border transition-all duration-200 flex items-start space-x-4 ${
                      isActive
                        ? "bg-zinc-900/90 border-zinc-700 text-zinc-100 shadow-md"
                        : "bg-zinc-950/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div
                      className={`p-2 rounded ${isActive ? "bg-zinc-800 text-zinc-100" : "bg-zinc-900 text-zinc-500"}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-zinc-200">
                          {feature.title}
                        </span>
                        {isActive && (
                          <ChevronRight className="w-4 h-4 text-zinc-400" />
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {feature.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Feature Display Box */}
            <div className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-6">
              {(() => {
                const current =
                  features.find((f) => f.id === activeTab) || features[0];
                return (
                  <>
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded">
                        {current.tag}
                      </span>
                      <h3 className="text-2xl font-light text-zinc-100 pt-2">
                        {current.title}
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {current.description}
                      </p>
                    </div>

                    {/* Interactive UI Mockup Box */}
                    <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 shadow-inner">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80 text-xs font-mono text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-zinc-400" />{" "}
                          Platform Interactive Live State
                        </span>
                        <span>SECURE_NODE // 01</span>
                      </div>
                      {current.previewContent}
                    </div>

                    {/* Feature Details List */}
                    <div className="space-y-2.5 pt-2">
                      {current.details.map((detail, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-3 text-xs text-zinc-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section (vs WhatsApp / Slack) */}
      <section
        id="comparison"
        className="py-24 border-t border-zinc-900 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Why Legacy Tools Fail
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-zinc-100">
              Stop forcing consumer & internal apps into B2B workflows
            </h2>
          </div>

          {/* Comparison Toggle */}
          <div className="flex justify-center mb-10">
            <div className="bg-zinc-950 p-1 rounded-lg border border-zinc-800 inline-flex space-x-1">
              <button
                onClick={() => setComparisonMode("whatsapp")}
                className={`px-5 py-2 rounded text-xs font-medium transition-all ${
                  comparisonMode === "whatsapp"
                    ? "bg-zinc-800 text-zinc-100 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                vs. WhatsApp Groups
              </button>
              <button
                onClick={() => setComparisonMode("slack")}
                className={`px-5 py-2 rounded text-xs font-medium transition-all ${
                  comparisonMode === "slack"
                    ? "bg-zinc-800 text-zinc-100 shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                vs. Slack Guest Channels
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-mono text-zinc-400 uppercase">
                  <th className="p-4 sm:p-6 font-medium">
                    Evaluation Criteria
                  </th>
                  <th className="p-4 sm:p-6 font-medium text-red-400/90">
                    {comparisonMode === "whatsapp"
                      ? "WhatsApp Groups"
                      : "Slack Channels"}
                  </th>
                  <th className="p-4 sm:p-6 font-medium text-emerald-400 bg-zinc-900/80">
                    VaultNet Corporate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs sm:text-sm">
                {comparisonMode === "whatsapp" ? (
                  <>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Identity & Privacy
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Personal
                          Phone Exposed
                        </span>
                        <p className="text-xs text-zinc-500">
                          Forces staff to share personal mobile numbers with
                          outside vendors.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> SSO &
                          Corporate Domain Only
                        </span>
                        <p className="text-xs text-zinc-400">
                          Complete isolation between personal lifestyle and
                          enterprise identity.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Employee Offboarding
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Leaked Chat
                          History
                        </span>
                        <p className="text-xs text-zinc-500">
                          Departing staff keep past client files, chat records,
                          and contacts on personal phone hardware.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" /> Instant
                          Vault Revocation
                        </span>
                        <p className="text-xs text-zinc-400">
                          One-click enterprise offboarding remote-wipes cached
                          data and revokes keys.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Data Storage & Assets
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Local Device
                          Clogging
                        </span>
                        <p className="text-xs text-zinc-500">
                          Media and PDFs save directly to personal phone
                          galleries with no structured indexing.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                          Contextual Cloud Drawers
                        </span>
                        <p className="text-xs text-zinc-400">
                          Files remain securely hosted in enterprise-managed
                          cloud repositories with audit logging.
                        </p>
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Pricing Model
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Exploding
                          Seat Costs
                        </span>
                        <p className="text-xs text-zinc-500">
                          Hefty per-user per-month penalties as soon as you
                          invite external stakeholders.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                          Federated Node Licensing
                        </span>
                        <p className="text-xs text-zinc-400">
                          Flat organization pricing model designed specifically
                          for external partner networks.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Multi-Entity Governance
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Channel
                          Permissions Sprawl
                        </span>
                        <p className="text-xs text-zinc-500">
                          Managing hundreds of guest invites leads to
                          configuration errors and security leaks.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                          Symmetric Bilateral Policies
                        </span>
                        <p className="text-xs text-zinc-400">
                          Mutual corporate agreements define exact room
                          boundaries without guest user sprawl.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-6 text-zinc-300 font-medium">
                        Signal vs Noise
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-400 space-y-1">
                        <span className="text-red-400 flex items-center gap-1 font-mono text-xs">
                          <XCircle className="w-4 h-4 shrink-0" /> Constant Ping
                          Culture
                        </span>
                        <p className="text-xs text-zinc-500">
                          Unstructured internal channels mix critical executive
                          decisions with casual chatter.
                        </p>
                      </td>
                      <td className="p-4 sm:p-6 text-zinc-200 bg-zinc-900/30 space-y-1">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />{" "}
                          High-Stakes Focus
                        </span>
                        <p className="text-xs text-zinc-400">
                          Structured project rooms with mandatory action items,
                          signing workflows, and milestone tracking.
                        </p>
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Corporate Use Cases Grid */}
      <section className="py-24 border-t border-zinc-900 bg-zinc-950/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
              Enterprise Application
            </span>
            <h2 className="text-3xl md:text-4xl font-light text-zinc-100">
              Tailored for high-liability environments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-200 border border-zinc-700">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-zinc-100">
                B2B Consultancies & Legal Firms
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Maintain dedicated executive client portals. Exclude junior
                staff personal details, enforce client confidentiality
                contracts, and automate retention schedules.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-200 border border-zinc-700">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-zinc-100">
                Subsidiaries & Holding Groups
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect parent entities with portfolio companies under unified
                corporate governance without merging internal IT directory
                stacks.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-4 hover:border-zinc-700 transition-colors">
              <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-200 border border-zinc-700">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-medium text-zinc-100">
                Supply Chain & Vendors
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Share specs, purchase orders, and logistics updates in secure
                corridors with restricted, role-based document access and
                auto-expiring links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Architecture Callout */}
      <section
        id="security"
        className="py-24 border-t border-zinc-900 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 rounded-2xl border border-zinc-800 p-8 sm:p-12 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-3 py-1 rounded-full">
                  <Activity className="w-3.5 h-3.5" />
                  <span>HARDENED SECURITY MATRIX</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-light text-zinc-100 leading-tight">
                  Zero-Knowledge architecture with cryptographic domain pinning.
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                  Message contents and attached files are encrypted locally on
                  user devices before transmission. Your private encryption keys
                  remain exclusively under your control. Not even VaultNet
                  operators can inspect your cross-corporate communication
                  payloads.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-400 pt-2">
                  <span className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900 px-3 py-1.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200" />{" "}
                    AES-256 GCM
                  </span>
                  <span className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900 px-3 py-1.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200" /> SAML
                    2.0 / Okta
                  </span>
                  <span className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-900 px-3 py-1.5 rounded">
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200" />{" "}
                    Custom HSM Support
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 bg-zinc-950 p-6 rounded-xl border border-zinc-800/80 font-mono text-xs text-zinc-400 space-y-3">
                <div className="flex items-center justify-between text-zinc-500 border-b border-zinc-800 pb-2">
                  <span>Cryptographic Proof</span>
                  <span>STATUS: VALID</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <div className="text-zinc-500">
                    Root Node Key Fingerprint:
                  </div>
                  <div className="text-zinc-200 break-all bg-zinc-900 p-2 rounded border border-zinc-800">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </div>
                </div>
                <div className="pt-2 text-[10px] text-emerald-400 flex items-center justify-between">
                  <span>Audit Trail Verified</span>
                  <span>Latency: 14ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-zinc-900 bg-gradient-to-b from-[#08080a] to-zinc-950 relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-3xl sm:text-5xl font-light text-zinc-100 tracking-tight">
            Ready to isolate corporate communication from personal noise?
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto">
            Schedule a 15-minute architecture briefing with our security team to
            deploy your companys dedicated communication node.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button className="w-full sm:w-auto px-8 py-4 rounded bg-zinc-100 text-zinc-950 font-medium hover:bg-zinc-300 transition-all flex items-center justify-center space-x-2">
              <span>Book Enterprise Briefing</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 rounded bg-zinc-900 text-zinc-300 font-medium hover:bg-zinc-800 border border-zinc-800 transition-all">
              Download Security Whitepaper
            </button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="py-12 border-t border-zinc-900 text-xs text-zinc-500 font-mono relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center justify-center">
              V
            </div>
            <span className="text-zinc-300 font-sans font-medium text-sm">
              VAULTNET ENTERPRISE
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              SOC2 Compliance Report
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Security Disclosures
            </a>
            <a href="#" className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
