# PlantUML Demo and Ticket Management Application

This project contains PlantUML diagrams and a Java Ticket Management application generated from the diagrams.

The application supports:

- CLI ticket workflow
- Java Swing desktop GUI
- Lightweight Java web application
- SQLite storage
- Project requirement view
- Ticket list view
- Pantip keyword monitor
- Social monitor for multiple sources
- Importing Pantip topics and creating tickets from imported topics

## Requirements

- Windows PowerShell or Command Prompt
- JDK 21 or newer
- Internet access for Pantip search

Included local dependencies:

- `plantuml.jar`
- `lib/sqlite-jdbc.jar`

## Project Structure

```text
.
+-- src/main/java/com/example/ticket/
|   +-- Main.java
|   +-- GuiMain.java
|   +-- WebMain.java
|   +-- TicketDatabase.java
|   +-- PantipSearchClient.java
+-- data/tickets.db
+-- lib/sqlite-jdbc.jar
+-- run-ticket-app.cmd
+-- run-ticket-gui.cmd
+-- run-ticket-web.cmd
+-- plantuml.cmd
+-- plantuml.jar
+-- *.puml
```

## Build

Compile all Java sources:

```powershell
javac -encoding UTF-8 -d out src\main\java\com\example\ticket\*.java
```

The compiled `.class` files are written to:

```text
out/
```

## Release Testing

Before releasing, run the checklist in:

```text
RELEASE_TEST.md
```

At minimum, verify:

- Build passes
- Web app starts
- Projects page opens
- Create Ticket works
- List View detail page opens
- Assignment works
- Follow up works
- Close ticket works
- Ticket history is recorded
- Private customer conversation works
- Duplicate feed ticket opens reuse the existing ticket and show source references
- Pantip Monitor imports without duplicates
- Social Monitor imports without duplicates

## Run CLI Application

```powershell
.\run-ticket-app.cmd
```

Manual command:

```powershell
java -Dfile.encoding=UTF-8 -Dsun.jnu.encoding=UTF-8 -cp "out;lib\sqlite-jdbc.jar" com.example.ticket.Main
```

## Run Desktop GUI

```powershell
.\run-ticket-gui.cmd
```

The GUI includes:

- Create Ticket
- List View
- Pantip Monitor

## Run Web Application

```powershell
.\run-ticket-web.cmd
```

Then open:

```text
http://localhost:8080
```

Web pages:

- `http://localhost:8080/` - Create Ticket
- `http://localhost:8080/projects` - Projects
- `http://localhost:8080/projects/APL-RYP-PAYMENT` - APL/RYP payment requirement
- `http://localhost:8080/tickets` - List View
- `http://localhost:8080/pantip` - Pantip Monitor
- `http://localhost:8080/social` - Social Monitor

In `List View`, click a ticket subject to open the detail page. The detail page shows ticket metadata, description, summary/history, and an assignment form for assigning the ticket to another person or team.

List/feed pages show 10 items per page and support pagination with `?page=1`, `?page=2`, and so on.

The detail page also supports:

- Follow-up notes
- Closing a ticket with a closure note
- Structured ticket history
- Private customer conversation messages
- Source references from Pantip/Social feed records

When a Pantip topic or social post already has a linked ticket, clicking the action button opens the existing ticket instead of creating a duplicate. The detail page shows the original source reference and records the duplicate open attempt in Ticket History.

## Deploy Locally

For this lightweight version, deployment means copying the project folder to a Windows machine with JDK installed.

Minimum files/folders required:

```text
src/
lib/sqlite-jdbc.jar
run-ticket-web.cmd
run-ticket-gui.cmd
run-ticket-app.cmd
```

Optional but useful:

```text
data/tickets.db
*.puml
*.png
plantuml.jar
plantuml.cmd
```

Steps:

1. Copy the project folder to the target machine.
2. Confirm Java is available:

   ```powershell
   java -version
   javac -version
   ```

