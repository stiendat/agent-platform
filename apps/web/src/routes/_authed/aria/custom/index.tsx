import { Badge, Button, cn, PageChrome } from '@seta/shared-ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Clock,
  Eye,
  FileEdit,
  LayoutDashboard,
  Pencil,
  Plus,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CustomDashboard } from '@/modules/aria/custom-dashboards/types';

const API_BASE = '/api/performance/v1/dashboards/custom';

async function fetchDashboards(): Promise<CustomDashboard[]> {
  const res = await fetch(API_BASE, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.dashboards ?? [];
}

async function apiCreate(name: string): Promise<CustomDashboard> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create dashboard');
  const data = await res.json();
  return data.dashboard;
}

async function apiRename(id: string, name: string): Promise<void> {
  await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

async function apiToggleSidebar(id: string, showInSidebar: boolean): Promise<void> {
  await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ show_in_sidebar: showInSidebar }),
  });
}

async function apiDelete(id: string): Promise<void> {
  await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export const Route = createFileRoute('/_authed/aria/custom/')({
  component: DashboardListPage,
});

function DashboardListPage() {
  const navigate = useNavigate();
  const [dashboards, setDashboards] = useState<CustomDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    fetchDashboards().then((d) => {
      setDashboards(d);
      setLoading(false);
    });
  }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    apiCreate(newName.trim())
      .then((db) => {
        setDashboards((prev) => [db, ...prev]);
        setNewName('');
        setCreating(false);
        navigate({ to: '/aria/custom/$dashboardId/edit', params: { dashboardId: db.id } });
      })
      .catch((err) => console.error('Create failed:', err));
  };

  const handleRename = (id: string, name: string) => {
    apiRename(id, name)
      .then(() => {
        setDashboards((prev) =>
          prev.map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d)),
        );
      })
      .catch((err) => console.error('Rename failed:', err));
    setRenaming(null);
    setRenameText('');
  };

  const handleDelete = (id: string) => {
    apiDelete(id)
      .then(() => {
        setDashboards((prev) => prev.filter((d) => d.id !== id));
      })
      .catch((err) => console.error('Delete failed:', err));
  };

  const handleToggleSidebar = (id: string) => {
    const target = dashboards.find((d) => d.id === id);
    if (!target) return;
    const next = !target.showInSidebar;
    apiToggleSidebar(id, next)
      .then(() => {
        setDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, showInSidebar: next } : d)));
      })
      .catch((err) => console.error('Toggle failed:', err));
  };

  return (
    <PageChrome breadcrumb={['ARIA', 'Custom Dashboards']} title="Custom Dashboards">
      <div className="page-container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-body-sm text-ink-muted">
            Build custom dashboards with AI-generated cards. Open the editor to design your view.
          </p>
        </div>

        {creating ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary-border bg-primary-tint px-4 py-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
              placeholder="Dashboard name…"
              className="flex-1 bg-transparent text-body-sm text-ink outline-none placeholder:text-ink-subtle"
              // biome-ignore lint/a11y/noAutofocus: focus moves into an inline create field opened by an explicit user action, not on page load
              autoFocus
            />
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setNewName('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setCreating(true)} className="self-start gap-2">
            <Plus className="size-4" />
            New Dashboard
          </Button>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-body-sm text-ink-muted">Loading dashboards...</p>
          </div>
        ) : dashboards.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <LayoutDashboard className="size-10 text-ink-subtle" />
            <p className="text-body-sm font-medium text-ink">No custom dashboards yet</p>
            <p className="text-caption text-ink-subtle max-w-xs">
              Create your first dashboard to start building with AI-generated cards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((db) => (
              <div
                key={db.id}
                className={cn(
                  'group relative rounded-xl border border-hairline bg-surface-1 overflow-hidden',
                  'hover:border-primary/30 transition-colors duration-150',
                )}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {renaming === db.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(db.id, renameText);
                              if (e.key === 'Escape') {
                                setRenaming(null);
                                setRenameText('');
                              }
                            }}
                            className="flex-1 bg-transparent text-card-title font-semibold text-ink outline-none"
                            // biome-ignore lint/a11y/noAutofocus: focus moves into an inline rename field opened by an explicit user action, not on page load
                            autoFocus
                          />
                        </div>
                      ) : (
                        <h3 className="text-card-title font-semibold text-ink truncate">
                          {db.name}
                        </h3>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        {db.isDraft ? (
                          <Badge variant="warning">Draft</Badge>
                        ) : (
                          <Badge variant="success">Saved</Badge>
                        )}
                        <span className="flex items-center gap-1 text-caption text-ink-subtle">
                          <Clock className="size-3" />
                          {new Date(db.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="text-caption text-ink-subtle">
                          {db.widgets.length} widget{db.widgets.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSidebar(db.id)}
                      className={cn(
                        'shrink-0 rounded-md p-1.5 transition-colors',
                        db.showInSidebar
                          ? 'text-primary bg-primary-tint hover:bg-primary-tint/60'
                          : 'text-ink-subtle hover:text-ink hover:bg-surface-2 opacity-0 group-hover:opacity-100',
                      )}
                      title={db.showInSidebar ? 'Remove from sidebar' : 'Add to sidebar'}
                    >
                      {db.showInSidebar ? (
                        <Star className="size-4 fill-current" />
                      ) : (
                        <StarOff className="size-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center border-t border-hairline divide-x divide-hairline opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({ to: '/aria/custom/$dashboardId', params: { dashboardId: db.id } })
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-body-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                  >
                    <Eye className="size-3.5" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/aria/custom/$dashboardId/edit',
                        params: { dashboardId: db.id },
                      })
                    }
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-body-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                  >
                    <FileEdit className="size-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(db.id);
                      setRenameText(db.name);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-body-sm text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
                  >
                    <Pencil className="size-3.5" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(db.id)}
                    className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-body-sm text-ink-muted hover:text-danger-ink hover:bg-danger-tint transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageChrome>
  );
}
