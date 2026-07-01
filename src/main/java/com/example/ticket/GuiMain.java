package com.example.ticket;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GraphicsEnvironment;
import java.awt.Insets;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.plaf.FontUIResource;
import javax.swing.table.DefaultTableModel;

public class GuiMain {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            setSystemLookAndFeel();
            setThaiFriendlyFont();
            new TicketFrame().setVisible(true);
        });
    }

    private static void setSystemLookAndFeel() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {
            // Default Swing look and feel is fine if the system one is unavailable.
        }
    }

    private static void setThaiFriendlyFont() {
        String fontName = chooseAvailableFont("Tahoma", "Leelawadee UI", "Segoe UI", "Arial");
        FontUIResource font = new FontUIResource(fontName, Font.PLAIN, 14);
        for (Object key : UIManager.getDefaults().keySet()) {
            Object value = UIManager.get(key);
            if (value instanceof FontUIResource) {
                UIManager.put(key, font);
            }
        }
    }

    private static String chooseAvailableFont(String... candidates) {
        List<String> fonts = List.of(GraphicsEnvironment.getLocalGraphicsEnvironment()
                .getAvailableFontFamilyNames());
        for (String candidate : candidates) {
            if (fonts.contains(candidate)) {
                return candidate;
            }
        }
        return Font.SANS_SERIF;
    }
}

final class TicketFrame extends JFrame {
    private final TicketWorkflow workflow = new TicketWorkflow();
    private final TicketDatabase database = new TicketDatabase();
    private final JTextField requesterNameField = new JTextField("Demo Requester");
    private final JTextField requesterEmailField = new JTextField("requester@example.com");
    private final JTextField subjectField = new JTextField();
    private final JTextArea descriptionArea = new JTextArea(5, 30);
    private final JComboBox<String> categoryBox = new JComboBox<>(new String[] {
            "General Support", "Hardware", "Software", "Network", "Billing"
    });
    private final JComboBox<Priority> priorityBox = new JComboBox<>(Priority.values());
    private final JComboBox<Integer> slaBox = new JComboBox<>(new Integer[] { 4, 8, 24, 48, 72 });
    private final JCheckBox firstLevelResolvedBox = new JCheckBox("First level support can resolve", true);
    private final JCheckBox vendorNeededBox = new JCheckBox("Vendor support needed");
    private final JCheckBox requesterAcceptedBox = new JCheckBox("Requester accepts resolution", true);
    private final JTextArea resultArea = new JTextArea();
    private final DefaultTableModel ticketTableModel = new DefaultTableModel(
            new String[] { "ID", "Subject", "Requester", "Category", "Priority", "Status", "Created At" }, 0) {
        @Override
        public boolean isCellEditable(int row, int column) {
            return false;
        }
    };
    private final JTable ticketTable = new JTable(ticketTableModel);
    private final JTextArea listDetailArea = new JTextArea();
    private final PantipSearchClient pantipSearchClient = new PantipSearchClient();
    private final JTextField keywordField = new JTextField();
    private final DefaultTableModel keywordTableModel = new DefaultTableModel(new String[] { "Keyword" }, 0) {
        @Override
        public boolean isCellEditable(int row, int column) {
            return false;
        }
    };
    private final JTable keywordTable = new JTable(keywordTableModel);
    private final DefaultTableModel pantipTableModel = new DefaultTableModel(
            new String[] { "Topic ID", "Keyword", "Title", "Status", "Ticket ID", "URL" }, 0) {
        @Override
        public boolean isCellEditable(int row, int column) {
            return false;
        }
    };
    private final JTable pantipTable = new JTable(pantipTableModel);
    private final JTextArea pantipDetailArea = new JTextArea();

    TicketFrame() {
        super("Ticket Management");
        workflow.setNextTicketId(database.nextTicketId());
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(920, 680));
        setLocationByPlatform(true);

        JPanel content = new JPanel(new BorderLayout(16, 16));
        content.setBorder(BorderFactory.createEmptyBorder(16, 16, 16, 16));
        content.setBackground(new Color(245, 247, 250));

