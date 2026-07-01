# Ticket Management Java Application

This Java CLI application was created from the Ticket Management diagrams:

- `ticket-management-flowchart.puml`
- `ticket-management-er.puml`

## Run

From this folder:

```powershell
.\run-ticket-app.cmd
```

To open the graphical form:

```powershell
.\run-ticket-gui.cmd
```

To run the web application:

```powershell
.\run-ticket-web.cmd
```

Then open:

```text
http://localhost:8080
```

The GUI saves tickets to a SQLite database:

```text
data/tickets.db
```

Or compile and run manually:

```powershell
javac -encoding UTF-8 -d out src\main\java\com\example\ticket\*.java
java -Dfile.encoding=UTF-8 -cp "out;lib\sqlite-jdbc.jar" com.example.ticket.Main
```

## What It Implements

The application follows the flow chart:

1. Create ticket
2. Validate information
3. Generate ticket ID
4. Classify category
5. Set priority and SLA
6. Assign support owner
7. Resolve at first level or escalate to specialist/vendor
8. Request confirmation
9. Close ticket with survey or reopen and escalate to supervisor

The domain objects map to the ER diagram, including `User`, `Ticket`, `Category`, `Priority`, `TicketComment`, `VendorEscalation`, and `SatisfactionSurvey`.

## GUI Form

The Swing GUI lets users enter ticket details, choose category, priority, SLA hours, and select the workflow branch with checkboxes. The result panel shows the generated ticket summary and history.

The `List View` tab loads saved tickets from SQLite. Select a row to view the full saved ticket summary.

## Pantip Monitor

The `Pantip Monitor` tab stores keywords in SQLite and can search Pantip for matching topics.

Workflow:

1. Open `Pantip Monitor`.
2. Enter a keyword and click `Add`.
3. Select the keyword and click `Search Selected Keyword`.
4. Select an imported topic.
5. Click `Create Ticket from Topic`.

Imported topics are saved in SQLite and linked to the ticket ID after a ticket is created.
