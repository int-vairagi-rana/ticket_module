// Ticket Status Enum (matches DB ticket_status)
export enum TicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    ON_HOLD = "on_hold",
    RESOLVED = "resolved",
    CLOSED = "closed",
    REOPEN = "re_open",
    CANCELED = "canceled",
}

// Ticket Priority Enum (matches DB ticket_priority)
export enum TicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}


