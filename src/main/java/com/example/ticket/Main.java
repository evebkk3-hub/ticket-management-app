package com.example.ticket;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        TicketWorkflow workflow = new TicketWorkflow();
        TicketDatabase database = new TicketDatabase();
        workflow.setNextTicketId(database.nextTicketId());
        Scanner scanner = new Scanner(System.in);

        System.out.println("Ticket Management Application");
        System.out.println("=============================");

        User requester = new User(1, "Demo Requester", "requester@example.com", Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        User specialist = new User(3, "Specialist Team", "specialist@example.com", Role.SPECIALIST);
        User supervisor = new User(4, "Supervisor", "supervisor@example.com", Role.SUPERVISOR);

        System.out.print("Subject: ");
        String subject = scanner.nextLine();
        System.out.print("Description: ");
        String description = scanner.nextLine();

        Ticket ticket = workflow.createTicket(requester, subject, description);

        if (!workflow.hasCompleteInformation(ticket)) {
            System.out.println("Missing information detected.");
            System.out.print("Update description: ");
            ticket.setDescription(scanner.nextLine());
        }

        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(1, "General Support"));
        workflow.setPriorityAndSla(ticket, Priority.MEDIUM, 8);
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);

        boolean firstLevelCanResolve = askYesNo(scanner, "Can first level support resolve this ticket? (y/n): ");
        if (firstLevelCanResolve) {
            workflow.addSolution(ticket, agent, "Resolved by first level support.");
        } else {
            workflow.escalateToSpecialist(ticket, specialist);
            workflow.investigateRootCause(ticket, specialist, "Root cause reviewed by specialist.");

            boolean vendorNeeded = askYesNo(scanner, "Is vendor support needed? (y/n): ");
            if (vendorNeeded) {
                workflow.openVendorRequest(ticket, "External Vendor", "support@vendor.example");
                workflow.receiveVendorResponse(ticket, "Vendor provided a workaround.");
            }

            workflow.applyFix(ticket, specialist, "Applied fix or workaround.");
        }

        workflow.updateResolution(ticket);

        boolean accepted = askYesNo(scanner, "Does requester accept the resolution? (y/n): ");
        if (accepted) {
            workflow.closeTicket(ticket);
            workflow.sendSatisfactionSurvey(ticket, requester, 5, "Resolved successfully.");
        } else {
            workflow.reopenTicket(ticket);
            workflow.escalateToSupervisor(ticket, supervisor);
        }

        database.save(ticket);

        System.out.println();
        System.out.println("Final Ticket Summary");
        System.out.println("====================");
        System.out.println(ticket.summary());
    }

    private static boolean askYesNo(Scanner scanner, String prompt) {
        while (true) {
            System.out.print(prompt);
            String answer = scanner.nextLine().trim().toLowerCase();
            if (answer.equals("y") || answer.equals("yes")) {
                return true;
            }
            if (answer.equals("n") || answer.equals("no")) {
                return false;
            }
            System.out.println("Please answer y or n.");
        }
    }
}

final class TicketWorkflow {
    private int nextTicketId = 1000;

    void setNextTicketId(int nextTicketId) {
        this.nextTicketId = nextTicketId;
    }

    Ticket createTicket(User requester, String subject, String description) {
        Ticket ticket = new Ticket(requester, subject, description);
        ticket.addHistory("Ticket created by " + requester.fullName());
        return ticket;
    }

    boolean hasCompleteInformation(Ticket ticket) {
        return !ticket.getSubject().isBlank() && !ticket.getDescription().isBlank();
    }

    void generateTicketId(Ticket ticket) {
        ticket.setTicketId(nextTicketId++);
        ticket.addHistory("Ticket ID generated: " + ticket.getTicketId());
    }

    void classify(Ticket ticket, Category category) {
        ticket.setCategory(category);
        ticket.addHistory("Classified as " + category.name());
    }

    void setPriorityAndSla(Ticket ticket, Priority priority, int resolveHours) {
        ticket.setPriority(priority);
        ticket.setDueAt(LocalDateTime.now().plusHours(resolveHours));
        ticket.addHistory("Priority set to " + priority + " with " + resolveHours + " hour SLA");
    }

