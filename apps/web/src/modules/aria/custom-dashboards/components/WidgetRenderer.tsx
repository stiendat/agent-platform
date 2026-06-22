import type { CardPayload } from '@seta/performance/contracts';
import { cn } from '@seta/shared-ui';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  AccessDeniedCard,
  AccountSummaryCard,
  AtRiskListCard,
  EmployeeProfileCard,
  HumanReviewFlagCard,
  InlineTranscriptCard,
  NormExplainerCard,
  PerformersCard,
  ReportCard,
} from '@/modules/agent/chat-experience/cards';
import type { DashboardWidget } from '../types';

function CardWidget({ widget }: { widget: DashboardWidget }) {
  if (widget.content.type !== 'card') return null;
  const card = widget.content.card as CardPayload;

  switch (card.type) {
    case 'employee_profile_report':
      return <EmployeeProfileCard card={card} />;
    case 'inline_transcript':
      return <InlineTranscriptCard card={card} />;
    case 'at_risk_list':
      return <AtRiskListCard card={card} />;
    case 'account_summary':
      return <AccountSummaryCard card={card} />;
    case 'access_denied':
      return <AccessDeniedCard card={card} />;
    case 'human_review_flag':
      return <HumanReviewFlagCard card={card} />;
    case 'report':
      return <ReportCard card={card} />;
    case 'top_performers':
    case 'bottom_performers':
      return <PerformersCard card={card} />;
    case 'norm_explainer':
      return <NormExplainerCard card={card} />;
    default:
      return null;
  }
}

function TextWidget({ content }: { content: { type: 'text'; content: string } }) {
  return (
    <div className="h-full px-4 py-3">
      <p className="text-body-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
        {content.content}
      </p>
    </div>
  );
}

function HeaderWidget({ content }: { content: { type: 'header'; content: string } }) {
  return (
    <div className="flex h-full items-center px-4">
      <h2 className="text-headline font-semibold text-ink tracking-tight">{content.content}</h2>
    </div>
  );
}

function IndicatorWidget({
  content,
}: {
  content: { type: 'indicator'; label: string; value: string; trend?: string; change?: string };
}) {
  const TrendIcon =
    content.trend === 'up' ? TrendingUp : content.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    content.trend === 'up'
      ? 'text-semantic-success'
      : content.trend === 'down'
        ? 'text-danger-ink'
        : 'text-ink-subtle';

  return (
    <div className="flex h-full flex-col justify-center px-4 gap-1">
      <p className="text-caption text-ink-subtle uppercase tracking-[0.06em]">{content.label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-[28px] font-semibold leading-none tracking-tight text-ink">
          {content.value}
        </p>
        {content.trend && (
          <span className={cn('flex items-center gap-0.5 text-body-sm font-medium', trendColor)}>
            <TrendIcon className="size-3.5" />
          </span>
        )}
      </div>
      {content.change && <p className="text-caption text-ink-subtle">{content.change}</p>}
    </div>
  );
}

function ListWidget({ content }: { content: { type: 'list'; title?: string; items: string[] } }) {
  return (
    <div className="h-full overflow-auto px-4 py-3">
      {content.title && (
        <h3 className="text-body-sm font-semibold text-ink mb-2">{content.title}</h3>
      )}
      <ul className="space-y-1.5">
        {content.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-body-sm text-ink-muted">
            <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const { content } = widget;

  switch (content.type) {
    case 'card':
      return <CardWidget widget={widget} />;
    case 'text':
      return <TextWidget content={content} />;
    case 'header':
      return <HeaderWidget content={content as { type: 'header'; content: string }} />;
    case 'indicator':
      return <IndicatorWidget content={content} />;
    case 'list':
      return <ListWidget content={content as { type: 'list'; title?: string; items: string[] }} />;
    default:
      return null;
  }
}
