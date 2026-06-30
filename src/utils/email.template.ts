import { TicketRow } from "../interface";
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getAssignmentEmail = (
  ticket: TicketRow,
  plant:{plant_name:string},
  component?:{component_name:string , component_type_name:string} | null,
  contactPersonName?: string | null,
): string => {
  const assigneeName = contactPersonName?.trim() || "there";

  return `
    <p>Hello ${escapeHtml(assigneeName)},</p>
    <p>A ticket has been assigned to you.</p>
    <p>
      <strong>Ticket Number:</strong> ${escapeHtml(ticket.ticket_number)}<br />
      <strong>Title:</strong> ${escapeHtml(ticket.title)}<br />
      <strong>Priority:</strong> ${escapeHtml(ticket.priority)}<br />
      <strong>Status:</strong> ${escapeHtml(ticket.status)}<br />
    </p>
    <p>
      <strong>Plant Name:</strong> ${escapeHtml(plant.plant_name || "N/A")}<br />
      <strong>Component Type:</strong> ${escapeHtml(component?.component_type_name || "N/A")}<br />
      <strong>Component Name:</strong> ${escapeHtml(component?.component_name || "N/A")}
    </p>
    <p>
      <strong>Ticket Creator:</strong> ${escapeHtml(ticket.created_by_name || ticket.name || "N/A")}<br />
      <strong>Email:</strong> ${escapeHtml(ticket.email || "N/A")}<br />
      <strong>Phone Number:</strong> ${escapeHtml(ticket.phone_number || "N/A")}
    </p>
    ${ticket.description ? `<p><strong>Description:</strong><br />${escapeHtml(ticket.description)}</p>` : ""}
    <p>Please review and take the required action.</p>
  `;
};

