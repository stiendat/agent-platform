import type { NavManifest, NavSection } from '@seta/module-sdk';
import type { CustomDashboard } from '@seta/performance/contracts';
import { BarChart2, LayoutDashboard, TrendingUp, Wand2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ariaNavManifest: NavManifest = {
  id: 'performance',
  label: 'ARIA',
  icon: BarChart2,
  requiredPermissions: ['performance.dashboard.read'],
  useNavExtensions,
  nav: [
    {
      label: 'Dashboards',
      items: [
        {
          id: 'aria.overview',
          icon: LayoutDashboard,
          label: 'My Overview',
          to: '/aria/overview',
          requires: ['performance.dashboard.read'],
        },
        {
          id: 'aria.team',
          icon: TrendingUp,
          label: 'Team',
          to: '/aria/team',
          requires: ['performance.dashboard.team.read'],
        },
        {
          id: 'aria.executive',
          icon: BarChart2,
          label: 'Executive',
          to: '/aria/executive',
          requires: ['performance.dashboard.executive.read'],
        },
      ],
    },
    {
      label: 'Custom Dashboards',
      items: [
        {
          id: 'aria.custom',
          icon: Wand2,
          label: 'All Custom Dashboards',
          to: '/aria/custom',
          requires: ['performance.dashboard.custom.read'],
        },
      ],
    },
  ],
};

async function fetchCustomDashboards(): Promise<CustomDashboard[]> {
  try {
    const res = await fetch('/api/performance/v1/dashboards/custom', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.dashboards ?? [];
  } catch {
    return [];
  }
}

function useNavExtensions(): NavSection[] {
  const [saved, setSaved] = useState<CustomDashboard[]>([]);

  useEffect(() => {
    fetchCustomDashboards().then((dashboards) => {
      setSaved(dashboards.filter((d) => d.showInSidebar));
    });
  }, []);

  if (saved.length === 0) return [];

  return [
    {
      label: 'Saved',
      items: saved.map((d) => ({
        id: `aria.custom.${d.id}`,
        label: d.name,
        to: `/aria/custom/${d.id}`,
        requires: ['performance.dashboard.custom.read'] as const,
        indent: 1,
      })),
    },
  ];
}
