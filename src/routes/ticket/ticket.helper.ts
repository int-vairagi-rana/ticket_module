import type { TicketRow } from "../../interface";
import { TicketStatus } from "../../enums/ticket.enum";

const secondsToHuman = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  const parts = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    `${remainingSeconds}s`,
  ].filter(Boolean);

  return parts.join(" ");
};

const getChangedAt = (entry: NonNullable<TicketRow["status_history"]>[number]) => {
  const changedAt = new Date(entry.changed_at);
  return Number.isNaN(changedAt.getTime()) ? null : changedAt;
};

export const buildTicketStatusMetrics = (ticket: TicketRow) => {
  const history = [...(ticket.status_history ?? [])].sort((left, right) => {
    const leftDate = getChangedAt(left)?.getTime() ?? 0;
    const rightDate = getChangedAt(right)?.getTime() ?? 0;
    return leftDate - rightDate;
  });
  const statusDurationsSeconds = Object.values(TicketStatus).reduce<Record<string, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  for (const entry of history) {
    if (entry.from_status && typeof entry.stayed_in_status_seconds === "number") {
      statusDurationsSeconds[entry.from_status] = (statusDurationsSeconds[entry.from_status] ?? 0) + entry.stayed_in_status_seconds;
    }
  }

  const createdAt = new Date(ticket.created_at);
  const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : null;
  const now = new Date();
  const currentStatusStartedAt = getChangedAt(history[history.length - 1] ?? {
    changed_at: ticket.created_at.toString(),
    changed_by: ticket.created_by,
    from_status: null,
    to_status: ticket.status,
  });
  const currentStatusAgeSeconds = currentStatusStartedAt? Math.max(0, Math.floor((now.getTime() - currentStatusStartedAt.getTime()) / 1000)): 0;

  const totalResolutionSeconds = resolvedAt && !Number.isNaN(createdAt.getTime()) && !Number.isNaN(resolvedAt.getTime())? Math.max(0, Math.floor((resolvedAt.getTime() - createdAt.getTime()) / 1000)): null;

  const onHoldSeconds = statusDurationsSeconds[TicketStatus.ON_HOLD] ?? 0;
  
  const activeResolutionSeconds = totalResolutionSeconds === null ? null : Math.max(0, totalResolutionSeconds - onHoldSeconds);

  return {
    status_durations_seconds: statusDurationsSeconds,
    status_durations_human: Object.entries(statusDurationsSeconds).reduce<Record<string, string>>((acc, [status, seconds]) => {
      acc[status] = secondsToHuman(seconds);
      return acc;
    }, {}),
    on_hold_seconds: onHoldSeconds,
    on_hold_human: secondsToHuman(onHoldSeconds),
    current_status_age_seconds: currentStatusAgeSeconds,
    current_status_age_human: secondsToHuman(currentStatusAgeSeconds),
    total_resolution_seconds: totalResolutionSeconds,
    total_resolution_human: totalResolutionSeconds === null ? null : secondsToHuman(totalResolutionSeconds),
    active_resolution_seconds: activeResolutionSeconds,
    active_resolution_human: activeResolutionSeconds === null ? null : secondsToHuman(activeResolutionSeconds),
  };
};

export const summarizeTicketStatusHistory = (tickets: TicketRow[]) => {
  const byToStatus = Object.values(TicketStatus).reduce<Record<string, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  const byFromStatus: Record<string, number> = {};
  let totalChanges = 0;
  let latestChangeAt: string | null = null;

  for (const ticket of tickets) {
    for (const entry of ticket.status_history ?? []) {
      totalChanges += 1;
      byToStatus[entry.to_status] = (byToStatus[entry.to_status] ?? 0) + 1;
      if (entry.from_status) {
        byFromStatus[entry.from_status] = (byFromStatus[entry.from_status] ?? 0) + 1;
      }

      const changedAt = getChangedAt(entry);
      if (changedAt && (!latestChangeAt || changedAt.getTime() > new Date(latestChangeAt).getTime())) {
        latestChangeAt = changedAt.toISOString();
      }
    }
  }

  return {
    totalChanges,
    ticketsWithStatusHistory: tickets.filter((ticket) => (ticket.status_history ?? []).length > 0).length,
    latestChangeAt,
    byFromStatus,
    byToStatus,
  };
};

export const summarizeTicketStatusMetrics = (tickets: TicketRow[]) => {
  const metrics = tickets.map(buildTicketStatusMetrics);
  const resolvedMetrics = metrics.filter((metric) => metric.total_resolution_seconds !== null);
  const totalResolutionSeconds = resolvedMetrics.reduce((sum, metric) => sum + (metric.total_resolution_seconds ?? 0), 0);
  const activeResolutionSeconds = resolvedMetrics.reduce((sum, metric) => sum + (metric.active_resolution_seconds ?? 0), 0);
  const onHoldSeconds = metrics.reduce((sum, metric) => sum + metric.on_hold_seconds, 0);

  return {
    resolvedTicketsMeasured: resolvedMetrics.length,
    average_total_resolution_seconds: resolvedMetrics.length ? Math.round(totalResolutionSeconds / resolvedMetrics.length) : null,
    average_total_resolution_human: resolvedMetrics.length ? secondsToHuman(Math.round(totalResolutionSeconds / resolvedMetrics.length)) : null,
    average_active_resolution_seconds: resolvedMetrics.length ? Math.round(activeResolutionSeconds / resolvedMetrics.length) : null,
    average_active_resolution_human: resolvedMetrics.length ? secondsToHuman(Math.round(activeResolutionSeconds / resolvedMetrics.length)) : null,
    total_on_hold_seconds: onHoldSeconds,
    total_on_hold_human: secondsToHuman(onHoldSeconds),
  };
};

export const OVERDUE_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in ms