3. Start the web app:

   ```powershell
   .\run-ticket-web.cmd
   ```

4. Open:

   ```text
   http://localhost:8080
   ```

## Deploy To Free Hosting

Recommended free-hosting path for this project: Render Web Service with Docker.

This app is a Java server application, so static hosting such as GitHub Pages is not enough. The project includes:

- `Dockerfile` - builds and runs the Java web app
- `.dockerignore` - keeps local build/database/image files out of the Docker context
- `render.yaml` - Render blueprint for a free Docker web service

Important SQLite note:

- Free hosting can restart or recreate the container.
- The included SQLite file is good for demo/testing.
- For production data, move from SQLite to a hosted database such as Postgres.

Deploy steps:

1. Create a GitHub repository.
2. Push this project to GitHub.
3. Open Render and choose `New` -> `Blueprint` or `Web Service`.
4. Connect the GitHub repository.
5. If using Blueprint, Render reads `render.yaml`.
6. If creating manually, choose:

   ```text
   Runtime: Docker
   Plan: Free
   Health Check Path: /
   ```

7. Add environment variable if it is not already set by the blueprint:

   ```text
   SQLITE_DB_FILE=/app/data/tickets.db
   ```

8. Deploy.
9. Open the public Render URL after the build finishes.

Render sets the `PORT` environment variable automatically. The app reads `PORT`, and falls back to `8080` when running locally.

Local Docker test before deploy:

```powershell
docker build -t ticket-management-app .
docker run --rm -p 8080:8080 ticket-management-app
```

Then open:

```text
http://localhost:8080
```

## SQLite Database

The app stores data in:

```text
data/tickets.db
```

Tables are created automatically on startup:

- `tickets`
- `projects`
- `ticket_history`
- `ticket_messages`
- `keywords`
- `pantip_topics`
- `social_posts`

Pantip topics use `topic_id` as the unique key. If a topic was already imported, the app skips it and only imports new topics.

## Pantip Monitor Workflow

1. Open `Pantip Monitor`.
2. Add a keyword.
3. Search the selected keyword.
4. The app imports new Pantip topics into SQLite.
5. Existing topics are skipped by `topic_id`.
6. Select an imported topic.
7. Create a ticket from that topic.
8. Click the same topic action again to open the existing ticket and review its source reference/history.

Imported topic data includes:

- Topic ID
- Keyword
- Title
- URL
- Captured content/snippet
- Linked ticket ID, if a ticket was created

## Social Monitor Workflow

The `Social Monitor` page stores posts from multiple sources in a generic `social_posts` table.

Currently supported sources:

- `PANTIP`
- `REDDIT`

Workflow:

1. Open `http://localhost:8080/social`.
2. Select a source.
3. Enter a keyword.
4. Click `Search and Import New Posts`.
5. New posts are imported into SQLite.
6. Existing posts are skipped by `source + external_id`.
7. Click `Create Ticket` to create a ticket from an imported post.

Future sources such as Facebook, Instagram, X, YouTube, or TikTok should be connected through their official APIs and can reuse the same `social_posts` table.

## Render PlantUML Diagrams

Render one diagram:

```powershell
.\plantuml.cmd ticket-management-flowchart.puml
```

Render all diagrams:

```powershell
.\plantuml.cmd *.puml
```

Useful diagram files:

- `ticket-management-flowchart.puml`
- `ticket-management-er.puml`
- `ticket-management-usecase.puml`
- `ticket-management-sequence.puml`
- `ticket-management-activity.puml`
- `ticket-management-state.puml`

## Draw.io File

The flow chart was also converted to draw.io format:

```text
ticket-management-flowchart.drawio
```

Open it with:

```text
https://app.diagrams.net
```

## Encoding Notes

Scripts use UTF-8:

- `chcp 65001`
- `javac -encoding UTF-8`
- `java -Dfile.encoding=UTF-8`

This helps Thai text display and persist correctly in Java, SQLite, and the web app.