    void assignOwner(Ticket ticket, User assignee) {
        ticket.setAssignee(assignee);
        ticket.setStatus(TicketStatus.ASSIGNED);
        ticket.addHistory("Assigned to " + assignee.fullName());
    }

    void notifyRequesterAndAssignee(Ticket ticket) {
        ticket.addHistory("Notification sent to requester and assignee");
    }

    void addSolution(Ticket ticket, User author, String message) {
        ticket.addComment(new TicketComment(author, message, true));
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.addHistory("Solution added by " + author.fullName());
    }

    void escalateToSpecialist(Ticket ticket, User specialist) {
        ticket.setAssignee(specialist);
        ticket.setStatus(TicketStatus.ESCALATED);
        ticket.addHistory("Escalated to specialist: " + specialist.fullName());
    }

    void investigateRootCause(Ticket ticket, User specialist, String note) {
        ticket.addComment(new TicketComment(specialist, note, true));
        ticket.addHistory("Root cause investigated");
    }

    void openVendorRequest(Ticket ticket, String vendorName, String contactEmail) {
        ticket.setVendorEscalation(new VendorEscalation(vendorName, contactEmail));
        ticket.addHistory("Vendor request opened for " + vendorName);
    }

    void receiveVendorResponse(Ticket ticket, String response) {
        if (ticket.getVendorEscalation() != null) {
            ticket.getVendorEscalation().resolve(response);
            ticket.addHistory("Vendor response received");
        }
    }

    void applyFix(Ticket ticket, User author, String message) {
        ticket.addComment(new TicketComment(author, message, true));
        ticket.setStatus(TicketStatus.RESOLVED);
        ticket.addHistory("Fix or workaround applied");
    }

    void updateResolution(Ticket ticket) {
        ticket.addHistory("Resolution updated and requester confirmation requested");
    }

    void closeTicket(Ticket ticket) {
        ticket.setStatus(TicketStatus.CLOSED);
        ticket.setClosedAt(LocalDateTime.now());
        ticket.addHistory("Ticket closed");
    }

    void sendSatisfactionSurvey(Ticket ticket, User requester, int rating, String feedback) {
        ticket.setSatisfactionSurvey(new SatisfactionSurvey(requester, rating, feedback));
        ticket.addHistory("Satisfaction survey sent and submitted");
    }

    void reopenTicket(Ticket ticket) {
        ticket.setStatus(TicketStatus.REOPENED);
        ticket.addHistory("Ticket reopened by requester");
    }

    void escalateToSupervisor(Ticket ticket, User supervisor) {
        ticket.setAssignee(supervisor);
        ticket.addHistory("Escalated to supervisor: " + supervisor.fullName());
    }
}

final class Ticket {
    private int ticketId;
    private final User requester;
    private User assignee;
    private Category category;
    private Priority priority;
    private TicketStatus status = TicketStatus.NEW;
    private final String subject;
    private String description;
    private final LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime dueAt;
    private LocalDateTime closedAt;
    private VendorEscalation vendorEscalation;
    private SatisfactionSurvey satisfactionSurvey;
    private final List<TicketComment> comments = new ArrayList<>();
    private final List<String> history = new ArrayList<>();

    Ticket(User requester, String subject, String description) {
        this.requester = requester;
        this.subject = subject;
        this.description = description;
    }

    int getTicketId() {
        return ticketId;
    }

    void setTicketId(int ticketId) {
        this.ticketId = ticketId;
    }

    String getSubject() {
        return subject == null ? "" : subject;
    }

    String getDescription() {
        return description == null ? "" : description;
    }

    User getRequester() {
        return requester;
    }

    User getAssignee() {
        return assignee;
    }

    Category getCategory() {
        return category;
    }

    Priority getPriority() {
        return priority;
    }

    TicketStatus getStatus() {
        return status;
    }

    LocalDateTime getCreatedAt() {
        return createdAt;
    }

    LocalDateTime getDueAt() {
        return dueAt;
    }

    LocalDateTime getClosedAt() {
        return closedAt;
    }

    void setDescription(String description) {
        this.description = description;
        addHistory("Ticket details updated");
    }

    void setCategory(Category category) {
        this.category = category;
    }

    void setPriority(Priority priority) {
        this.priority = priority;
    }

