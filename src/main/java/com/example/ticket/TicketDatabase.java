package com.example.ticket;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

final class TicketDatabase {
    private static final String DATABASE_FILE = System.getenv().getOrDefault("SQLITE_DB_FILE", "data/tickets.db");
    private static final String DATABASE_URL = "jdbc:sqlite:" + DATABASE_FILE;

    TicketDatabase() {
        try {
            Class.forName("org.sqlite.JDBC");
            initialize();
        } catch (ClassNotFoundException exception) {
            throw new IllegalStateException("SQLite JDBC driver not found. Put sqlite-jdbc.jar in the lib folder.", exception);
        }
    }

    void initialize() {
        try {
            Path databasePath = Path.of(DATABASE_FILE).toAbsolutePath();
            Path parent = databasePath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to create data folder.", exception);
        }

        try (Connection connection = connect();
                Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    create table if not exists tickets (
                        ticket_id integer primary key,
                        subject text not null,
                        description text not null,
                        requester_name text not null,
                        requester_email text not null,
                        assignee_name text,
                        category text,
                        priority text,
                        status text not null,
                        created_at text not null,
                        due_at text,
                        closed_at text,
                        summary text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists keywords (
                        keyword text primary key,
                        created_at text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists pantip_topics (
                        topic_id text primary key,
                        keyword text not null,
                        title text not null,
                        url text not null,
                        content text,
                        imported_at text not null,
                        ticket_id integer,
                        status text not null default 'IMPORTED'
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists social_posts (
                        source text not null,
                        external_id text not null,
                        keyword text not null,
                        title text not null,
                        url text not null,
                        author text,
                        content text,
                        posted_at text,
                        imported_at text not null,
                        ticket_id integer,
                        status text not null default 'IMPORTED',
                        primary key (source, external_id)
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists ticket_history (
                        history_id integer primary key autoincrement,
                        ticket_id integer not null,
                        action text not null,
                        actor text not null,
                        note text,
                        created_at text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists ticket_messages (
                        message_id integer primary key autoincrement,
                        ticket_id integer not null,
                        sender_type text not null,
                        sender_name text not null,
                        message text not null,
                        created_at text not null
                    )
                    """);
            ensureColumn(connection, "pantip_topics", "content", "text");
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to initialize SQLite database.", exception);
        }
    }

    void save(Ticket ticket) {
        String sql = """
                insert into tickets (
                    ticket_id, subject, description, requester_name, requester_email,
                    assignee_name, category, priority, status, created_at, due_at, closed_at, summary
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(ticket_id) do update set
                    subject = excluded.subject,
                    description = excluded.description,
                    requester_name = excluded.requester_name,
                    requester_email = excluded.requester_email,
                    assignee_name = excluded.assignee_name,
                    category = excluded.category,
                    priority = excluded.priority,
                    status = excluded.status,
                    created_at = excluded.created_at,
                    due_at = excluded.due_at,
                    closed_at = excluded.closed_at,
                    summary = excluded.summary
                """;

        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticket.getTicketId());
            statement.setString(2, ticket.getSubject());
            statement.setString(3, ticket.getDescription());
            statement.setString(4, ticket.getRequester().fullName());
            statement.setString(5, ticket.getRequester().email());
            statement.setString(6, ticket.getAssignee() == null ? null : ticket.getAssignee().fullName());
            statement.setString(7, ticket.getCategory() == null ? null : ticket.getCategory().name());
            statement.setString(8, ticket.getPriority() == null ? null : ticket.getPriority().name());
            statement.setString(9, ticket.getStatus().name());
            statement.setString(10, ticket.getCreatedAt().toString());
            statement.setString(11, ticket.getDueAt() == null ? null : ticket.getDueAt().toString());
            statement.setString(12, ticket.getClosedAt() == null ? null : ticket.getClosedAt().toString());
            statement.setString(13, ticket.summary());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to save ticket.", exception);
        }
    }

    List<TicketListItem> findAll() {
        String sql = """
                select ticket_id, subject, requester_name, category, priority, status, created_at
                from tickets
                order by ticket_id desc
                """;
        List<TicketListItem> tickets = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                tickets.add(new TicketListItem(
                        resultSet.getInt("ticket_id"),
                        resultSet.getString("subject"),
                        resultSet.getString("requester_name"),
                        resultSet.getString("category"),
                        resultSet.getString("priority"),
                        resultSet.getString("status"),
                        resultSet.getString("created_at")));
            }
            return tickets;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load tickets.", exception);
        }
    }

    String findSummary(int ticketId) {
        String sql = "select summary from tickets where ticket_id = ?";
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getString("summary");
                }
                return "Ticket not found.";
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load ticket summary.", exception);
        }
    }

    TicketDetail findTicketDetail(int ticketId) {
        String sql = """
                select ticket_id, subject, description, requester_name, requester_email,
                       assignee_name, category, priority, status, created_at, due_at, closed_at, summary
                from tickets
                where ticket_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return null;
                }
                return new TicketDetail(
                        resultSet.getInt("ticket_id"),
                        resultSet.getString("subject"),
                        resultSet.getString("description"),
                        resultSet.getString("requester_name"),
                        resultSet.getString("requester_email"),
                        resultSet.getString("assignee_name"),
                        resultSet.getString("category"),
                        resultSet.getString("priority"),
                        resultSet.getString("status"),
                        resultSet.getString("created_at"),
                        resultSet.getString("due_at"),
                        resultSet.getString("closed_at"),
                        resultSet.getString("summary"));
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load ticket detail.", exception);
        }
    }

    void assignTicket(int ticketId, String assigneeName, String note) {
        TicketDetail detail = findTicketDetail(ticketId);
        if (detail == null) {
            throw new IllegalArgumentException("Ticket not found: " + ticketId);
        }

        String assignmentNote = "Assigned to " + assigneeName;
        if (note != null && !note.isBlank()) {
            assignmentNote += " - " + note.trim();
        }
        String updatedSummary = detail.summary()
                + System.lineSeparator()
                + "Assignment Update"
                + System.lineSeparator()
                + "- " + java.time.LocalDateTime.now() + " - " + assignmentNote
                + System.lineSeparator();

        String sql = """
                update tickets
                set assignee_name = ?,
                    status = 'ASSIGNED',
                    summary = ?
                where ticket_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, assigneeName);
            statement.setString(2, updatedSummary);
            statement.setInt(3, ticketId);
            statement.executeUpdate();
            addTicketHistory(ticketId, "ASSIGN", "System", assignmentNote);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to assign ticket.", exception);
        }
    }

    void addFollowUp(int ticketId, String note) {
        TicketDetail detail = findTicketDetail(ticketId);
        if (detail == null) {
            throw new IllegalArgumentException("Ticket not found: " + ticketId);
        }
        String updatedSummary = appendHistory(detail.summary(), "Follow Up", note);
        String sql = """
                update tickets
                set status = 'ASSIGNED',
                    summary = ?
                where ticket_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, updatedSummary);
            statement.setInt(2, ticketId);
            statement.executeUpdate();
            addTicketHistory(ticketId, "FOLLOW_UP", "Agent", note);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to add follow up.", exception);
        }
    }

    void closeTicket(int ticketId, String note) {
        TicketDetail detail = findTicketDetail(ticketId);
        if (detail == null) {
            throw new IllegalArgumentException("Ticket not found: " + ticketId);
        }
        String updatedSummary = appendHistory(detail.summary(), "Close Ticket", note);
        String sql = """
                update tickets
                set status = 'CLOSED',
                    closed_at = ?,
                    summary = ?
                where ticket_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, java.time.LocalDateTime.now().toString());
            statement.setString(2, updatedSummary);
            statement.setInt(3, ticketId);
            statement.executeUpdate();
            addTicketHistory(ticketId, "CLOSE", "Agent", note);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to close ticket.", exception);
        }
    }

    void addTicketHistory(int ticketId, String action, String actor, String note) {
        String sql = """
                insert into ticket_history (ticket_id, action, actor, note, created_at)
                values (?, ?, ?, ?, ?)
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            statement.setString(2, action);
            statement.setString(3, actor);
            statement.setString(4, note);
            statement.setString(5, java.time.LocalDateTime.now().toString());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to add ticket history.", exception);
        }
    }

    List<TicketHistoryItem> findTicketHistory(int ticketId) {
        String sql = """
                select history_id, ticket_id, action, actor, note, created_at
                from ticket_history
                where ticket_id = ?
                order by history_id desc
                """;
        List<TicketHistoryItem> items = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    items.add(new TicketHistoryItem(
                            resultSet.getInt("history_id"),
                            resultSet.getInt("ticket_id"),
                            resultSet.getString("action"),
                            resultSet.getString("actor"),
                            resultSet.getString("note"),
                            resultSet.getString("created_at")));
                }
            }
            return items;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load ticket history.", exception);
        }
    }

    void addPrivateMessage(int ticketId, String senderType, String senderName, String message) {
        String sql = """
                insert into ticket_messages (ticket_id, sender_type, sender_name, message, created_at)
                values (?, ?, ?, ?, ?)
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            statement.setString(2, senderType);
            statement.setString(3, senderName);
            statement.setString(4, message);
            statement.setString(5, java.time.LocalDateTime.now().toString());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to add private message.", exception);
        }
        addTicketHistory(ticketId, "PRIVATE_MESSAGE", senderName, senderType + ": " + message);
    }

    List<TicketMessageItem> findPrivateMessages(int ticketId) {
        String sql = """
                select message_id, ticket_id, sender_type, sender_name, message, created_at
                from ticket_messages
                where ticket_id = ?
                order by message_id asc
                """;
        List<TicketMessageItem> items = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    items.add(new TicketMessageItem(
                            resultSet.getInt("message_id"),
                            resultSet.getInt("ticket_id"),
                            resultSet.getString("sender_type"),
                            resultSet.getString("sender_name"),
                            resultSet.getString("message"),
                            resultSet.getString("created_at")));
                }
            }
            return items;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load private messages.", exception);
        }
    }

    private String appendHistory(String summary, String action, String note) {
        String cleanNote = note == null || note.isBlank() ? "(no note)" : note.trim();
        return summary
                + System.lineSeparator()
                + action
                + System.lineSeparator()
                + "- " + java.time.LocalDateTime.now() + " - " + cleanNote
                + System.lineSeparator();
    }

    int nextTicketId() {
        String sql = "select coalesce(max(ticket_id), 999) + 1 as next_id from tickets";
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            return resultSet.next() ? resultSet.getInt("next_id") : 1000;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load next ticket ID.", exception);
        }
    }

    void saveKeyword(String keyword) {
        String sql = """
                insert into keywords (keyword, created_at)
                values (?, datetime('now'))
                on conflict(keyword) do nothing
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, keyword.trim());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to save keyword.", exception);
        }
    }

    List<String> findKeywords() {
        List<String> keywords = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement("select keyword from keywords order by keyword");
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                keywords.add(resultSet.getString("keyword"));
            }
            return keywords;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load keywords.", exception);
        }
    }

    void savePantipTopic(PantipTopic topic) {
        String sql = """
                insert into pantip_topics (topic_id, keyword, title, url, content, imported_at, status)
                values (?, ?, ?, ?, ?, datetime('now'), 'IMPORTED')
                on conflict(topic_id) do update set
                    keyword = excluded.keyword,
                    title = excluded.title,
                    url = excluded.url,
                    content = excluded.content
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, topic.topicId());
            statement.setString(2, topic.keyword());
            statement.setString(3, topic.title());
            statement.setString(4, topic.url());
            statement.setString(5, topic.content());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to save Pantip topic.", exception);
        }
    }

    boolean pantipTopicExists(String topicId) {
        String sql = "select 1 from pantip_topics where topic_id = ?";
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, topicId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to check Pantip topic.", exception);
        }
    }

    List<PantipTopicRecord> findPantipTopics() {
        String sql = """
                select topic_id, keyword, title, url, content, imported_at, ticket_id, status
                from pantip_topics
                order by imported_at desc
                """;
        List<PantipTopicRecord> topics = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                topics.add(new PantipTopicRecord(
                        resultSet.getString("topic_id"),
                        resultSet.getString("keyword"),
                        resultSet.getString("title"),
                        resultSet.getString("url"),
                        resultSet.getString("content"),
                        resultSet.getString("imported_at"),
                        resultSet.getObject("ticket_id") == null ? null : resultSet.getInt("ticket_id"),
                        resultSet.getString("status")));
            }
            return topics;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load Pantip topics.", exception);
        }
    }

    void markPantipTopicTicket(String topicId, int ticketId) {
        String sql = "update pantip_topics set ticket_id = ?, status = 'TICKET_CREATED' where topic_id = ?";
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            statement.setString(2, topicId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to mark Pantip topic as ticket.", exception);
        }
    }

    void saveSocialPost(SocialPost post) {
        String sql = """
                insert into social_posts (
                    source, external_id, keyword, title, url, author, content, posted_at, imported_at, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'IMPORTED')
                on conflict(source, external_id) do nothing
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, post.source());
            statement.setString(2, post.externalId());
            statement.setString(3, post.keyword());
            statement.setString(4, post.title());
            statement.setString(5, post.url());
            statement.setString(6, post.author());
            statement.setString(7, post.content());
            statement.setString(8, post.postedAt());
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to save social post.", exception);
        }
    }

    boolean socialPostExists(String source, String externalId) {
        String sql = "select 1 from social_posts where source = ? and external_id = ?";
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, source);
            statement.setString(2, externalId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to check social post.", exception);
        }
    }

    List<SocialPostRecord> findSocialPosts() {
        String sql = """
                select source, external_id, keyword, title, url, author, content, posted_at,
                       imported_at, ticket_id, status
                from social_posts
                order by imported_at desc
                """;
        List<SocialPostRecord> posts = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                posts.add(new SocialPostRecord(
                        resultSet.getString("source"),
                        resultSet.getString("external_id"),
                        resultSet.getString("keyword"),
                        resultSet.getString("title"),
                        resultSet.getString("url"),
                        resultSet.getString("author"),
                        resultSet.getString("content"),
                        resultSet.getString("posted_at"),
                        resultSet.getString("imported_at"),
                        resultSet.getObject("ticket_id") == null ? null : resultSet.getInt("ticket_id"),
                        resultSet.getString("status")));
            }
            return posts;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load social posts.", exception);
        }
    }

    List<TicketReference> findTicketReferences(int ticketId) {
        List<TicketReference> references = new ArrayList<>();
        String pantipSql = """
                select 'PANTIP' as source, topic_id as external_id, keyword, title, url, content, imported_at
                from pantip_topics
                where ticket_id = ?
                order by imported_at desc
                """;
        String socialSql = """
                select source, external_id, keyword, title, url, content, imported_at
                from social_posts
                where ticket_id = ?
                order by imported_at desc
                """;
        try (Connection connection = connect()) {
            try (PreparedStatement statement = connection.prepareStatement(pantipSql)) {
                statement.setInt(1, ticketId);
                try (ResultSet resultSet = statement.executeQuery()) {
                    while (resultSet.next()) {
                        references.add(new TicketReference(
                                resultSet.getString("source"),
                                resultSet.getString("external_id"),
                                resultSet.getString("keyword"),
                                resultSet.getString("title"),
                                resultSet.getString("url"),
                                resultSet.getString("content"),
                                resultSet.getString("imported_at")));
                    }
                }
            }
            try (PreparedStatement statement = connection.prepareStatement(socialSql)) {
                statement.setInt(1, ticketId);
                try (ResultSet resultSet = statement.executeQuery()) {
                    while (resultSet.next()) {
                        references.add(new TicketReference(
                                resultSet.getString("source"),
                                resultSet.getString("external_id"),
                                resultSet.getString("keyword"),
                                resultSet.getString("title"),
                                resultSet.getString("url"),
                                resultSet.getString("content"),
                                resultSet.getString("imported_at")));
                    }
                }
            }
            return references;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load ticket references.", exception);
        }
    }

    void markSocialPostTicket(String source, String externalId, int ticketId) {
        String sql = """
                update social_posts
                set ticket_id = ?,
                    status = 'TICKET_CREATED'
                where source = ? and external_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, ticketId);
            statement.setString(2, source);
            statement.setString(3, externalId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to mark social post as ticket.", exception);
        }
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(DATABASE_URL);
    }

    private void ensureColumn(Connection connection, String tableName, String columnName, String columnType)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("pragma table_info(" + tableName + ")");
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                if (columnName.equalsIgnoreCase(resultSet.getString("name"))) {
                    return;
                }
            }
        }
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("alter table " + tableName + " add column " + columnName + " " + columnType);
        }
    }
}

record TicketListItem(
        int ticketId,
        String subject,
        String requesterName,
        String category,
        String priority,
        String status,
        String createdAt) {
}

record TicketDetail(
        int ticketId,
        String subject,
        String description,
        String requesterName,
        String requesterEmail,
        String assigneeName,
        String category,
        String priority,
        String status,
        String createdAt,
        String dueAt,
        String closedAt,
        String summary) {
}

record TicketHistoryItem(
        int historyId,
        int ticketId,
        String action,
        String actor,
        String note,
        String createdAt) {
}

record TicketMessageItem(
        int messageId,
        int ticketId,
        String senderType,
        String senderName,
        String message,
        String createdAt) {
}

record TicketReference(
        String source,
        String externalId,
        String keyword,
        String title,
        String url,
        String content,
        String importedAt) {
}

record PantipTopic(
        String topicId,
        String keyword,
        String title,
        String url,
        String content) {
}

record PantipTopicRecord(
        String topicId,
        String keyword,
        String title,
        String url,
        String content,
        String importedAt,
        Integer ticketId,
        String status) {
}

record SocialPost(
        String source,
        String externalId,
        String keyword,
        String title,
        String url,
        String author,
        String content,
        String postedAt) {
}

record SocialPostRecord(
        String source,
        String externalId,
        String keyword,
        String title,
        String url,
        String author,
        String content,
        String postedAt,
        String importedAt,
        Integer ticketId,
        String status) {
}
