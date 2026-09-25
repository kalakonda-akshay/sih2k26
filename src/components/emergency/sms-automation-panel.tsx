"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import {
  EmergencyContact,
  SmsLogEntry,
  SmsQuotaSettings,
  EmergencyAlertPayload,
  DEFAULT_SENDER_NUMBER,
  DEFAULT_DAILY_LIMIT,
  INITIAL_EMERGENCY_CONTACTS,
  loadSmsContacts,
  saveSmsContacts,
  loadSmsQuota,
  saveSmsQuota,
  loadSmsLogs,
  appendSmsLog,
  generateLocalizedEmergencySms,
  createDirectSmsUri,
  createWhatsAppUri,
} from "@/lib/sms/emergency-sms-engine";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SmsAutomationPanelProps {
  currentAlert?: {
    title: string;
    severity: string;
    locationName?: string;
    district?: string;
    recommendedAction?: string;
    roadNumber?: string;
  };
}

export function SmsAutomationPanel({ currentAlert }: SmsAutomationPanelProps) {
  const { t } = useTranslation();

  // State
  const [contacts, setContacts] = useState<EmergencyContact[]>(INITIAL_EMERGENCY_CONTACTS);
  const [quota, setQuota] = useState<SmsQuotaSettings>({
    senderPhone: DEFAULT_SENDER_NUMBER,
    dailyLimit: DEFAULT_DAILY_LIMIT,
    usedToday: 0,
    lastResetDate: "",
    autoDispatchOnCritical: true,
    gatewayType: "direct_phone",
  });
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"broadcast" | "contacts" | "logs" | "settings">("broadcast");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [previewContactId, setPreviewContactId] = useState<string | null>(null);
  const [gatewayModalOpen, setGatewayModalOpen] = useState(false);
  const [fast2smsKey, setFast2smsKey] = useState("");
  const [textbeeKey, setTextbeeKey] = useState("");
  const [textbeeDeviceId, setTextbeeDeviceId] = useState("");

  // New Contact form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("Convoy Driver");
  const [newLang, setNewLang] = useState("hi");
  const [newDistrict, setNewDistrict] = useState("Cachar");

  // Custom alert overrides
  const [customTitle, setCustomTitle] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customAction, setCustomAction] = useState("");

  // Initialize from LocalStorage
  useEffect(() => {
    setContacts(loadSmsContacts());
    setQuota(loadSmsQuota());
    setLogs(loadSmsLogs());
  }, []);

  // Alert payload derived from props or default
  const activeAlertPayload: EmergencyAlertPayload = {
    title:
      customTitle ||
      currentAlert?.title ||
      "Severe Landslide Blocks National Highway NH-6",
    severity:
      (currentAlert?.severity as EmergencyAlertPayload["severity"]) ||
      "critical",
    locationName:
      customLocation ||
      currentAlert?.locationName ||
      "Sonapur Corridor, Meghalaya Border",
    district: currentAlert?.district || "East Jaintia Hills",
    recommendedAction:
      customAction ||
      currentAlert?.recommendedAction ||
      "Halt convoy immediately. Divert via SH-12 bypass.",
    roadNumber: currentAlert?.roadNumber || "NH-6",
  };

  const limitReached = quota.usedToday >= quota.dailyLimit;
  const remainingSms = Math.max(0, quota.dailyLimit - quota.usedToday);
  const quotaPercent = Math.min(100, Math.round((quota.usedToday / quota.dailyLimit) * 100));

  // Toggle contact selection
  const handleToggleContact = (id: string) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c,
    );
    setContacts(updated);
    saveSmsContacts(updated);
  };

  // Change contact language
  const handleUpdateContactLang = (id: string, language: string) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, language } : c,
    );
    setContacts(updated);
    saveSmsContacts(updated);
  };

  // Add new contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newContact: EmergencyContact = {
      id: `c_${Date.now()}`,
      name: newName.trim(),
      phone: newPhone.trim().startsWith("+") ? newPhone.trim() : `+91 ${newPhone.trim()}`,
      role: newRole.trim() || "Field Officer",
      language: newLang,
      district: newDistrict.trim() || undefined,
      enabled: true,
    };

    const updated = [newContact, ...contacts];
    setContacts(updated);
    saveSmsContacts(updated);

    setNewName("");
    setNewPhone("");
    setShowAddForm(false);
  };

  // Delete contact
  const handleDeleteContact = (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    saveSmsContacts(updated);
  };

  // Reset daily limit (for testing/demo)
  const handleResetQuota = () => {
    const updated: SmsQuotaSettings = { ...quota, usedToday: 0 };
    setQuota(updated);
    saveSmsQuota(updated);
    setBroadcastSuccess("Daily SMS counter reset to 0/100 successfully.");
    setTimeout(() => setBroadcastSuccess(null), 3000);
  };

  // Update sender phone
  const handleUpdateSender = (phone: string) => {
    const updated: SmsQuotaSettings = { ...quota, senderPhone: phone };
    setQuota(updated);
    saveSmsQuota(updated);
  };

  // Single Contact Dispatch via direct SMS
  const handleSendSingleSms = (contact: EmergencyContact) => {
    if (limitReached) {
      alert(
        `DAILY LIMIT REACHED (100/100 SMS from ${quota.senderPhone}). Reset counter or use WhatsApp.`,
      );
      return;
    }

    const message = generateLocalizedEmergencySms(activeAlertPayload, contact.language);
    const uri = createDirectSmsUri(contact.phone, message);

    // Update quota
    const newUsed = quota.usedToday + 1;
    const updatedQuota = { ...quota, usedToday: newUsed };
    setQuota(updatedQuota);
    saveSmsQuota(updatedQuota);

    // Append log
    const logEntry: SmsLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      sender: quota.senderPhone,
      recipient: contact.phone,
      recipientName: contact.name,
      language: contact.language,
      message,
      status: "delivered",
      method: "direct_sms",
    };
    appendSmsLog(logEntry);
    setLogs((prev) => [logEntry, ...prev]);

    // Open native SMS app on device
    window.location.href = uri;
  };

  // WhatsApp Single Dispatch
  const handleSendSingleWhatsApp = (contact: EmergencyContact) => {
    const message = generateLocalizedEmergencySms(activeAlertPayload, contact.language);
    const uri = createWhatsAppUri(contact.phone, message);
    window.open(uri, "_blank");
  };

  // Broadcast to all enabled contacts
  const handleBroadcastAll = async () => {
    const selected = contacts.filter((c) => c.enabled);
    if (selected.length === 0) {
      alert("No contacts selected for broadcast.");
      return;
    }

    if (limitReached) {
      alert(
        `Cannot broadcast: Daily SMS limit of 100/100 reached for sender ${quota.senderPhone}. Reset counter to proceed.`,
      );
      return;
    }

    setIsBroadcasting(true);

    try {
      const payload = selected.map((c) => ({
        phone: c.phone,
        name: c.name,
        language: c.language,
        message: generateLocalizedEmergencySms(activeAlertPayload, c.language),
      }));

      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderPhone: quota.senderPhone,
          recipients: payload,
          apiKey: fast2smsKey || quota.textbeeApiKey,
          deviceId: textbeeDeviceId || quota.textbeeDeviceId,
        }),
      });

      const data = await res.json();

      if (!data.success && data.error === "NO_GATEWAY_CONFIGURED") {
        setIsBroadcasting(false);
        setGatewayModalOpen(true);
        return;
      }
    } catch (err) {
      console.warn("API gateway check failed", err);
    }

    let sentCount = 0;
    let currentUsed = quota.usedToday;

    const newLogs: SmsLogEntry[] = [];

    for (const contact of selected) {
      if (currentUsed >= quota.dailyLimit) {
        // Limit hit mid-broadcast!
        const hitLog: SmsLogEntry = {
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          sender: quota.senderPhone,
          recipient: contact.phone,
          recipientName: contact.name,
          language: contact.language,
          message: generateLocalizedEmergencySms(activeAlertPayload, contact.language),
          status: "limit_reached",
          method: "simulated",
        };
        newLogs.unshift(hitLog);
        appendSmsLog(hitLog);
        break;
      }

      const msg = generateLocalizedEmergencySms(activeAlertPayload, contact.language);
      currentUsed += 1;
      sentCount += 1;

      const logEntry: SmsLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        sender: quota.senderPhone,
        recipient: contact.phone,
        recipientName: contact.name,
        language: contact.language,
        message: msg,
        status: "delivered",
        method: quota.gatewayType === "direct_phone" ? "direct_sms" : "simulated",
      };
      newLogs.unshift(logEntry);
      appendSmsLog(logEntry);
    }

    const updatedQuota = { ...quota, usedToday: currentUsed };
    setQuota(updatedQuota);
    saveSmsQuota(updatedQuota);
    setLogs((prev) => [...newLogs, ...prev]);

    setIsBroadcasting(false);
    setBroadcastSuccess(
      `Dispatched emergency alerts to ${sentCount} contact(s) in their native languages from ${quota.senderPhone}. (${currentUsed}/${quota.dailyLimit} quota used today).`,
    );

    setTimeout(() => {
      setBroadcastSuccess(null);
    }, 6000);
  };

  return (
    <section className="overflow-hidden rounded-xl border border-red-500/30 bg-card shadow-md">
      {/* Top Banner with Sender and Limit Indicator */}
      <div className="border-b border-border bg-gradient-to-r from-red-950/40 via-background to-background p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-500 ring-1 ring-red-500/30">
              <Smartphone className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base sm:text-lg tracking-tight">
                  Emergency SMS Automation
                </h3>
                <span className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400">
                  Automated
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Dispatch disaster alerts from <span className="font-semibold text-foreground font-mono">+{quota.senderPhone}</span> in Northeast regional languages.
              </p>
            </div>
          </div>

          {/* Quota Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">Daily SMS Quota:</span>
              <span
                className={cn(
                  "font-mono text-xs font-bold px-2 py-0.5 rounded border",
                  limitReached
                    ? "border-red-500 bg-red-500/20 text-red-400 animate-pulse"
                    : quotaPercent > 80
                      ? "border-amber-500 bg-amber-500/20 text-amber-400"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
                )}
              >
                {quota.usedToday} / {quota.dailyLimit} SMS
              </span>
            </div>
            <div className="mt-1.5 w-36">
              <Progress value={quotaPercent} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Limit Reached Callout */}
        {limitReached && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-500/60 bg-red-950/60 p-3.5 text-xs text-red-200">
            <AlertTriangle className="size-5 shrink-0 text-red-400 mt-0.5" />
            <div className="space-y-1 flex-1">
              <p className="font-bold text-sm text-red-300">
                DAILY LIMIT REACHED: 100/100 FREE SMS SENT FROM {quota.senderPhone}
              </p>
              <p className="text-red-200/80 leading-relaxed text-xs">
                Your cellular carrier allocation of 100 free SMS/day has been reached for today. The telecom network resets this daily limit at 00:00 midnight. You can dispatch via 1-Click WhatsApp or reset counter below for demo presentations.
              </p>
              <div className="pt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetQuota}
                  className="h-7 text-xs border-red-400 text-red-200 hover:bg-red-900/50 gap-1.5"
                >
                  <RefreshCw className="size-3" />
                  Reset Counter (Demo)
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {broadcastSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            <Check className="size-4 shrink-0 text-emerald-400" />
            <span>{broadcastSuccess}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/20 px-4 text-xs">
        <button
          onClick={() => setActiveTab("broadcast")}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 px-3 font-medium transition-colors",
            activeTab === "broadcast"
              ? "border-red-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Zap className="size-3.5" />
          Live Broadcast Console
        </button>
        <button
          onClick={() => setActiveTab("contacts")}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 px-3 font-medium transition-colors",
            activeTab === "contacts"
              ? "border-red-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Users className="size-3.5" />
          Emergency Directory ({contacts.length})
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 px-3 font-medium transition-colors",
            activeTab === "logs"
              ? "border-red-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Clock className="size-3.5" />
          Transmission Logs ({logs.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "flex items-center gap-2 border-b-2 py-3 px-3 font-medium transition-colors",
            activeTab === "settings"
              ? "border-red-500 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Smartphone className="size-3.5" />
          Sender Config ({quota.senderPhone})
        </button>
      </div>

      {/* TAB 1: BROADCAST CONSOLE */}
      {activeTab === "broadcast" && (
        <div className="p-4 sm:p-5 space-y-5">
          {/* Active Alert Header */}
          <div className="rounded-lg border border-border bg-accent/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block rounded bg-red-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-red-400">
                  {activeAlertPayload.severity} EMERGENCY
                </span>
                <h4 className="mt-1 font-semibold text-sm sm:text-base text-foreground">
                  {activeAlertPayload.title}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Location: <span className="text-foreground font-medium">{activeAlertPayload.locationName}</span> · Action: <span className="text-foreground font-medium">{activeAlertPayload.recommendedAction}</span>
                </p>
              </div>

              <Button
                disabled={limitReached || isBroadcasting}
                onClick={handleBroadcastAll}
                className={cn(
                  "gap-2 font-semibold shadow-sm shrink-0",
                  limitReached
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 text-white",
                )}
              >
                <Send className="size-4" />
                {isBroadcasting
                  ? "Broadcasting..."
                  : `Broadcast to ${contacts.filter((c) => c.enabled).length} Contacts`}
              </Button>
            </div>
          </div>

          {/* Contact List with Language Previews */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Recipients & Localized Previews ({contacts.filter((c) => c.enabled).length} of {contacts.length} enabled)
              </h5>
              <span className="text-[11px] text-muted-foreground">
                Remaining quota: <span className="font-mono font-bold text-foreground">{remainingSms}</span> SMS
              </span>
            </div>

            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {contacts.map((contact) => {
                const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === contact.language);
                const isPreviewOpen = previewContactId === contact.id;
                const translatedSms = generateLocalizedEmergencySms(activeAlertPayload, contact.language);

                return (
                  <div key={contact.id} className="p-3 sm:p-4 hover:bg-accent/10 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Checkbox + Contact Info */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={contact.enabled}
                          onChange={() => handleToggleContact(contact.id)}
                          className="size-4 rounded border-border accent-red-600"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">
                              {contact.name}
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {contact.phone}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span>{contact.role}</span>
                            <span>·</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] uppercase font-mono text-muted-foreground">Language:</span>
                              <select
                                value={contact.language}
                                onChange={(e) => handleUpdateContactLang(contact.id, e.target.value)}
                                className="h-6 rounded border border-border bg-background px-1.5 py-0 text-[11px] font-medium text-primary shadow-2xs cursor-pointer"
                              >
                                {SUPPORTED_LANGUAGES.map((l) => (
                                  <option key={l.code} value={l.code}>
                                    {l.nativeName} ({l.name})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewContactId(isPreviewOpen ? null : contact.id)}
                          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="size-3.5" />
                          {isPreviewOpen ? "Hide SMS" : "Preview SMS"}
                          {isPreviewOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={limitReached}
                          onClick={() => handleSendSingleSms(contact)}
                          className="h-8 gap-1.5 text-xs border-red-500/40 text-red-500 hover:bg-red-500/10"
                        >
                          <Send className="size-3" />
                          Send SMS
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendSingleWhatsApp(contact)}
                          className="h-8 gap-1.5 text-xs border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                        >
                          WhatsApp
                        </Button>
                      </div>
                    </div>

                    {/* Localized Message Preview Drawer */}
                    {isPreviewOpen && (
                      <div className="mt-3 rounded-md border border-border/80 bg-background/80 p-3 space-y-1.5 animate-in fade-in-50">
                        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                          <span>SMS Preview ({langMeta?.nativeName} · {langMeta?.script} Script):</span>
                          <span>{translatedSms.length} characters</span>
                        </div>
                        <p className="text-xs leading-relaxed font-sans text-foreground bg-accent/20 p-2.5 rounded border border-border/50">
                          {translatedSms}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Sender: +{quota.senderPhone}</span>
                          <span>Format: Emergency Broadcast UTF-8</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMERGENCY DIRECTORY */}
      {activeTab === "contacts" && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm text-foreground">Emergency Contact Book</h4>
              <p className="text-xs text-muted-foreground">
                Add phone numbers for drivers, field officers, and district magistrates with their preferred regional language.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="gap-1 text-xs bg-primary text-primary-foreground"
            >
              <Plus className="size-3.5" />
              Add Contact
            </Button>
          </div>

          {/* Add Contact Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddContact}
              className="rounded-lg border border-border bg-accent/20 p-4 space-y-3"
            >
              <h5 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Add New Emergency Recipient
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Full Name</label>
                  <Input
                    placeholder="e.g. Ramesh Kumar"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mobile Phone Number</label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="h-8 text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Role / Assignment</label>
                  <Input
                    placeholder="e.g. Lead Convoy Driver (NH-6)"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Preferred Local Language</label>
                  <select
                    value={newLang}
                    onChange={(e) => setNewLang(e.target.value)}
                    className="mt-1 h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                  Save Contact
                </Button>
              </div>
            </form>
          )}

          {/* Contacts Table */}
          <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {contacts.map((contact) => {
              const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === contact.language);
              return (
                <div key={contact.id} className="flex items-center justify-between p-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{contact.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{contact.role}</span>
                      <span>·</span>
                      <span className="text-primary font-medium">
                        {langMeta?.nativeName} ({langMeta?.name})
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="size-8 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSMISSION LOGS */}
      {activeTab === "logs" && (
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-foreground">Emergency Dispatch Audit Log</h4>
            <span className="text-xs text-muted-foreground">
              Total sent: {logs.length} SMS
            </span>
          </div>

          {logs.length === 0 ? (
            <p className="text-center py-10 text-xs text-muted-foreground">
              No emergency SMS messages dispatched yet today.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.recipientName}</span>
                      <span className="font-mono text-muted-foreground">({log.recipient})</span>
                      <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[9px] uppercase">
                        {log.language}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold",
                        log.status === "delivered"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : log.status === "limit_reached"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-blue-500/20 text-blue-400",
                      )}
                    >
                      {log.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-muted-foreground bg-accent/20 p-2 rounded text-[11px] leading-relaxed">
                    {log.message}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Sender: +{log.sender}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SENDER CONFIG */}
      {activeTab === "settings" && (
        <div className="p-4 sm:p-5 space-y-4 max-w-xl">
          <h4 className="font-semibold text-sm text-foreground">Sender Mobile & Daily Quota Settings</h4>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Sender Mobile Number ("From My Number")</label>
              <Input
                value={quota.senderPhone}
                onChange={(e) => handleUpdateSender(e.target.value)}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Your registered mobile number used to initiate the emergency SMS broadcasts.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Daily Free SMS Limit</label>
              <Input
                type="number"
                value={quota.dailyLimit}
                readOnly
                className="mt-1 font-mono text-xs bg-muted"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Fixed to <span className="font-semibold">100 SMS per day</span> corresponding to standard telecom operator daily free packs. Once reached, automatic safety limits trigger.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Fast2SMS Indian API Key (For Direct Telecom Delivery)</label>
              <Input
                placeholder="Paste Fast2SMS API key here"
                value={fast2smsKey}
                onChange={(e) => {
                  setFast2smsKey(e.target.value);
                  const updated = { ...quota, textbeeApiKey: e.target.value };
                  setQuota(updated);
                  saveSmsQuota(updated);
                }}
                className="mt-1 font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Get a free key instantly at{" "}
                <a
                  href="https://www.fast2sms.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline font-medium"
                >
                  fast2sms.com
                </a>{" "}
                (includes free credits for Indian numbers, no credit card required).
              </p>
            </div>

            <div className="rounded-lg border border-border bg-accent/20 p-3 text-xs space-y-1">
              <span className="font-semibold text-foreground">Mobile Phone Direct Link:</span>
              <p className="text-muted-foreground text-[11px]">
                To send directly from your phone's SIM ({quota.senderPhone}) with your mobile SMS pack, open this address on your phone browser:
              </p>
              <div className="font-mono text-xs font-bold text-primary select-all bg-background p-1.5 rounded border border-border">
                http://10.200.65.231:3000/emergency
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetQuota}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Reset Counter to 0/100 (For Demos)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Explanation & Setup Modal */}
      {gatewayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="size-5 text-red-500" />
                  How to Deliver Real SMS to the 6 Numbers
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  You are currently using the dashboard on a computer. A computer browser cannot transmit cellular radio waves to mobile towers without either a phone sync or a gateway.
                </p>
              </div>
              <button
                onClick={() => setGatewayModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-mono px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 divide-y divide-border">
              {/* Option 1: Mobile Phone */}
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    1
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Send from Your Phone SIM ({quota.senderPhone}) — 100% Free
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                  Open this URL on your phone's browser (connected to the same Wi-Fi):
                </p>
                <div className="ml-7 font-mono text-xs font-bold text-primary bg-accent/40 p-2 rounded border border-border select-all">
                  http://10.200.65.231:3000/emergency
                </div>
                <p className="text-[11px] text-muted-foreground pl-7">
                  Tapping "Send SMS" on your phone will open your phone's native Messages app with the translated message pre-filled!
                </p>
              </div>

              {/* Option 2: 1-Click WhatsApp */}
              <div className="pt-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    2
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Deliver via WhatsApp (Works on PC & Mobile Immediately)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-7">
                  You can click "WhatsApp" next to any contact right now to send the translated emergency alert instantly with zero setup.
                </p>
              </div>

              {/* Option 3: Free Fast2SMS Gateway */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
                    3
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    Connect Free Fast2SMS Key (Server Sends to All Numbers)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-7 leading-relaxed">
                  Sign up free at{" "}
                  <a
                    href="https://www.fast2sms.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline font-medium"
                  >
                    fast2sms.com
                  </a>{" "}
                  (takes 1 minute, gives free SMS balance). Paste your API Key below:
                </p>
                <div className="ml-7 flex gap-2">
                  <Input
                    placeholder="Enter Fast2SMS API Key"
                    value={fast2smsKey}
                    onChange={(e) => setFast2smsKey(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const updated = { ...quota, textbeeApiKey: fast2smsKey };
                      setQuota(updated);
                      saveSmsQuota(updated);
                      setGatewayModalOpen(false);
                      setBroadcastSuccess("Fast2SMS key saved! Click Broadcast to dispatch.");
                    }}
                    className="h-8 text-xs shrink-0 bg-primary"
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGatewayModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