    void setStatus(TicketStatus status) {
        this.status = status;
    }

    void setAssignee(User assignee) {
        this.assignee = assignee;
    }

    void setDueAt(LocalDateTime dueAt) {
        this.dueAt = dueAt;
    }

    void setClosedAt(LocalDateTime closedAt) {
        this.closedAt = closedAt;
    }

    VendorEscalation getVendorEscalation() {
        return vendorEscalation;
    }

    void setVendorEscalation(VendorEscalation vendorEscalation) {
        this.vendorEscalation = vendorEscalation;
    }

    void setSatisfactionSurvey(SatisfactionSurvey satisfactionSurvey) {
        this.satisfactionSurvey = satisfactionSurvey;
    }

    void addComment(TicketComment comment) {
        comments.add(comment);
    }

    void addHistory(String event) {
        history.add(LocalDateTime.now() + " - " + event);
    }

    String summary() {
        StringBuilder builder = new StringBuilder();
        builder.append("ID: ").append(ticketId).append(System.lineSeparator());
        builder.append("Subject: ").append(getSubject()).append(System.lineSeparator());
        builder.append("Requester: ").append(requester.fullName()).append(System.lineSeparator());
        builder.append("Assignee: ").append(assignee == null ? "Unassigned" : assignee.fullName()).append(System.lineSeparator());
        builder.append("Category: ").append(category == null ? "Unclassified" : category.name()).append(System.lineSeparator());
        builder.append("Priority: ").append(priority == null ? "Unset" : priority).append(System.lineSeparator());
        builder.append("Status: ").append(status).append(System.lineSeparator());
        builder.append("Created At: ").append(createdAt).append(System.lineSeparator());
        builder.append("Due At: ").append(dueAt == null ? "Unset" : dueAt).append(System.lineSeparator());
        builder.append("Closed At: ").append(closedAt == null ? "Not closed" : closedAt).append(System.lineSeparator());
        if (vendorEscalation != null) {
            builder.append("Vendor: ").append(vendorEscalation.summary()).append(System.lineSeparator());
        }
        if (satisfactionSurvey != null) {
            builder.append("Survey: ").append(satisfactionSurvey.summary()).append(System.lineSeparator());
        }
        builder.append(System.lineSeparator()).append("Comments").append(System.lineSeparator());
        if (comments.isEmpty()) {
            builder.append("- No comments").append(System.lineSeparator());
        } else {
            for (TicketComment comment : comments) {
                builder.append("- ").append(comment.summary()).append(System.lineSeparator());
            }
        }
        builder.append(System.lineSeparator()).append("History").append(System.lineSeparator());
        for (String event : history) {
            builder.append("- ").append(event).append(System.lineSeparator());
        }
        return builder.toString();
    }
}

record User(int id, String fullName, String email, Role role) {
}

record Category(int id, String name) {
}

record TicketComment(User author, String text, boolean internal) {
    String summary() {
        String visibility = internal ? "internal" : "public";
        return "[" + visibility + "] " + author.fullName() + ": " + text;
    }
}

final class VendorEscalation {
    private final String vendorName;
    private final String contactEmail;
    private final LocalDateTime escalatedAt = LocalDateTime.now();
    private LocalDateTime resolvedAt;
    private String response;

    VendorEscalation(String vendorName, String contactEmail) {
        this.vendorName = vendorName;
        this.contactEmail = contactEmail;
    }

    void resolve(String response) {
        this.response = response;
        this.resolvedAt = LocalDateTime.now();
    }

    String summary() {
        return vendorName + " <" + contactEmail + ">, escalatedAt=" + escalatedAt
                + ", resolvedAt=" + (resolvedAt == null ? "pending" : resolvedAt)
                + ", response=" + (response == null ? "pending" : response);
    }
}

record SatisfactionSurvey(User requester, int rating, String feedback) {
    String summary() {
        return "rating=" + rating + ", requester=" + requester.fullName() + ", feedback=" + feedback;
    }
}

enum Role {
    REQUESTER,
    SUPPORT_AGENT,
    SPECIALIST,
    SUPERVISOR
}

enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL
}

enum TicketStatus {
    NEW,
    ASSIGNED,
    ESCALATED,
    RESOLVED,
    REOPENED,
    CLOSED
}
