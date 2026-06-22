import { Badge, Button, PageChrome } from '@seta/shared-ui';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, FileEdit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardGrid } from '@/modules/aria/custom-dashboards/components/DashboardGrid';
import type { CustomDashboard } from '@/modules/aria/custom-dashboards/types';

async function fetchDashboard(id: string): Promise<CustomDashboard | null> {
  const res = await fetch(`/api/performance/v1/dashboards/custom/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.dashboard ?? null;
}

export const Route = createFileRoute('/_authed/aria/custom/$dashboardId/')({
  component: DashboardViewPage,
});

function DashboardViewPage() {
  const { dashboardId } = Route.useParams();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<CustomDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard(dashboardId).then((d) => {
      setDashboard(d);
      setLoading(false);
    });
  }, [dashboardId]);

  if (loading) {
    return (
      <PageChrome breadcrumb={['ARIA', 'Custom Dashboards']} title="Loading...">
        <div className="page-container py-16 flex items-center justify-center">
          <p className="text-body-sm text-ink-muted">Loading dashboard...</p>
        </div>
      </PageChrome>
    );
  }

  if (!dashboard) {
    return (
      <PageChrome breadcrumb={['ARIA', 'Custom Dashboards']} title="Dashboard not found">
        <div className="page-container py-16 flex flex-col items-center gap-3 text-center">
          <p className="text-body-sm text-ink-muted">
            This dashboard doesn't exist or was deleted.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate({ to: '/aria/custom' })}
            className="gap-2"
          >
            <ArrowLeft className="size-4" /> Back to Dashboards
          </Button>
        </div>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumb={['ARIA', 'Custom Dashboards']}
      title={dashboard.name}
      subtitle={`${dashboard.widgets.length} widget${dashboard.widgets.length !== 1 ? 's' : ''} · Updated ${new Date(dashboard.updatedAt).toLocaleDateString()}`}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            navigate({ to: '/aria/custom/$dashboardId/edit', params: { dashboardId } })
          }
          className="gap-2"
        >
          <FileEdit className="size-4" /> Edit
        </Button>
      }
    >
      <div className="sticky top-0 z-20 border-b border-hairline bg-canvas">
        <div className="page-container py-3 flex items-center gap-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ to: '/aria/custom' })}
            className="gap-1.5 -ml-2"
          >
            <ArrowLeft className="size-4" /> All dashboards
          </Button>
        </div>
      </div>
      <div className="page-container py-6">
        {dashboard.isDraft && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-semantic-warning/30 bg-semantic-warning-tint px-3 py-2">
            <Badge variant="warning">Draft</Badge>
            <span className="text-caption text-semantic-warning">
              This dashboard is a draft and only visible to you.
            </span>
          </div>
        )}
        <DashboardGrid dashboard={dashboard} editable={false} />
      </div>
    </PageChrome>
  );
}