        content.add(header(), BorderLayout.NORTH);
        content.add(tabs(), BorderLayout.CENTER);

        setContentPane(content);
        refreshKeywords();
        refreshPantipTopics();
        refreshTicketList();
        pack();
    }

    private JPanel header() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setOpaque(false);

        JLabel title = new JLabel("Ticket Management");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 24f));
        JLabel subtitle = new JLabel("Create a ticket from the diagram workflow");
        subtitle.setForeground(new Color(71, 85, 105));

        panel.add(title, BorderLayout.NORTH);
        panel.add(subtitle, BorderLayout.SOUTH);
        return panel;
    }

    private JTabbedPane tabs() {
        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Create Ticket", createTicketTab());
        tabs.addTab("List View", listViewTab());
        tabs.addTab("Pantip Monitor", pantipMonitorTab());
        return tabs;
    }

    private JPanel createTicketTab() {
        JPanel panel = new JPanel(new BorderLayout(16, 16));
        panel.setOpaque(false);
        panel.setBorder(BorderFactory.createEmptyBorder(12, 0, 0, 0));
        panel.add(formPanel(), BorderLayout.WEST);
        panel.add(resultPanel(), BorderLayout.CENTER);
        panel.add(actions(), BorderLayout.SOUTH);
        return panel;
    }

    private JPanel pantipMonitorTab() {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setOpaque(false);
        panel.setBorder(BorderFactory.createEmptyBorder(12, 0, 0, 0));

        JPanel keywordPanel = new JPanel(new BorderLayout(8, 8));
        keywordPanel.setOpaque(false);
        keywordPanel.setPreferredSize(new Dimension(280, 0));
        keywordPanel.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                BorderFactory.createEmptyBorder(12, 12, 12, 12)));

        JPanel keywordForm = new JPanel(new BorderLayout(8, 8));
        keywordForm.setOpaque(false);
        JButton saveKeywordButton = new JButton("Add");
        saveKeywordButton.addActionListener(event -> saveKeyword());
        keywordForm.add(keywordField, BorderLayout.CENTER);
        keywordForm.add(saveKeywordButton, BorderLayout.EAST);

        JButton searchButton = new JButton("Search Selected Keyword");
        searchButton.addActionListener(event -> searchSelectedKeyword());

        keywordTable.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
        keywordTable.setRowHeight(26);
        JPanel keywordHeader = new JPanel(new BorderLayout(8, 8));
        keywordHeader.setOpaque(false);
        keywordHeader.add(new JLabel("Keywords"), BorderLayout.NORTH);
        keywordHeader.add(keywordForm, BorderLayout.CENTER);
        keywordPanel.add(keywordHeader, BorderLayout.NORTH);
        keywordPanel.add(new JScrollPane(keywordTable), BorderLayout.CENTER);
        keywordPanel.add(searchButton, BorderLayout.SOUTH);

        pantipTable.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
        pantipTable.setRowHeight(26);
        pantipTable.setAutoCreateRowSorter(true);
        pantipTable.getColumnModel().getColumn(0).setPreferredWidth(80);
        pantipTable.getColumnModel().getColumn(2).setPreferredWidth(320);
        pantipTable.getColumnModel().getColumn(5).setPreferredWidth(260);
        pantipTable.getSelectionModel().addListSelectionListener(event -> {
            if (!event.getValueIsAdjusting()) {
                showSelectedPantipTopic();
            }
        });

        pantipDetailArea.setEditable(false);
        pantipDetailArea.setLineWrap(true);
        pantipDetailArea.setWrapStyleWord(true);
        pantipDetailArea.setFont(new Font("Tahoma", Font.PLAIN, 14));

        JButton refreshButton = new JButton("Refresh");
        refreshButton.addActionListener(event -> {
            refreshKeywords();
            refreshPantipTopics();
        });

        JButton createTicketButton = new JButton("Create Ticket from Topic");
        createTicketButton.addActionListener(event -> createTicketFromSelectedPantipTopic());

        JPanel topicToolbar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        topicToolbar.setOpaque(false);
        topicToolbar.add(refreshButton);
        topicToolbar.add(createTicketButton);

        JSplitPane topicSplit = new JSplitPane(JSplitPane.VERTICAL_SPLIT,
                new JScrollPane(pantipTable),
                new JScrollPane(pantipDetailArea));
        topicSplit.setResizeWeight(0.62);

        JPanel topicPanel = new JPanel(new BorderLayout(8, 8));
        topicPanel.setOpaque(false);
        topicPanel.add(topicToolbar, BorderLayout.NORTH);
        topicPanel.add(topicSplit, BorderLayout.CENTER);

        panel.add(keywordPanel, BorderLayout.WEST);
        panel.add(topicPanel, BorderLayout.CENTER);
        return panel;
    }

    private JPanel listViewTab() {
        JPanel panel = new JPanel(new BorderLayout(12, 12));
        panel.setOpaque(false);
        panel.setBorder(BorderFactory.createEmptyBorder(12, 0, 0, 0));

        ticketTable.setSelectionMode(javax.swing.ListSelectionModel.SINGLE_SELECTION);
        ticketTable.setRowHeight(26);
        ticketTable.setAutoCreateRowSorter(true);
        ticketTable.getColumnModel().getColumn(0).setPreferredWidth(60);
        ticketTable.getColumnModel().getColumn(1).setPreferredWidth(220);
        ticketTable.getColumnModel().getColumn(5).setPreferredWidth(90);
        ticketTable.getSelectionModel().addListSelectionListener(event -> {
            if (!event.getValueIsAdjusting()) {
                showSelectedTicket();
            }
        });

        listDetailArea.setEditable(false);
        listDetailArea.setFont(new Font("Tahoma", Font.PLAIN, 14));

        JSplitPane splitPane = new JSplitPane(JSplitPane.VERTICAL_SPLIT,
                new JScrollPane(ticketTable),
                new JScrollPane(listDetailArea));
        splitPane.setResizeWeight(0.55);

        JButton refreshButton = new JButton("Refresh");
        refreshButton.addActionListener(event -> refreshTicketList());

        JPanel toolbar = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        toolbar.setOpaque(false);
        toolbar.add(refreshButton);

        panel.add(toolbar, BorderLayout.NORTH);
        panel.add(splitPane, BorderLayout.CENTER);
        return panel;
    }

    private JPanel formPanel() {
        JPanel panel = new JPanel(new GridBagLayout());
        panel.setPreferredSize(new Dimension(380, 0));
        panel.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                BorderFactory.createEmptyBorder(14, 14, 14, 14)));
        panel.setBackground(Color.WHITE);

        descriptionArea.setLineWrap(true);
        descriptionArea.setWrapStyleWord(true);
        priorityBox.setSelectedItem(Priority.MEDIUM);

        vendorNeededBox.setEnabled(false);
        firstLevelResolvedBox.addActionListener(event -> vendorNeededBox.setEnabled(!firstLevelResolvedBox.isSelected()));

        int row = 0;
        addField(panel, row++, "Requester name", requesterNameField);
        addField(panel, row++, "Requester email", requesterEmailField);
        addField(panel, row++, "Subject", subjectField);
        addField(panel, row++, "Description", new JScrollPane(descriptionArea));
        addField(panel, row++, "Category", categoryBox);
        addField(panel, row++, "Priority", priorityBox);
        addField(panel, row++, "SLA hours", slaBox);
        addWide(panel, row++, firstLevelResolvedBox);
        addWide(panel, row++, vendorNeededBox);
        addWide(panel, row, requesterAcceptedBox);

        return panel;
    }

    private JScrollPane resultPanel() {
        resultArea.setEditable(false);
        resultArea.setLineWrap(false);
        resultArea.setFont(new Font("Tahoma", Font.PLAIN, 14));
        resultArea.setText("Fill the form and click Create Ticket.");

        JScrollPane scrollPane = new JScrollPane(resultArea);
        scrollPane.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(203, 213, 225)),
                BorderFactory.createEmptyBorder(8, 8, 8, 8)));
        return scrollPane;
    }

    private JPanel actions() {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 0));
        panel.setOpaque(false);

        JButton clearButton = new JButton("Clear");
        clearButton.addActionListener(event -> clearForm());

        JButton createButton = new JButton("Create Ticket");
        createButton.addActionListener(event -> createTicket());

        panel.add(clearButton);
        panel.add(createButton);
        return panel;
    }

    private void createTicket() {
        String requesterName = requesterNameField.getText().trim();
        String requesterEmail = requesterEmailField.getText().trim();
        String subject = subjectField.getText().trim();
        String description = descriptionArea.getText().trim();

        if (requesterName.isBlank() || requesterEmail.isBlank() || subject.isBlank() || description.isBlank()) {
            JOptionPane.showMessageDialog(this, "Please fill requester, subject, and description.",
                    "Missing Information", JOptionPane.WARNING_MESSAGE);
            return;
        }

        User requester = new User(1, requesterName, requesterEmail, Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        User specialist = new User(3, "Specialist Team", "specialist@example.com", Role.SPECIALIST);
        User supervisor = new User(4, "Supervisor", "supervisor@example.com", Role.SUPERVISOR);

        Ticket ticket = workflow.createTicket(requester, subject, description);
        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(categoryBox.getSelectedIndex() + 1, (String) categoryBox.getSelectedItem()));
        workflow.setPriorityAndSla(ticket, (Priority) priorityBox.getSelectedItem(), (Integer) slaBox.getSelectedItem());
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);

        if (firstLevelResolvedBox.isSelected()) {
            workflow.addSolution(ticket, agent, "Resolved by first level support.");
        } else {
            workflow.escalateToSpecialist(ticket, specialist);
            workflow.investigateRootCause(ticket, specialist, "Root cause reviewed by specialist.");
            if (vendorNeededBox.isSelected()) {
                workflow.openVendorRequest(ticket, "External Vendor", "support@vendor.example");
                workflow.receiveVendorResponse(ticket, "Vendor provided a workaround.");
            }
            workflow.applyFix(ticket, specialist, "Applied fix or workaround.");
        }

        workflow.updateResolution(ticket);
        if (requesterAcceptedBox.isSelected()) {
            workflow.closeTicket(ticket);
            workflow.sendSatisfactionSurvey(ticket, requester, 5, "Resolved successfully.");
        } else {
            workflow.reopenTicket(ticket);
            workflow.escalateToSupervisor(ticket, supervisor);
        }

        database.save(ticket);
        resultArea.setText(ticket.summary());
        resultArea.setCaretPosition(0);
        refreshTicketList();
        workflow.setNextTicketId(database.nextTicketId());
    }

    private void refreshTicketList() {
        ticketTableModel.setRowCount(0);
        for (TicketListItem ticket : database.findAll()) {
            ticketTableModel.addRow(new Object[] {
                    ticket.ticketId(),
                    ticket.subject(),
                    ticket.requesterName(),
                    ticket.category(),
                    ticket.priority(),
                    ticket.status(),
                    ticket.createdAt()
            });
        }
        if (ticketTableModel.getRowCount() == 0) {
            listDetailArea.setText("No tickets found. Create a ticket first.");
        }
    }

    private void showSelectedTicket() {
        int selectedRow = ticketTable.getSelectedRow();
        if (selectedRow < 0) {
            return;
        }
        int modelRow = ticketTable.convertRowIndexToModel(selectedRow);
        int ticketId = (Integer) ticketTableModel.getValueAt(modelRow, 0);
        listDetailArea.setText(database.findSummary(ticketId));
        listDetailArea.setCaretPosition(0);
    }

    private void clearForm() {
        requesterNameField.setText("Demo Requester");
        requesterEmailField.setText("requester@example.com");
        subjectField.setText("");
        descriptionArea.setText("");
        categoryBox.setSelectedIndex(0);
        priorityBox.setSelectedItem(Priority.MEDIUM);
        slaBox.setSelectedItem(8);
        firstLevelResolvedBox.setSelected(true);
        vendorNeededBox.setSelected(false);
        vendorNeededBox.setEnabled(false);
        requesterAcceptedBox.setSelected(true);
        resultArea.setText("Fill the form and click Create Ticket.");
    }

    private void saveKeyword() {
        String keyword = keywordField.getText().trim();
        if (keyword.isBlank()) {
            JOptionPane.showMessageDialog(this, "Please enter keyword.", "Missing Keyword", JOptionPane.WARNING_MESSAGE);
            return;
        }
        database.saveKeyword(keyword);
        keywordField.setText("");
        refreshKeywords();
    }

    private void refreshKeywords() {
        keywordTableModel.setRowCount(0);
        for (String keyword : database.findKeywords()) {
            keywordTableModel.addRow(new Object[] { keyword });
        }
    }

    private void searchSelectedKeyword() {
        int selectedRow = keywordTable.getSelectedRow();
        if (selectedRow < 0) {
            JOptionPane.showMessageDialog(this, "Please select a keyword first.", "No Keyword", JOptionPane.WARNING_MESSAGE);
            return;
        }
        int modelRow = keywordTable.convertRowIndexToModel(selectedRow);
        String keyword = (String) keywordTableModel.getValueAt(modelRow, 0);
        pantipDetailArea.setText("Searching Pantip for keyword: " + keyword + "\nPlease wait...");

        new SwingWorker<List<PantipTopic>, Void>() {
            @Override
            protected List<PantipTopic> doInBackground() throws Exception {
                return pantipSearchClient.search(keyword, 20);
            }

            @Override
            protected void done() {
                try {
                    List<PantipTopic> topics = get();
                    int importedCount = 0;
                    int skippedCount = 0;
                    for (PantipTopic topic : topics) {
                        if (database.pantipTopicExists(topic.topicId())) {
                            skippedCount++;
                            continue;
                        }
                        String content = pantipSearchClient.fetchTopicContent(topic.url());
                        database.savePantipTopic(new PantipTopic(
                                topic.topicId(),
                                topic.keyword(),
                                topic.title(),
                                topic.url(),
                                content));
                        importedCount++;
                    }
                    refreshPantipTopics();
                    pantipDetailArea.setText("Imported new " + importedCount
                            + " Pantip topic(s), skipped existing " + skippedCount
                            + " for keyword: " + keyword);
                } catch (Exception exception) {
                    pantipDetailArea.setText("Unable to search Pantip.\n\n" + exception.getMessage());
                    JOptionPane.showMessageDialog(TicketFrame.this,
                            "Unable to search Pantip: " + exception.getMessage(),
                            "Pantip Search Error",
                            JOptionPane.ERROR_MESSAGE);
                }
            }
        }.execute();
    }

    private void refreshPantipTopics() {
        pantipTableModel.setRowCount(0);
        for (PantipTopicRecord topic : database.findPantipTopics()) {
            pantipTableModel.addRow(new Object[] {
                    topic.topicId(),
                    topic.keyword(),
                    topic.title(),
                    topic.status(),
                    topic.ticketId(),
                    topic.url()
            });
        }
        if (pantipTableModel.getRowCount() == 0) {
            pantipDetailArea.setText("No Pantip topics imported yet. Add a keyword and click Search Selected Keyword.");
        }
    }

    private void showSelectedPantipTopic() {
        int selectedRow = pantipTable.getSelectedRow();
        if (selectedRow < 0) {
            return;
        }
        int modelRow = pantipTable.convertRowIndexToModel(selectedRow);
        String topicId = (String) pantipTableModel.getValueAt(modelRow, 0);
        String keyword = (String) pantipTableModel.getValueAt(modelRow, 1);
        String title = (String) pantipTableModel.getValueAt(modelRow, 2);
        String status = (String) pantipTableModel.getValueAt(modelRow, 3);
        Object ticketId = pantipTableModel.getValueAt(modelRow, 4);
        String url = (String) pantipTableModel.getValueAt(modelRow, 5);
        String content = findPantipContent(topicId);
        pantipDetailArea.setText("Topic ID: " + topicId
                + "\nKeyword: " + keyword
                + "\nStatus: " + status
                + "\nTicket ID: " + (ticketId == null ? "-" : ticketId)
                + "\nTitle: " + title
                + "\nURL: " + url
                + "\n\nContent:\n" + content);
    }

    private void createTicketFromSelectedPantipTopic() {
        int selectedRow = pantipTable.getSelectedRow();
        if (selectedRow < 0) {
            JOptionPane.showMessageDialog(this, "Please select a Pantip topic first.",
                    "No Topic", JOptionPane.WARNING_MESSAGE);
            return;
        }

        int modelRow = pantipTable.convertRowIndexToModel(selectedRow);
        String topicId = (String) pantipTableModel.getValueAt(modelRow, 0);
        String keyword = (String) pantipTableModel.getValueAt(modelRow, 1);
        String title = (String) pantipTableModel.getValueAt(modelRow, 2);
        Object existingTicketId = pantipTableModel.getValueAt(modelRow, 4);
        String url = (String) pantipTableModel.getValueAt(modelRow, 5);
        String content = findPantipContent(topicId);

        if (existingTicketId != null) {
            int confirm = JOptionPane.showConfirmDialog(this,
                    "This topic already has ticket " + existingTicketId + ". Create another ticket?",
                    "Ticket Exists",
                    JOptionPane.YES_NO_OPTION);
            if (confirm != JOptionPane.YES_OPTION) {
                return;
            }
        }

        User requester = new User(10, "Pantip Monitor", "pantip-monitor@example.com", Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        Ticket ticket = workflow.createTicket(requester, "[Pantip] " + title,
                "Keyword: " + keyword + System.lineSeparator()
                        + "Pantip topic ID: " + topicId + System.lineSeparator()
                        + "URL: " + url + System.lineSeparator()
                        + System.lineSeparator()
                        + "Content:" + System.lineSeparator()
                        + content);
        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(1, "General Support"));
        workflow.setPriorityAndSla(ticket, Priority.MEDIUM, 24);
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);
        ticket.addHistory("Created from Pantip topic " + topicId);

        database.save(ticket);
        database.markPantipTopicTicket(topicId, ticket.getTicketId());
        workflow.setNextTicketId(database.nextTicketId());
        refreshTicketList();
        refreshPantipTopics();
        pantipDetailArea.setText("Created ticket " + ticket.getTicketId() + " from Pantip topic " + topicId
                + "\n\n" + ticket.summary());
    }

    private String findPantipContent(String topicId) {
        for (PantipTopicRecord topic : database.findPantipTopics()) {
            if (topic.topicId().equals(topicId)) {
                return topic.content() == null || topic.content().isBlank()
                        ? "(No content captured)"
                        : topic.content();
            }
        }
        return "(Topic not found)";
    }

    private void addField(JPanel panel, int row, String labelText, java.awt.Component field) {
        GridBagConstraints labelConstraints = new GridBagConstraints();
        labelConstraints.gridx = 0;
        labelConstraints.gridy = row;
        labelConstraints.anchor = GridBagConstraints.WEST;
        labelConstraints.insets = new Insets(0, 0, 6, 8);
        panel.add(new JLabel(labelText), labelConstraints);

        GridBagConstraints fieldConstraints = new GridBagConstraints();
        fieldConstraints.gridx = 1;
        fieldConstraints.gridy = row;
        fieldConstraints.weightx = 1;
        fieldConstraints.fill = GridBagConstraints.HORIZONTAL;
        fieldConstraints.insets = new Insets(0, 0, 10, 0);
        panel.add(field, fieldConstraints);
    }

    private void addWide(JPanel panel, int row, java.awt.Component field) {
        GridBagConstraints constraints = new GridBagConstraints();
        constraints.gridx = 0;
        constraints.gridy = row;
        constraints.gridwidth = 2;
        constraints.weightx = 1;
        constraints.fill = GridBagConstraints.HORIZONTAL;
        constraints.insets = new Insets(2, 0, 8, 0);
        panel.add(field, constraints);
    }
}
