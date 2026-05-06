"use client";

import { useState, useEffect } from "react";
import { FadeIn } from "@/components/motion-div";
import { Save, Settings, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CompOffSlab {
  minHours: number;
  compOffDays: number;
}

interface OtSettingsData {
  standardHoursPerDay: number;
  otRatePerHour: number;
  compOffSlabs: CompOffSlab[];
}

export default function OtSettingsPage() {
  const [settings, setSettings] = useState<OtSettingsData>({
    standardHoursPerDay: 8,
    otRatePerHour: 100,
    compOffSlabs: [
      { minHours: 4, compOffDays: 0.5 },
      { minHours: 8, compOffDays: 1 },
      { minHours: 11, compOffDays: 1.5 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/ot/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/ot/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("OT settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function addSlab() {
    setSettings((s) => ({
      ...s,
      compOffSlabs: [...s.compOffSlabs, { minHours: 0, compOffDays: 0 }],
    }));
  }

  function removeSlab(i: number) {
    setSettings((s) => ({
      ...s,
      compOffSlabs: s.compOffSlabs.filter((_, idx) => idx !== i),
    }));
  }

  function updateSlab(i: number, key: keyof CompOffSlab, value: number) {
    setSettings((s) => ({
      ...s,
      compOffSlabs: s.compOffSlabs.map((slab, idx) =>
        idx === i ? { ...slab, [key]: value } : slab
      ),
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <FadeIn>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <Settings className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="ds-h1">OT Settings</h1>
            <p className="ds-body mt-0.5">Configure standard hours, OT rate, and comp-off slabs</p>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Basic Configuration</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="ds-label" htmlFor="std-hours">
                  Standard Hours / Day
                </label>
                <input
                  id="std-hours"
                  type="number"
                  min={1}
                  max={24}
                  step={0.5}
                  value={settings.standardHoursPerDay}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, standardHoursPerDay: parseFloat(e.target.value) || 8 }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground">OT applies when hours exceed this threshold on regular days</p>
              </div>
              <div className="space-y-1.5">
                <label className="ds-label" htmlFor="ot-rate">
                  OT Rate per Hour (₹)
                </label>
                <input
                  id="ot-rate"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.otRatePerHour}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, otRatePerHour: parseFloat(e.target.value) || 100 }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-xs text-muted-foreground">Amount paid per overtime hour</p>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-foreground">Comp-Off Slabs</span>
              <p className="text-xs text-muted-foreground mt-0.5">Applied when employee works on a holiday or weekend</p>
            </div>
            <button
              onClick={addSlab}
              className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
            >
              <Plus className="size-3.5" /> Add Slab
            </button>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1">
              <span className="text-xs font-medium text-muted-foreground">Min Hours Worked</span>
              <span className="text-xs font-medium text-muted-foreground">Comp-Off Days</span>
              <span />
            </div>
            {settings.compOffSlabs.map((slab, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_40px] gap-3 items-center">
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={slab.minHours}
                  onChange={(e) => updateSlab(i, "minHours", parseFloat(e.target.value) || 0)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. 4"
                />
                <input
                  type="number"
                  min={0}
                  max={3}
                  step={0.5}
                  value={slab.compOffDays}
                  onChange={(e) => updateSlab(i, "compOffDays", parseFloat(e.target.value) || 0)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="e.g. 0.5"
                />
                <button
                  onClick={() => removeSlab(i)}
                  className="size-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {settings.compOffSlabs.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No slabs configured. Add at least one.</p>
            )}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.2}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Settings
        </button>
      </FadeIn>
    </div>
  );
}
