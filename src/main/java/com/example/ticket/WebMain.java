package com.example.ticket;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class WebMain {
    public static void main(String[] args) throws IOException {
        int port = port();
        WebApplication app = new WebApplication();
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/", app::handle);
        server.setExecutor(null);
        server.start();
        System.out.println("Ticket web application is running at http://localhost:" + port);
    }

    private static int port() {
        String value = System.getenv().getOrDefault("PORT", "8080");
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException exception) {
            return 8080;
        }
    }
}

final class WebApplication {
    private static final String LOGIN_USER = "Supachai.h";
    private static final String LOGIN_PASSWORD = "12345678";
    private static final String SESSION_COOKIE = "APP_SESSION";
    private static final String SESSION_VALUE = "supachai-session";

    private final TicketDatabase database = new TicketDatabase();
    private final PantipSearchClient pantipSearchClient = new PantipSearchClient();
    private final SocialSearchClient socialSearchClient = new SocialSearchClient();
    private final ThreadLocal<HttpExchange> currentExchange = new ThreadLocal<>();

    void handle(HttpExchange exchange) throws IOException {
        currentExchange.set(exchange);
        try {
            String path = exchange.getRequestURI().getPath();
            if (isPost(exchange) && "/login".equals(path)) {
                login(exchange);
                return;
            }
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/login".equals(path)) {
                render(exchange, loginPage(""));
                return;
            }
            if ("/logout".equals(path)) {
                logout(exchange);
                return;
            }
            if (!isAuthenticated(exchange)) {
                if (path.startsWith("/api/")) {
                    renderJson(exchange, "{\"error\":\"unauthorized\",\"message\":\"login_required\"}", 401);
                } else {
                    redirect(exchange, "/login");
                }
                return;
            }
            String apiPath = normalizeApiPath(path);
            if (apiPath.startsWith("/api/backlog")) {
                handleBacklogApi(exchange, apiPath);
                return;
            }
            if (apiPath.startsWith("/api/config")) {
                handleConfigApi(exchange, apiPath);
                return;
            }
            if (apiPath.startsWith("/api/apl")) {
                handleAplApi(exchange, apiPath);
                return;
            }
            if (isPost(exchange) && "/apl/payments".equals(path)) {
                createAplPayment(exchange);
                return;
            }
            if (isPost(exchange) && "/apl/payment-status".equals(path)) {
                updateAplPaymentStatus(exchange);
                return;
            }
            if (isPost(exchange) && "/apl/receipts/confirm-print".equals(path)) {
                confirmAplReceiptPrint(exchange);
                return;
            }
            if (isPost(exchange) && "/apl/reconcile/approve".equals(path)) {
                approveAplReconcile(exchange);
                return;
            }
            if (isPost(exchange) && "/tickets".equals(path)) {
                createTicket(exchange);
                return;
            }
            if (isPost(exchange) && path.matches("/tickets/\\d+/assign")) {
                assignTicket(exchange, path);
                return;
            }
            if (isPost(exchange) && path.matches("/tickets/\\d+/followup")) {
                followUpTicket(exchange, path);
                return;
            }
            if (isPost(exchange) && path.matches("/tickets/\\d+/close")) {
                closeTicket(exchange, path);
                return;
            }
            if (isPost(exchange) && path.matches("/tickets/\\d+/message")) {
                addPrivateMessage(exchange, path);
                return;
            }
            if (isPost(exchange) && "/keywords".equals(path)) {
                saveKeyword(exchange);
                return;
            }
            if (isPost(exchange) && "/pantip/search".equals(path)) {
                searchPantip(exchange);
                return;
            }
            if (isPost(exchange) && "/pantip/create-ticket".equals(path)) {
                createTicketFromPantip(exchange);
                return;
            }
            if (isPost(exchange) && "/social/search".equals(path)) {
                searchSocial(exchange);
                return;
            }
            if (isPost(exchange) && "/social/create-ticket".equals(path)) {
                createTicketFromSocial(exchange);
                return;
            }
            render(exchange, page(path));
        } catch (Exception exception) {
            render(exchange, layout("Error", "<section class='panel'><h2>Error</h2><pre>"
                    + escape(exception.toString()) + "</pre></section>"), 500);
        } finally {
            currentExchange.remove();
        }
    }

    private String page(String path) {
        if (path.matches("/tickets/\\d+")) {
            return ticketDetailPage(Integer.parseInt(path.substring("/tickets/".length())));
        }
        if (path.matches("/projects/[A-Za-z0-9-]+")) {
            return projectDetailPage(path.substring("/projects/".length()));
        }
        if (path.matches("/roadmap/[A-Za-z0-9-]+")) {
            return epicDetailPage(path.substring("/roadmap/".length()));
        }
        return switch (path) {
            case "/apl" -> aplPage();
            case "/apl/receipts" -> aplReceiptsPage();
            case "/apl/reconcile" -> aplReconcilePage();
            case "/apl/gl" -> aplGlPage();
            case "/apl/reports" -> aplReportsPage();
            case "/roadmap" -> roadmapPage();
            case "/projects" -> projectsPage();
            case "/tickets" -> ticketsPage();
            case "/pantip" -> pantipPage();
            case "/social" -> socialPage();
            default -> createPage();
        };
    }

    private String loginPage(String error) {
        String errorHtml = error == null || error.isBlank()
                ? ""
                : "<p class='login-error'>" + escape(error) + "</p>";
        return """
                <!doctype html>
                <html lang="th">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Login</title>
                  <style>
                    * { box-sizing: border-box; }
                    body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Tahoma, "Leelawadee UI", "Segoe UI", Arial, sans-serif; background: #eef4f8; color: #172033; }
                    .login-card { width: min(420px, calc(100vw - 32px)); background: #fff; border: 1px solid #d8dee8; border-radius: 12px; padding: 28px; box-shadow: 0 18px 48px rgba(16,24,40,.12); }
                    .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }
                    .brand-mark { width: 38px; height: 38px; border-radius: 8px; display: grid; place-items: center; background: #e0f2fe; color: #0f6b8f; font-weight: 800; }
                    h1 { margin: 0; font-size: 22px; }
                    p { margin: 6px 0 0; color: #667085; }
                    form { display: grid; gap: 14px; margin-top: 18px; }
                    label { display: grid; gap: 7px; font-weight: 700; color: #334155; }
                    input { font: inherit; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; }
                    input:focus { outline: 3px solid #dbeafe; border-color: #60a5fa; }
                    button { font: inherit; border: 1px solid #0f6b8f; background: #0f6b8f; color: white; padding: 11px 14px; border-radius: 8px; cursor: pointer; font-weight: 800; }
                    button:hover { background: #0b5875; }
                    .login-error { color: #b42318; background: #fee4e2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; margin-top: 14px; }
                  </style>
                </head>
                <body>
                  <section class="login-card">
                    <div class="brand"><div class="brand-mark">TM</div><div><h1>Ticket Management</h1><p>Sign in to continue</p></div></div>
                    %s
                    <form method="post" action="/login">
                      <label>User<input name="username" autocomplete="username" required></label>
                      <label>Password<input type="password" name="password" autocomplete="current-password" required></label>
                      <button type="submit">Login</button>
                    </form>
                  </section>
                </body>
                </html>
                """.formatted(errorHtml);
    }

    private void login(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String username = form.getOrDefault("username", "").trim();
        String password = form.getOrDefault("password", "");
        if (LOGIN_USER.equals(username) && LOGIN_PASSWORD.equals(password)) {
            exchange.getResponseHeaders().add("Set-Cookie",
                    SESSION_COOKIE + "=" + SESSION_VALUE + "; Path=/; HttpOnly; SameSite=Lax");
            redirect(exchange, "/apl");
            return;
        }
        render(exchange, loginPage("Invalid user or password."), 401);
    }

    private void logout(HttpExchange exchange) throws IOException {
        exchange.getResponseHeaders().add("Set-Cookie",
                SESSION_COOKIE + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
        redirect(exchange, "/login");
    }

    private boolean isAuthenticated(HttpExchange exchange) {
        List<String> cookies = exchange.getRequestHeaders().get("Cookie");
        if (cookies == null) {
            return false;
        }
        String expected = SESSION_COOKIE + "=" + SESSION_VALUE;
        for (String cookieHeader : cookies) {
            for (String cookie : cookieHeader.split(";")) {
                if (expected.equals(cookie.trim())) {
                    return true;
                }
            }
        }
        return false;
    }

    private String createPage() {
        String html = """
                <section class="panel">
                  <h2>Create Ticket</h2>
                  <form method="post" action="/tickets" class="grid">
                    <label>Requester name<input name="requesterName" value="Demo Requester" required></label>
                    <label>Requester email<input name="requesterEmail" value="requester@example.com" required></label>
                    <label class="wide">Subject<input name="subject" required></label>
                    <label class="wide">Description<textarea name="description" rows="6" required></textarea></label>
                    <label>Category
                      <select name="category">
                        <option>General Support</option><option>Hardware</option><option>Software</option>
                        <option>Network</option><option>Billing</option>
                      </select>
                    </label>
                    <label>Priority
                      <select name="priority">
                        <option>LOW</option><option selected>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
                      </select>
                    </label>
                    <label>SLA hours<input type="number" name="slaHours" value="8" min="1"></label>
                    <label class="check"><input type="checkbox" name="firstLevelResolved" checked> First level support can resolve</label>
                    <label class="check"><input type="checkbox" name="vendorNeeded"> Vendor support needed</label>
                    <label class="check"><input type="checkbox" name="requesterAccepted" checked> Requester accepts resolution</label>
                    <button class="primary" type="submit">Create Ticket</button>
                  </form>
                </section>
                """;
        return layout("Create Ticket", html);
    }

    private String projectsPage() {
        StringBuilder rows = new StringBuilder();
        for (ProjectItem project : database.findProjects()) {
            rows.append("<tr>")
                    .append("<td><a href='/projects/").append(escapeAttribute(project.projectCode())).append("'>")
                    .append(escape(project.projectCode())).append("</a></td>")
                    .append("<td><a href='/projects/").append(escapeAttribute(project.projectCode())).append("'>")
                    .append(escape(project.title())).append("</a></td>")
                    .append("<td>").append(escape(project.sourceDocument())).append("</td>")
                    .append("<td>").append(escape(project.updatedAt())).append("</td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='4'>No projects yet.</td></tr>");
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Projects</h2>
                    <a class="button" href="/projects">Refresh</a>
                  </div>
                  <table>
                    <thead><tr><th>Project Code</th><th>Project</th><th>Source Document</th><th>Updated At</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                """.formatted(rows);
        return layout("Projects", html);
    }

    private String projectDetailPage(String projectCode) {
        ProjectDetail project = database.findProject(projectCode);
        if (project == null) {
            return layout("Project Not Found", """
                    <section class="panel">
                      <h2>Project not found</h2>
                      <a class="button" href="/projects">Back to Projects</a>
                    </section>
                """);
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>%s</h2>
                    <a class="button" href="/projects">Back to Projects</a>
                  </div>
                  <div class="detail-grid">
                    <div><strong>Project Code</strong><span>%s</span></div>
                    <div><strong>Source Document</strong><span>%s</span></div>
                    <div><strong>Created At</strong><span>%s</span></div>
                    <div><strong>Updated At</strong><span>%s</span></div>
                  </div>
                </section>
                <section class="panel">
                  <h2>Requirement Objectives / วัตถุประสงค์</h2>
                  <pre>%s</pre>
                </section>
                <section class="panel">
                  <h2>Background Concerns / เหตุผลความเป็นมา</h2>
                  <pre>%s</pre>
                </section>
                <section class="panel">
                  <h2>Summary Requirement</h2>
                  <pre>%s</pre>
                </section>
                """.formatted(
                escape(project.title()),
                escape(project.projectCode()),
                escape(project.sourceDocument()),
                escape(project.createdAt()),
                escape(project.updatedAt()),
                escape(project.objectives()),
                escape(project.background()),
                escape(project.requirements()));
        return layout(project.title(), html);
    }

    private String roadmapPage() {
        StringBuilder rows = new StringBuilder();
        for (EpicItem epic : database.findEpics()) {
            List<FeatureItem> features = database.findFeatures(epic.epicCode());
            int storyCount = 0;
            for (FeatureItem feature : features) {
                storyCount += database.findUserStories(feature.featureCode()).size();
            }
            rows.append("<tr>")
                    .append("<td><a href='/roadmap/").append(escapeAttribute(epic.epicCode())).append("'>")
                    .append(escape(epic.epicCode())).append("</a></td>")
                    .append("<td><a href='/roadmap/").append(escapeAttribute(epic.epicCode())).append("'>")
                    .append(escape(epic.title())).append("</a><p>")
                    .append(escape(epic.description())).append("</p></td>")
                    .append("<td>").append(features.size()).append("</td>")
                    .append("<td>").append(storyCount).append("</td>")
                    .append("<td><span class='status'>").append(escape(epic.status())).append("</span></td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='5'>No roadmap items yet.</td></tr>");
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Epic Roadmap</h2>
                    <a class="button" href="/roadmap/R3">Open R3</a>
                  </div>
                  <table>
                    <thead><tr><th>Epic</th><th>Title</th><th>Features</th><th>User Stories</th><th>Status</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                """.formatted(rows);
        return layout("Epic Roadmap", html);
    }

    private String epicDetailPage(String epicCode) {
        EpicItem epic = database.findEpic(epicCode);
        if (epic == null) {
            return layout("Epic Not Found", """
                    <section class="panel">
                      <h2>Epic not found</h2>
                      <a class="button" href="/roadmap">Back to Roadmap</a>
                    </section>
                """);
        }

        StringBuilder featureSections = new StringBuilder();
        for (FeatureItem feature : database.findFeatures(epic.epicCode())) {
            StringBuilder storyRows = new StringBuilder();
            for (UserStoryItem story : database.findUserStories(feature.featureCode())) {
                storyRows.append("<tr>")
                        .append("<td>").append(escape(story.storyCode())).append("</td>")
                        .append("<td>").append(escape(story.title())).append("<p>")
                        .append(escape(story.description())).append("</p></td>")
                        .append("<td><span class='status'>").append(escape(story.status())).append("</span></td>")
                        .append("</tr>");
            }
            ImpactAnalysisItem impact = database.findImpactAnalysis(feature.featureCode());
            featureSections.append("""
                    <section class="panel" id="%s">
                      <div class="section-title">
                        <h2>Feature %d : %s</h2>
                        <span class="status">%s</span>
                      </div>
                      <p class="muted">%s</p>
                      <table>
                        <thead><tr><th>User Story</th><th>Description</th><th>Status</th></tr></thead>
                        <tbody>%s</tbody>
                      </table>
                      <div class="impact-box">
                        <strong>%s</strong>
                        <p>%s</p>
                      </div>
                    </section>
                    """.formatted(
                    escapeAttribute(feature.featureCode()),
                    feature.featureNo(),
                    escape(feature.title()),
                    escape(feature.status()),
                    escape(feature.description()),
                    storyRows,
                    escape(impact == null ? "Impact Analysis" : impact.iaCode() + " : " + impact.title()),
                    escape(impact == null ? "No impact analysis recorded." : impact.solution())));
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>%s : %s</h2>
                    <a class="button" href="/roadmap">Back to Roadmap</a>
                  </div>
                  <div class="detail-grid">
                    <div><strong>Epic</strong><span>%s</span></div>
                    <div><strong>Status</strong><span class="status">%s</span></div>
                    <div><strong>Updated At</strong><span>%s</span></div>
                    <div><strong>Requirement</strong><span>APL Payment for Legacy Policy</span></div>
                  </div>
                  <p class="muted">%s</p>
                </section>
                %s
                <section class="panel">
                  <h2>Backlog API</h2>
                  <pre>GET /api/backlog/epics
GET /api/backlog/epics/%s</pre>
                </section>
                """.formatted(
                escape(epic.epicCode()),
                escape(epic.title()),
                escape(epic.epicCode()),
                escape(epic.status()),
                escape(epic.updatedAt()),
                escape(epic.description()),
                featureSections,
                escape(epic.epicCode()));
        return layout(epic.epicCode() + " Roadmap", html);
    }

    private String aplPage() {
        StringBuilder channelRows = new StringBuilder();
        for (PaymentChannel channel : database.findPaymentChannels()) {
            channelRows.append("<tr>")
                    .append("<td><strong>").append(escape(channel.channelCode())).append("</strong><p>")
                    .append(escape(channel.channelName())).append("</p></td>")
                    .append("<td>").append(escape(channel.phase())).append("</td>")
                    .append("<td><span class='status ").append(channel.isEnabled() ? "ok" : "hold").append("'>")
                    .append(channel.isEnabled() ? "ENABLED" : "DESIGN PHASE").append("</span></td>")
                    .append("<td>").append(channel.allowInterest() ? "Premium + Interest" : "Premium only").append("<p>")
                    .append(channel.creditCardRequired() ? "Credit card product rule required" : "No card rule").append("</p></td>")
                    .append("<td>").append(escape(channel.remark())).append("</td>")
                    .append("</tr>");
        }

        StringBuilder methodRuleRows = new StringBuilder();
        for (PaymentMethodProductRule rule : database.findPaymentMethodProductRules()) {
            methodRuleRows.append("<tr>")
                    .append("<td>").append(escape(rule.channelCode())).append("</td>")
                    .append("<td>").append(escape(rule.productType())).append("</td>")
                    .append("<td><span class='status ok'>").append(rule.supportMultiPeriodPayment() ? "TRUE" : "FALSE").append("</span></td>")
                    .append("<td><span class='status ").append(rule.isSupported() ? "ok" : "danger-soft").append("'>")
                    .append(rule.isSupported() ? "TRUE" : "FALSE").append("</span></td>")
                    .append("<td>").append(escape(nullToBlank(rule.dependencyApi()))).append("<p>")
                    .append(escape(rule.remark())).append("</p></td>")
                    .append("</tr>");
        }

        StringBuilder policyRows = new StringBuilder();
        for (AplPolicy policy : database.findAplPolicies()) {
            AplQuote quote = database.quoteAplPayment(policy.policyNo());
            AplEligibility eligibility = database.checkAplEligibility(policy.policyNo());
            AplPreparedPolicy prepared = database.prepareAplPolicy(policy.policyNo());
            DueDateStatus dueDateStatus = database.evaluateDueDateStatus(policy.dueDate());
            String premiumComponents = premiumComponentSummary(policy.policyNo());
            policyRows.append("<tr>")
                    .append("<td><strong>").append(escape(policy.policyNo())).append("</strong><p>")
                    .append(escape(policy.customerName())).append("</p></td>")
                    .append("<td>").append(escape(policy.appSource())).append("<p>")
                    .append(escape(policy.coreSystem())).append(" / ").append(escape(policy.productType())).append("</p></td>")
                    .append("<td>").append(policy.aplDays()).append(" days<p>")
                    .append(escape(policy.dueDate())).append(" / ").append(escape(dueDateStatus.statusCode())).append(" ")
                    .append(escape(dueDateStatus.description())).append("</p></td>")
                    .append("<td>").append(premiumComponents).append("<p>Interest ")
                    .append(money(quote.interestAmount())).append("</p></td>")
                    .append("<td>").append(money(quote.totalAmount())).append("</td>")
                    .append("<td><span class='status ").append(eligibility.eligible() ? "ok" : "danger-soft").append("'>")
                    .append(eligibility.eligible() ? "ELIGIBLE" : "BLOCKED").append("</span><p>")
                    .append(escape(prepared == null ? "" : prepared.agentCode())).append(" / ")
                    .append(escape(prepared == null ? "" : prepared.exclusiveCode())).append("</p></td>")
                    .append("<td class='action-cell'>")
                    .append(paymentForm(policy.policyNo(), "QR", "QR"))
                    .append(policy.allowCreditCard()
                            ? paymentForm(policy.policyNo(), "CREDIT_CARD", "Credit Card")
                            : "<span class='button disabled'>Credit Card N/A</span>")
                    .append("</td>")
                    .append("</tr>");
        }

        StringBuilder paymentRows = new StringBuilder();
        for (AplPayment payment : database.findAplPayments()) {
            String printGroup = payment.interestAmount() > 0 ? "INTEREST" : "NO_INTEREST";
            String printOwner = payment.interestAmount() > 0 ? "Interest receipt: P'Na" : "Premium receipt: P'Oy";
            String paymentStatus = payment.paymentStatus() == null || payment.paymentStatus().isBlank()
                    ? "WAIT_CALLBACK"
                    : payment.paymentStatus();
            paymentRows.append("<tr>")
                    .append("<td><strong>").append(escape(payment.paymentId())).append("</strong><p>")
                    .append(escape(payment.createdAt())).append("</p><p>").append(escape(paymentStatus)).append("</p></td>")
                    .append("<td>").append(escape(payment.policyNo())).append("<p>")
                    .append(escape(payment.payPeriod())).append("</p></td>")
                    .append("<td>").append(escape(payment.collectionMethod())).append("<p>")
                    .append(escape(payment.paymentTypeDesc())).append("</p></td>")
                    .append("<td>").append(escape(payment.collectionId())).append("<p>")
                    .append(escape(payment.trxId())).append("</p></td>")
                    .append("<td>").append(money(payment.totalAmount())).append("<p>Interest ")
                    .append(money(payment.interestAmount())).append("</p><p>Paid ")
                    .append(money(payment.paidAmount())).append("</p></td>")
                    .append("<td>").append(escape(payment.receiptPremiumNo())).append("<p>")
                    .append(escape(nullToBlank(payment.receiptInterestNo()))).append("</p><p>")
                    .append(escape(printGroup)).append(" / ").append(escape(printOwner)).append("</p></td>")
                    .append("<td><span class='status ").append(statusClass(payment.reconcileStatus())).append("'>")
                    .append(escape(payment.reconcileStatus())).append("</span><p>")
                    .append("Response ").append(escape(nullToBlank(payment.responseCode()))).append("</p></td>")
                    .append("<td><span class='status'>").append(escape(payment.transactionStatus())).append("</span><p>")
                    .append(escape(payment.glStatus())).append(" / ").append(escape(payment.smsStatus())).append("</p></td>")
                    .append("<td class='action-cell'>")
                    .append(paymentStatusForm(payment, "SUCCESS", payment.totalAmount(), "Success"))
                    .append(paymentStatusForm(payment, "SUCCESS", Math.max(0, payment.totalAmount() - 10), "Mismatch"))
                    .append(paymentStatusForm(payment, "FAILED", 0, "Fail"))
                    .append("</td>")
                    .append("</tr>");
        }
        if (paymentRows.isEmpty()) {
            paymentRows.append("<tr><td colspan='9'>No APL payments yet.</td></tr>");
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>R3 Prototype Console: APL/RYP Payment</h2>
                    <div class="action-cell">
                      <a class="button" href="/roadmap/R3">Roadmap</a>
                      <a class="button" href="/projects/APL-RYP-PAYMENT">Requirement</a>
                      <a class="button" href="/apl/receipts">Receipts</a>
                      <a class="button" href="/apl/reconcile">Reconcile</a>
                      <a class="button" href="/apl/gl">GL</a>
                      <a class="button" href="/apl/reports">Reports</a>
                    </div>
                  </div>
                  <div class="detail-grid">
                    <div><strong>Feature 1</strong><span>Policy eligibility: product, status, APL status</span></div>
                    <div><strong>Feature 2</strong><span>Prepare policy, agent, exclusive code for TL Smart/TLI App</span></div>
                    <div><strong>Feature 3</strong><span>Realtime premium, rider, and interest quote</span></div>
                    <div><strong>Feature 4</strong><span>QR/Credit Card payment and callback result</span></div>
                    <div><strong>Feature 5</strong><span>Premium receipt, interest receipt, sorting and print owner</span></div>
                    <div><strong>Feature 6-8</strong><span>Legacy/InsureMo update, reconcile, GL, and SMS status</span></div>
                  </div>
                </section>
                <section class="panel">
                  <h2>Payment Channel Setup</h2>
                  <table>
                    <thead><tr><th>Channel</th><th>Phase</th><th>Status</th><th>Rule</th><th>Remark</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>Payment Method Product Rule Config</h2>
                  <table>
                    <thead><tr><th>Method</th><th>Product Type</th><th>Multi Period</th><th>Supported</th><th>Dependency/Remark</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>Policy Eligibility, Prepared Data and Realtime Quote</h2>
                  <table>
                    <thead><tr><th>Policy</th><th>App/Core</th><th>APL</th><th>Premium Split</th><th>Total Due</th><th>Eligibility/Prepared</th><th>Payment</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel" id="payments">
                  <h2>Receipt, Reconcile, Transaction and GL Report</h2>
                  <table>
                    <thead><tr><th>Payment</th><th>Policy</th><th>Method</th><th>Collection/Trx</th><th>Amount</th><th>Receipts/Print</th><th>Reconcile</th><th>Downstream</th><th>Callback</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>API Endpoints</h2>
                  <pre>GET  /api/apl/policies
GET  /api/apl/policies/{policyNo}
GET  /api/apl/quote?policyNo=APL100001
GET  /api/apl/payment-channels
GET  /api/v1/config/payment-method-product-rules
GET  /api/v1/config/due-date-status-rules
GET  /api/v1/config/premium-component-rules
GET  /api/apl/eligibility?policyNo=APL100001
GET  /api/apl/prepare?policyNo=APL100001
GET  /api/apl/payments
POST /api/apl/payments  policyNo=APL100001&amp;collectionMethod=QR
POST /api/apl/applications/payment-status  paymentId=APL...&amp;paymentResult=SUCCESS&amp;responseCode=0&amp;paidAmount=3450.00</pre>
                </section>
                """.formatted(channelRows, methodRuleRows, policyRows, paymentRows);
        return layout("APL/RYP Payment", html);
    }

    private String premiumComponentSummary(String policyNo) {
        StringBuilder html = new StringBuilder();
        for (AplPremiumComponent component : database.findAplPremiumComponents(policyNo)) {
            if (html.length() > 0) {
                html.append("<br>");
            }
            html.append(escape(component.componentName())).append(": ").append(money(component.amount()));
        }
        return html.toString();
    }

    private String aplReceiptsPage() {
        StringBuilder rows = new StringBuilder();
        for (AplReceipt receipt : database.findAplReceipts()) {
            rows.append("<tr>")
                    .append("<td><strong>").append(escape(receipt.receiptNo())).append("</strong><p>")
                    .append(escape(receipt.receiptType())).append("</p></td>")
                    .append("<td>").append(escape(receipt.policyNo())).append("<p>")
                    .append(escape(receipt.paymentId())).append("</p></td>")
                    .append("<td>").append(escape(receipt.printGroup())).append("<p>")
                    .append(escape(receipt.printOwner())).append("</p></td>")
                    .append("<td>").append(money(receipt.amount())).append("</td>")
                    .append("<td><span class='status ").append(statusClass(receipt.printStatus())).append("'>")
                    .append(escape(receipt.printStatus())).append("</span><p>")
                    .append(escape(nullToBlank(receipt.printBatchNo()))).append("</p></td>")
                    .append("<td><span class='status ").append(statusClass(receipt.reconcileStatus())).append("'>")
                    .append(escape(receipt.reconcileStatus())).append("</span></td>")
                    .append("<td class='action-cell'>")
                    .append(confirmPrintForm(receipt))
                    .append("</td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='7'>No receipt records yet.</td></tr>");
        }
        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Receipt and Printing</h2>
                    <a class="button" href="/apl">Back to APL Console</a>
                  </div>
                  <table>
                    <thead><tr><th>Receipt</th><th>Policy/Payment</th><th>Print Group</th><th>Amount</th><th>Print Status</th><th>Reconcile</th><th>Action</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>API</h2>
                  <pre>GET  /api/apl/receipts
POST /api/apl/receipts/{receiptNo}/confirm-print</pre>
                </section>
                """.formatted(rows);
        return layout("Receipt and Printing", html);
    }

    private String aplReconcilePage() {
        StringBuilder rows = new StringBuilder();
        for (AplReconcileItem item : database.findAplReconcileItems()) {
            rows.append("<tr>")
                    .append("<td><strong>").append(escape(item.paymentId())).append("</strong><p>")
                    .append(escape(item.policyNo())).append("</p></td>")
                    .append("<td>").append(money(item.expectedAmount())).append("<p>Paid ")
                    .append(money(item.paidAmount())).append("</p></td>")
                    .append("<td>").append(money(item.diffAmount())).append("</td>")
                    .append("<td>").append(escape(item.matchKey())).append("<p>")
                    .append(escape(item.reasonCode())).append("</p></td>")
                    .append("<td><span class='status ").append(statusClass(item.reconcileStatus())).append("'>")
                    .append(escape(item.reconcileStatus())).append("</span></td>")
                    .append("<td>").append(escape(item.owner())).append("<p>")
                    .append(escape(item.note())).append("</p></td>")
                    .append("<td class='action-cell'>").append(approveReconcileForm(item.paymentId())).append("</td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='7'>No reconcile records yet.</td></tr>");
        }
        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Collection Reconcile</h2>
                    <a class="button" href="/apl">Back to APL Console</a>
                  </div>
                  <table>
                    <thead><tr><th>Payment</th><th>Amount</th><th>Diff</th><th>Match Key</th><th>Status</th><th>Owner/Note</th><th>Action</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>API</h2>
                  <pre>GET  /api/apl/reconcile/items
POST /api/apl/reconcile/{paymentId}/approve</pre>
                </section>
                """.formatted(rows);
        return layout("Collection Reconcile", html);
    }

    private String aplGlPage() {
        StringBuilder rows = new StringBuilder();
        for (AplGlTransaction item : database.findAplGlTransactions()) {
            rows.append("<tr>")
                    .append("<td><strong>").append(escape(item.glTransactionId())).append("</strong><p>")
                    .append(escape(item.paymentId())).append("</p></td>")
                    .append("<td>").append(escape(item.policyNo())).append("</td>")
                    .append("<td>").append(escape(item.premiumType())).append("<p>")
                    .append(escape(item.installmentNo())).append("</p></td>")
                    .append("<td>").append(escape(item.debitAccount())).append("<p>")
                    .append(escape(item.creditAccount())).append("</p></td>")
                    .append("<td>").append(money(item.amount())).append("</td>")
                    .append("<td><span class='status ").append(statusClass(item.postingStatus())).append("'>")
                    .append(escape(item.postingStatus())).append("</span></td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='6'>No GL entries yet.</td></tr>");
        }
        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>GL Transactions</h2>
                    <a class="button" href="/apl">Back to APL Console</a>
                  </div>
                  <table>
                    <thead><tr><th>GL Transaction</th><th>Policy</th><th>Premium Type</th><th>Accounts</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>API</h2>
                  <pre>GET /api/apl/gl/transactions</pre>
                </section>
                """.formatted(rows);
        return layout("GL Transactions", html);
    }

    private String aplReportsPage() {
        StringBuilder rows = new StringBuilder();
        for (AplPayment payment : database.findAplPayments()) {
            rows.append("<tr>")
                    .append("<td><strong>").append(escape(payment.policyNo())).append("</strong><p>")
                    .append(escape(payment.paymentId())).append("</p></td>")
                    .append("<td>").append(escape(payment.collectionMethod())).append("</td>")
                    .append("<td>").append(money(payment.basePremium())).append("<p>Rider ")
                    .append(money(payment.riderPremium())).append("</p></td>")
                    .append("<td>").append(money(payment.interestAmount())).append("</td>")
                    .append("<td>").append(money(payment.totalAmount())).append("</td>")
                    .append("<td><span class='status ").append(statusClass(payment.paymentStatus())).append("'>")
                    .append(escape(nullToBlank(payment.paymentStatus()))).append("</span></td>")
                    .append("<td><span class='status ").append(statusClass(payment.reconcileStatus())).append("'>")
                    .append(escape(payment.reconcileStatus())).append("</span></td>")
                    .append("<td>").append(escape(payment.glStatus())).append("<p>")
                    .append(escape(payment.smsStatus())).append("</p></td>")
                    .append("</tr>");
        }
        if (rows.isEmpty()) {
            rows.append("<tr><td colspan='8'>No report records yet.</td></tr>");
        }
        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Renewal Payment Report</h2>
                    <a class="button" href="/apl">Back to APL Console</a>
                  </div>
                  <table>
                    <thead><tr><th>Policy/Payment</th><th>Channel</th><th>Premium</th><th>Interest</th><th>Total</th><th>Payment</th><th>Reconcile</th><th>Downstream</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                </section>
                <section class="panel">
                  <h2>API</h2>
                  <pre>GET /api/apl/reports/renewals</pre>
                </section>
                """.formatted(rows);
        return layout("Renewal Payment Report", html);
    }

    private String paymentForm(String policyNo, String collectionMethod, String label) {
        return "<form method='post' action='/apl/payments'>"
                + "<input type='hidden' name='policyNo' value='" + escapeAttribute(policyNo) + "'>"
                + "<input type='hidden' name='collectionMethod' value='" + escapeAttribute(collectionMethod) + "'>"
                + "<button class='primary' type='submit'>" + escape(label) + "</button>"
                + "</form>";
    }

    private String paymentStatusForm(AplPayment payment, String result, double paidAmount, String label) {
        String cssClass = "FAILED".equals(result) ? "danger" : "button";
        String responseCode = "FAILED".equals(result) ? "99" : "0";
        return "<form method='post' action='/apl/payment-status#payments'>"
                + "<input type='hidden' name='paymentId' value='" + escapeAttribute(payment.paymentId()) + "'>"
                + "<input type='hidden' name='paymentResult' value='" + escapeAttribute(result) + "'>"
                + "<input type='hidden' name='responseCode' value='" + escapeAttribute(responseCode) + "'>"
                + "<input type='hidden' name='paidAmount' value='" + String.format(Locale.US, "%.2f", paidAmount) + "'>"
                + "<button class='" + cssClass + "' type='submit'>" + escape(label) + "</button>"
                + "</form>";
    }

    private String confirmPrintForm(AplReceipt receipt) {
        if (!"WAIT_PRINT".equals(receipt.printStatus())) {
            return "<span class='button disabled'>No action</span>";
        }
        return "<form method='post' action='/apl/receipts/confirm-print'>"
                + "<input type='hidden' name='receiptNo' value='" + escapeAttribute(receipt.receiptNo()) + "'>"
                + "<input type='hidden' name='paymentId' value='" + escapeAttribute(receipt.paymentId()) + "'>"
                + "<button class='primary' type='submit'>Confirm Print</button>"
                + "</form>";
    }

    private String approveReconcileForm(String paymentId) {
        return "<form method='post' action='/apl/reconcile/approve'>"
                + "<input type='hidden' name='paymentId' value='" + escapeAttribute(paymentId) + "'>"
                + "<button class='primary' type='submit'>Approve Match</button>"
                + "</form>";
    }

    private String ticketsPage() {
        int page = currentPage();
        List<TicketListItem> allTickets = database.findAll();
        PageSlice<TicketListItem> slice = paginate(allTickets, page, 10);
        StringBuilder rows = new StringBuilder();
        for (TicketListItem ticket : slice.items()) {
            rows.append("<tr>")
                    .append("<td><a href='/tickets/").append(ticket.ticketId()).append("'>#")
                    .append(ticket.ticketId()).append("</a></td>")
                    .append("<td><a href='/tickets/").append(ticket.ticketId()).append("'>")
                    .append(escape(ticket.subject())).append("</a></td>")
                    .append("<td>").append(escape(ticket.requesterName())).append("</td>")
                    .append("<td>").append(escape(ticket.category())).append("</td>")
                    .append("<td>").append(escape(ticket.priority())).append("</td>")
                    .append("<td><span class='status'>").append(escape(ticket.status())).append("</span></td>")
                    .append("<td>").append(escape(ticket.createdAt())).append("</td>")
                    .append("</tr>");
        }
        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>List View</h2>
                    <a class="button" href="/tickets">Refresh</a>
                  </div>
                  <table>
                    <thead><tr><th>ID</th><th>Subject</th><th>Requester</th><th>Category</th><th>Priority</th><th>Status</th><th>Created At</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                  %s
                </section>
                """.formatted(rows, pagination("/tickets", slice));
        return layout("List View", html);
    }

    private String ticketDetailPage(int ticketId) {
        TicketDetail ticket = database.findTicketDetail(ticketId);
        if (ticket == null) {
            return layout("Ticket Not Found", """
                    <section class="panel">
                      <h2>Ticket not found</h2>
                      <a class="button" href="/tickets">Back to List View</a>
                    </section>
                """);
        }
        StringBuilder historyRows = new StringBuilder();
        for (TicketHistoryItem item : database.findTicketHistory(ticketId)) {
            historyRows.append("<tr>")
                    .append("<td>").append(escape(item.createdAt())).append("</td>")
                    .append("<td><span class='status'>").append(escape(item.action())).append("</span></td>")
                    .append("<td>").append(escape(item.actor())).append("</td>")
                    .append("<td>").append(escape(item.note())).append("</td>")
                    .append("</tr>");
        }
        if (historyRows.isEmpty()) {
            historyRows.append("<tr><td colspan='4'>No structured history yet. See legacy summary below.</td></tr>");
        }

        StringBuilder messageRows = new StringBuilder();
        for (TicketMessageItem item : database.findPrivateMessages(ticketId)) {
            String cssClass = "CUSTOMER".equalsIgnoreCase(item.senderType()) ? "message customer" : "message agent";
            messageRows.append("<div class='").append(cssClass).append("'>")
                    .append("<div><strong>").append(escape(item.senderName())).append("</strong> ")
                    .append("<span>").append(escape(item.senderType())).append(" | ")
                    .append(escape(item.createdAt())).append("</span></div>")
                    .append("<p>").append(escape(item.message())).append("</p>")
                    .append("</div>");
        }
        if (messageRows.isEmpty()) {
            messageRows.append("<p class='muted'>No private messages yet.</p>");
        }

        StringBuilder referenceRows = new StringBuilder();
        for (TicketReference reference : database.findTicketReferences(ticketId)) {
            referenceRows.append("<tr>")
                    .append("<td><span class='status'>").append(escape(reference.source())).append("</span></td>")
                    .append("<td>").append(escape(reference.externalId())).append("</td>")
                    .append("<td>").append(escape(reference.keyword())).append("</td>")
                    .append("<td><a href='").append(escapeAttribute(reference.url())).append("' target='_blank'>")
                    .append(escape(reference.title())).append("</a><p>Imported at ")
                    .append(escape(reference.importedAt())).append("</p></td>")
                    .append("<td>").append(escape(shortText(reference.content(), 220))).append("</td>")
                    .append("</tr>");
        }
        if (referenceRows.isEmpty()) {
            referenceRows.append("<tr><td colspan='5'>No source references recorded.</td></tr>");
        }

        String html = """
                <section class="panel">
                  <div class="section-title">
                    <h2>Ticket #%d</h2>
                    <a class="button" href="/tickets">Back to List View</a>
                  </div>
                  <div class="detail-grid">
                    <div><strong>Subject</strong><span>%s</span></div>
                    <div><strong>Status</strong><span class="status">%s</span></div>
                    <div><strong>Requester</strong><span>%s &lt;%s&gt;</span></div>
                    <div><strong>Assignee</strong><span>%s</span></div>
                    <div><strong>Category</strong><span>%s</span></div>
                    <div><strong>Priority</strong><span>%s</span></div>
                    <div><strong>Created At</strong><span>%s</span></div>
                    <div><strong>Due At</strong><span>%s</span></div>
                  </div>
                </section>
                <div class="detail-layout">
                  <div>
                    <section class="panel" id="references">
                      <h2>Source References</h2>
                      <table>
                        <thead><tr><th>Source</th><th>Ref ID</th><th>Keyword</th><th>Reference</th><th>Content</th></tr></thead>
                        <tbody>%s</tbody>
                      </table>
                    </section>
                    <section class="panel" id="conversation">
                      <h2>Private Customer Conversation</h2>
                      <div class="messages">%s</div>
                      <form method="post" action="/tickets/%d/message" class="grid">
                        <label>Sender type
                          <select name="senderType">
                            <option>AGENT</option>
                            <option>CUSTOMER</option>
                          </select>
                        </label>
                        <label>Sender name<input name="senderName" value="Support Agent" required></label>
                        <label class="wide">Message<textarea name="message" rows="4" required placeholder="Private conversation with the customer"></textarea></label>
                        <button class="primary" type="submit">Add Private Message</button>
                      </form>
                    </section>
                    <section class="panel" id="history">
                      <h2>Ticket History</h2>
                      <table>
                        <thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Note</th></tr></thead>
                        <tbody>%s</tbody>
                      </table>
                    </section>
                    <section class="panel">
                      <h2>Description</h2>
                      <pre>%s</pre>
                    </section>
                    <section class="panel">
                      <h2>Legacy Summary</h2>
                      <pre>%s</pre>
                    </section>
                  </div>
                  <aside class="side-stack">
                    <section class="panel" id="assignment">
                      <h2>Assign Ticket</h2>
                      <form method="post" action="/tickets/%d/assign" class="stack-form">
                        <label>Assign to
                          <select name="assigneeName">
                            <option>Support Agent</option>
                            <option>Specialist Team</option>
                            <option>Supervisor</option>
                            <option>External Vendor Coordinator</option>
                            <option>Billing Team</option>
                            <option>Network Team</option>
                          </select>
                        </label>
                        <label>Note<textarea name="note" rows="3" placeholder="Optional assignment note"></textarea></label>
                        <button class="primary" type="submit">Assign</button>
                      </form>
                    </section>
                    <section class="panel" id="followup">
                      <h2>Follow Up</h2>
                      <form method="post" action="/tickets/%d/followup" class="stack-form">
                        <label>Follow-up note<textarea name="note" rows="4" required placeholder="Add follow-up details"></textarea></label>
                        <button class="primary" type="submit">Add Follow Up</button>
                      </form>
                    </section>
                    <section class="panel" id="close">
                      <h2>Close Ticket</h2>
                      <form method="post" action="/tickets/%d/close" class="stack-form">
                        <label>Closure note<textarea name="note" rows="4" required placeholder="Resolution summary"></textarea></label>
                        <button class="danger" type="submit">Close Ticket</button>
                      </form>
                    </section>
                  </aside>
                </div>
                """.formatted(
                ticket.ticketId(),
                escape(ticket.subject()),
                escape(ticket.status()),
                escape(ticket.requesterName()),
                escape(ticket.requesterEmail()),
                escape(ticket.assigneeName() == null ? "Unassigned" : ticket.assigneeName()),
                escape(ticket.category()),
                escape(ticket.priority()),
                escape(ticket.createdAt()),
                escape(ticket.dueAt() == null ? "Unset" : ticket.dueAt()),
                referenceRows,
                messageRows,
                ticket.ticketId(),
                historyRows,
                escape(ticket.description()),
                escape(ticket.summary()),
                ticket.ticketId(),
                ticket.ticketId(),
                ticket.ticketId());
        return layout("Ticket #" + ticketId, html);
    }

    private String pantipPage() {
        StringBuilder keywordRows = new StringBuilder();
        for (String keyword : database.findKeywords()) {
            keywordRows.append("<tr><td>").append(escape(keyword)).append("</td><td>")
                    .append("<form method='post' action='/pantip/search'><input type='hidden' name='keyword' value='")
                    .append(escapeAttribute(keyword)).append("'><button>Search</button></form>")
                    .append("</td></tr>");
        }

        int page = currentPage();
        PageSlice<PantipTopicRecord> topicSlice = paginate(database.findPantipTopics(), page, 10);
        StringBuilder topicRows = new StringBuilder();
        for (PantipTopicRecord topic : topicSlice.items()) {
            topicRows.append("<tr>")
                    .append("<td>").append(escape(topic.topicId())).append("</td>")
                    .append("<td>").append(escape(topic.keyword())).append("</td>")
                    .append("<td><a href='").append(escapeAttribute(topic.url())).append("' target='_blank'>")
                    .append(escape(topic.title())).append("</a><p>")
                    .append(escape(shortText(topic.content(), 220))).append("</p></td>")
                    .append("<td><span class='status'>").append(escape(topic.status())).append("</span></td>")
                    .append("<td>").append(ticketLink(topic.ticketId())).append("</td>")
                    .append("<td><form method='post' action='/pantip/create-ticket'>")
                    .append("<input type='hidden' name='topicId' value='").append(escapeAttribute(topic.topicId())).append("'>")
                    .append("<button>")
                    .append(topic.ticketId() == null ? "Create Ticket" : "Open Existing")
                    .append("</button></form></td>")
                    .append("</tr>");
        }

        String html = """
                <section class="panel">
                  <h2>Pantip Monitor</h2>
                  <form method="post" action="/keywords" class="inline-form">
                    <input name="keyword" placeholder="keyword เช่น เคลม, ประกัน, บริการหลังการขาย" required>
                    <button class="primary" type="submit">Add Keyword</button>
                  </form>
                  <h3>Keywords</h3>
                  <table><thead><tr><th>Keyword</th><th>Action</th></tr></thead><tbody>%s</tbody></table>
                </section>
                <section class="panel">
                  <h2>Imported Pantip Topics</h2>
                  <table>
                    <thead><tr><th>Topic ID</th><th>Keyword</th><th>Topic</th><th>Status</th><th>Ticket ID</th><th>Action</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                  %s
                </section>
                """.formatted(keywordRows, topicRows, pagination("/pantip", topicSlice));
        return layout("Pantip Monitor", html);
    }

    private String socialPage() {
        int page = currentPage();
        PageSlice<SocialPostRecord> slice = paginate(database.findSocialPosts(), page, 10);
        StringBuilder rows = new StringBuilder();
        for (SocialPostRecord post : slice.items()) {
            rows.append("<tr>")
                    .append("<td>").append(escape(post.source())).append("</td>")
                    .append("<td>").append(escape(post.keyword())).append("</td>")
                    .append("<td><a href='").append(escapeAttribute(post.url())).append("' target='_blank'>")
                    .append(escape(post.title())).append("</a><p>")
                    .append(escape(shortText(post.content(), 240))).append("</p></td>")
                    .append("<td>").append(escape(post.author())).append("</td>")
                    .append("<td><span class='status'>").append(escape(post.status())).append("</span></td>")
                    .append("<td>").append(ticketLink(post.ticketId())).append("</td>")
                    .append("<td><form method='post' action='/social/create-ticket'>")
                    .append("<input type='hidden' name='source' value='").append(escapeAttribute(post.source())).append("'>")
                    .append("<input type='hidden' name='externalId' value='").append(escapeAttribute(post.externalId())).append("'>")
                    .append("<button>")
                    .append(post.ticketId() == null ? "Create Ticket" : "Open Existing")
                    .append("</button></form></td>")
                    .append("</tr>");
        }

        String html = """
                <section class="panel">
                  <h2>Social Monitor</h2>
                  <form method="post" action="/social/search" class="grid">
                    <label>Source
                      <select name="source">
                        <option>PANTIP</option>
                        <option>REDDIT</option>
                      </select>
                    </label>
                    <label>Keyword<input name="keyword" placeholder="claim, warranty, service" required></label>
                    <button class="primary" type="submit">Search and Import New Posts</button>
                  </form>
                </section>
                <section class="panel">
                  <div class="section-title">
                    <h2>Imported Social Posts</h2>
                    <a class="button" href="/social">Refresh</a>
                  </div>
                  <table>
                    <thead><tr><th>Source</th><th>Keyword</th><th>Post</th><th>Author</th><th>Status</th><th>Ticket ID</th><th>Action</th></tr></thead>
                    <tbody>%s</tbody>
                  </table>
                  %s
                </section>
                """.formatted(rows, pagination("/social", slice));
        return layout("Social Monitor", html);
    }

    private void createTicket(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        TicketWorkflow workflow = workflow();
        User requester = new User(1, form.get("requesterName"), form.get("requesterEmail"), Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        User specialist = new User(3, "Specialist Team", "specialist@example.com", Role.SPECIALIST);
        User supervisor = new User(4, "Supervisor", "supervisor@example.com", Role.SUPERVISOR);

        Ticket ticket = workflow.createTicket(requester, form.get("subject"), form.get("description"));
        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(1, form.getOrDefault("category", "General Support")));
        workflow.setPriorityAndSla(ticket, Priority.valueOf(form.getOrDefault("priority", "MEDIUM")),
                Integer.parseInt(form.getOrDefault("slaHours", "8")));
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);

        if (form.containsKey("firstLevelResolved")) {
            workflow.addSolution(ticket, agent, "Resolved by first level support.");
        } else {
            workflow.escalateToSpecialist(ticket, specialist);
            workflow.investigateRootCause(ticket, specialist, "Root cause reviewed by specialist.");
            if (form.containsKey("vendorNeeded")) {
                workflow.openVendorRequest(ticket, "External Vendor", "support@vendor.example");
                workflow.receiveVendorResponse(ticket, "Vendor provided a workaround.");
            }
            workflow.applyFix(ticket, specialist, "Applied fix or workaround.");
        }

        workflow.updateResolution(ticket);
        if (form.containsKey("requesterAccepted")) {
            workflow.closeTicket(ticket);
            workflow.sendSatisfactionSurvey(ticket, requester, 5, "Resolved successfully.");
        } else {
            workflow.reopenTicket(ticket);
            workflow.escalateToSupervisor(ticket, supervisor);
        }
        database.save(ticket);
        database.addTicketHistory(ticket.getTicketId(), "CREATE", requester.fullName(), "Ticket created from web form");
        redirect(exchange, "/tickets");
    }

    private void assignTicket(HttpExchange exchange, String path) throws IOException {
        int ticketId = Integer.parseInt(path.replace("/tickets/", "").replace("/assign", ""));
        Map<String, String> form = readForm(exchange);
        String assigneeName = form.getOrDefault("assigneeName", "").trim();
        if (!assigneeName.isBlank()) {
            database.assignTicket(ticketId, assigneeName, form.getOrDefault("note", ""));
        }
        redirect(exchange, "/tickets/" + ticketId + "#assignment");
    }

    private void followUpTicket(HttpExchange exchange, String path) throws IOException {
        int ticketId = Integer.parseInt(path.replace("/tickets/", "").replace("/followup", ""));
        Map<String, String> form = readForm(exchange);
        database.addFollowUp(ticketId, form.getOrDefault("note", ""));
        redirect(exchange, "/tickets/" + ticketId + "#history");
    }

    private void closeTicket(HttpExchange exchange, String path) throws IOException {
        int ticketId = Integer.parseInt(path.replace("/tickets/", "").replace("/close", ""));
        Map<String, String> form = readForm(exchange);
        database.closeTicket(ticketId, form.getOrDefault("note", ""));
        redirect(exchange, "/tickets/" + ticketId + "#history");
    }

    private void addPrivateMessage(HttpExchange exchange, String path) throws IOException {
        int ticketId = Integer.parseInt(path.replace("/tickets/", "").replace("/message", ""));
        Map<String, String> form = readForm(exchange);
        String senderType = form.getOrDefault("senderType", "AGENT").trim();
        String senderName = form.getOrDefault("senderName", "Support Agent").trim();
        String message = form.getOrDefault("message", "").trim();
        if (!message.isBlank()) {
            database.addPrivateMessage(ticketId, senderType, senderName, message);
        }
        redirect(exchange, "/tickets/" + ticketId + "#conversation");
    }

    private void saveKeyword(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String keyword = form.getOrDefault("keyword", "").trim();
        if (!keyword.isBlank()) {
            database.saveKeyword(keyword);
        }
        redirect(exchange, "/pantip");
    }

    private void searchPantip(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String keyword = form.getOrDefault("keyword", "").trim();
        try {
            List<PantipTopic> topics = pantipSearchClient.search(keyword, 20);
            for (PantipTopic topic : topics) {
                if (database.pantipTopicExists(topic.topicId())) {
                    continue;
                }
                String content = pantipSearchClient.fetchTopicContent(topic.url());
                database.savePantipTopic(new PantipTopic(
                        topic.topicId(),
                        topic.keyword(),
                        topic.title(),
                        topic.url(),
                        content));
            }
            redirect(exchange, "/pantip");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException(exception);
        }
    }

    private void createTicketFromPantip(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String topicId = form.get("topicId");
        PantipTopicRecord topic = database.findPantipTopics().stream()
                .filter(item -> item.topicId().equals(topicId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Pantip topic not found: " + topicId));

        if (topic.ticketId() != null) {
            database.addTicketHistory(topic.ticketId(), "DUPLICATE_OPEN_ATTEMPT", "Pantip Monitor",
                    "Reused existing ticket for Pantip topic " + topic.topicId() + " (" + topic.url() + ")");
            redirect(exchange, "/tickets/" + topic.ticketId() + "#references");
            return;
        }

        TicketWorkflow workflow = workflow();
        User requester = new User(10, "Pantip Monitor", "pantip-monitor@example.com", Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        Ticket ticket = workflow.createTicket(requester, "[Pantip] " + topic.title(),
                "Keyword: " + topic.keyword() + System.lineSeparator()
                        + "Pantip topic ID: " + topic.topicId() + System.lineSeparator()
                        + "URL: " + topic.url() + System.lineSeparator()
                        + System.lineSeparator()
                        + "Content:" + System.lineSeparator()
                        + (topic.content() == null ? "" : topic.content()));
        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(1, "General Support"));
        workflow.setPriorityAndSla(ticket, Priority.MEDIUM, 24);
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);
        ticket.addHistory("Created from Pantip topic " + topic.topicId());
        database.save(ticket);
        database.addTicketHistory(ticket.getTicketId(), "CREATE", "Pantip Monitor", "Created from Pantip topic " + topic.topicId());
        database.markPantipTopicTicket(topic.topicId(), ticket.getTicketId());
        redirect(exchange, "/pantip");
    }

    private void searchSocial(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String source = form.getOrDefault("source", "PANTIP").trim();
        String keyword = form.getOrDefault("keyword", "").trim();
        try {
            for (SocialPost post : socialSearchClient.search(source, keyword, 20)) {
                if (!database.socialPostExists(post.source(), post.externalId())) {
                    database.saveSocialPost(post);
                }
            }
            redirect(exchange, "/social");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IOException(exception);
        }
    }

    private void createTicketFromSocial(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String source = form.get("source");
        String externalId = form.get("externalId");
        SocialPostRecord post = database.findSocialPosts().stream()
                .filter(item -> item.source().equals(source) && item.externalId().equals(externalId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Social post not found: " + source + "/" + externalId));

        if (post.ticketId() != null) {
            database.addTicketHistory(post.ticketId(), "DUPLICATE_OPEN_ATTEMPT", "Social Monitor",
                    "Reused existing ticket for " + post.source() + "/" + post.externalId() + " (" + post.url() + ")");
            redirect(exchange, "/tickets/" + post.ticketId() + "#references");
            return;
        }

        TicketWorkflow workflow = workflow();
        User requester = new User(11, "Social Monitor", "social-monitor@example.com", Role.REQUESTER);
        User agent = new User(2, "Support Agent", "agent@example.com", Role.SUPPORT_AGENT);
        Ticket ticket = workflow.createTicket(requester, "[" + post.source() + "] " + post.title(),
                "Source: " + post.source() + System.lineSeparator()
                        + "Keyword: " + post.keyword() + System.lineSeparator()
                        + "External ID: " + post.externalId() + System.lineSeparator()
                        + "Author: " + nullToBlank(post.author()) + System.lineSeparator()
                        + "URL: " + post.url() + System.lineSeparator()
                        + System.lineSeparator()
                        + "Content:" + System.lineSeparator()
                        + nullToBlank(post.content()));
        workflow.generateTicketId(ticket);
        workflow.classify(ticket, new Category(1, "General Support"));
        workflow.setPriorityAndSla(ticket, Priority.MEDIUM, 24);
        workflow.assignOwner(ticket, agent);
        workflow.notifyRequesterAndAssignee(ticket);
        ticket.addHistory("Created from social post " + post.source() + "/" + post.externalId());
        database.save(ticket);
        database.addTicketHistory(ticket.getTicketId(), "CREATE", "Social Monitor", "Created from social post " + post.source() + "/" + post.externalId());
        database.markSocialPostTicket(post.source(), post.externalId(), ticket.getTicketId());
        redirect(exchange, "/social");
    }

    private void createAplPayment(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String policyNo = form.getOrDefault("policyNo", "").trim();
        String collectionMethod = form.getOrDefault("collectionMethod", "QR").trim();
        database.createAplPayment(policyNo, collectionMethod);
        redirect(exchange, "/apl");
    }

    private void updateAplPaymentStatus(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        String paymentId = form.getOrDefault("paymentId", "").trim();
        String paymentResult = form.getOrDefault("paymentResult", "SUCCESS").trim();
        String responseCode = form.getOrDefault("responseCode", "0").trim();
        double paidAmount = parseMoney(form.getOrDefault("paidAmount", "0"));
        database.updateAplPaymentStatus(paymentId, paymentResult, responseCode, paidAmount);
        redirect(exchange, "/apl#payments");
    }

    private void confirmAplReceiptPrint(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        database.confirmAplReceiptPrint(
                form.getOrDefault("receiptNo", "").trim(),
                form.getOrDefault("paymentId", "").trim());
        redirect(exchange, "/apl/receipts");
    }

    private void approveAplReconcile(HttpExchange exchange) throws IOException {
        Map<String, String> form = readForm(exchange);
        database.approveAplReconcile(form.getOrDefault("paymentId", "").trim());
        redirect(exchange, "/apl/reconcile");
    }

    private void handleAplApi(HttpExchange exchange, String path) throws IOException {
        if (isPost(exchange) && "/api/apl/payments".equals(path)) {
            Map<String, String> form = readForm(exchange);
            try {
                AplPayment payment = database.createAplPayment(
                        form.getOrDefault("policyNo", "").trim(),
                        form.getOrDefault("collectionMethod", "QR").trim());
                renderJson(exchange, aplPaymentJson(payment), 201);
            } catch (IllegalArgumentException exception) {
                renderJson(exchange, "{\"error\":\"validation_failed\",\"message\":\""
                        + jsonEscape(exception.getMessage()) + "\"}", 400);
            }
            return;
        }
        if ((isPost(exchange) || isPut(exchange)) && "/api/apl/applications/payment-status".equals(path)) {
            Map<String, String> form = readForm(exchange);
            try {
                AplPayment payment = database.updateAplPaymentStatus(
                        form.getOrDefault("paymentId", "").trim(),
                        form.getOrDefault("paymentResult", "SUCCESS").trim(),
                        form.getOrDefault("responseCode", "0").trim(),
                        parseMoney(form.getOrDefault("paidAmount", "0")));
                renderJson(exchange, aplPaymentJson(payment), 200);
            } catch (IllegalArgumentException exception) {
                renderJson(exchange, "{\"error\":\"validation_failed\",\"message\":\""
                        + jsonEscape(exception.getMessage()) + "\"}", 400);
            }
            return;
        }
        if (isPost(exchange) && path.matches("/api/apl/receipts/[A-Za-z0-9-]+/confirm-print")) {
            String receiptNo = path.substring("/api/apl/receipts/".length(), path.length() - "/confirm-print".length());
            Map<String, String> form = readForm(exchange);
            database.confirmAplReceiptPrint(receiptNo, form.getOrDefault("paymentId", "").trim());
            renderJson(exchange, "{\"status\":\"CONFIRMED\"}", 200);
            return;
        }
        if (isPost(exchange) && path.matches("/api/apl/reconcile/[A-Za-z0-9-]+/approve")) {
            String paymentId = path.substring("/api/apl/reconcile/".length(), path.length() - "/approve".length());
            renderJson(exchange, aplPaymentJson(database.approveAplReconcile(paymentId)), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/receipts".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplReceipt> receipts = database.findAplReceipts();
            for (int i = 0; i < receipts.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplReceiptJson(receipts.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/reconcile/items".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplReconcileItem> items = database.findAplReconcileItems();
            for (int i = 0; i < items.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplReconcileJson(items.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/gl/transactions".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplGlTransaction> items = database.findAplGlTransactions();
            for (int i = 0; i < items.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplGlJson(items.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/reports/renewals".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplPayment> payments = database.findAplPayments();
            for (int i = 0; i < payments.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplPaymentJson(payments.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/payment-channels".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<PaymentChannel> channels = database.findPaymentChannels();
            for (int i = 0; i < channels.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(paymentChannelJson(channels.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/eligibility".equals(path)) {
            Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
            renderJson(exchange, aplEligibilityJson(database.checkAplEligibility(params.getOrDefault("policyNo", ""))), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/prepare".equals(path)) {
            Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
            AplPreparedPolicy preparedPolicy = database.prepareAplPolicy(params.getOrDefault("policyNo", ""));
            if (preparedPolicy == null) {
                renderJson(exchange, "{\"error\":\"policy_not_found\"}", 404);
                return;
            }
            renderJson(exchange, aplPreparedPolicyJson(preparedPolicy), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/policies".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplPolicy> policies = database.findAplPolicies();
            for (int i = 0; i < policies.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplPolicyJson(policies.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && path.matches("/api/apl/policies/[A-Za-z0-9-]+")) {
            String policyNo = path.substring("/api/apl/policies/".length());
            AplPolicy policy = database.findAplPolicy(policyNo);
            if (policy == null) {
                renderJson(exchange, "{\"error\":\"policy_not_found\"}", 404);
                return;
            }
            renderJson(exchange, aplPolicyJson(policy), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/quote".equals(path)) {
            Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
            AplQuote quote = database.quoteAplPayment(params.getOrDefault("policyNo", ""));
            if (quote == null) {
                renderJson(exchange, "{\"error\":\"policy_not_found\"}", 404);
                return;
            }
            renderJson(exchange, aplQuoteJson(quote), 200);
            return;
        }
        if ("GET".equalsIgnoreCase(exchange.getRequestMethod()) && "/api/apl/payments".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<AplPayment> payments = database.findAplPayments();
            for (int i = 0; i < payments.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(aplPaymentJson(payments.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        renderJson(exchange, "{\"error\":\"api_not_found\"}", 404);
    }

    private void handleConfigApi(HttpExchange exchange, String path) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            renderJson(exchange, "{\"error\":\"method_not_allowed\"}", 405);
            return;
        }
        if ("/api/config/payment-method-product-rules".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<PaymentMethodProductRule> rules = database.findPaymentMethodProductRules();
            for (int i = 0; i < rules.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(paymentMethodProductRuleJson(rules.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("/api/config/due-date-status-rules".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<DueDateStatusRule> rules = database.findDueDateStatusRules();
            for (int i = 0; i < rules.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(dueDateStatusRuleJson(rules.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if ("/api/config/premium-component-rules".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<ProductPremiumComponentRule> rules = database.findProductPremiumComponentRules();
            for (int i = 0; i < rules.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(productPremiumComponentRuleJson(rules.get(i)));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        renderJson(exchange, "{\"error\":\"api_not_found\"}", 404);
    }

    private void handleBacklogApi(HttpExchange exchange, String path) throws IOException {
        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            renderJson(exchange, "{\"error\":\"method_not_allowed\"}", 405);
            return;
        }
        if ("/api/backlog/epics".equals(path)) {
            StringBuilder json = new StringBuilder("[");
            List<EpicItem> epics = database.findEpics();
            for (int i = 0; i < epics.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(epicJson(epics.get(i), false));
            }
            json.append("]");
            renderJson(exchange, json.toString(), 200);
            return;
        }
        if (path.matches("/api/backlog/epics/[A-Za-z0-9-]+")) {
            String epicCode = path.substring("/api/backlog/epics/".length());
            EpicItem epic = database.findEpic(epicCode);
            if (epic == null) {
                renderJson(exchange, "{\"error\":\"epic_not_found\"}", 404);
                return;
            }
            renderJson(exchange, epicJson(epic, true), 200);
            return;
        }
        renderJson(exchange, "{\"error\":\"api_not_found\"}", 404);
    }

    private TicketWorkflow workflow() {
        TicketWorkflow workflow = new TicketWorkflow();
        workflow.setNextTicketId(database.nextTicketId());
        return workflow;
    }

    private boolean isPost(HttpExchange exchange) {
        return "POST".equalsIgnoreCase(exchange.getRequestMethod());
    }

    private boolean isPut(HttpExchange exchange) {
        return "PUT".equalsIgnoreCase(exchange.getRequestMethod());
    }

    private Map<String, String> readForm(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> params = new LinkedHashMap<>();
        if (body.isBlank()) {
            return params;
        }
        for (String pair : body.split("&")) {
            String[] parts = pair.split("=", 2);
            String key = decode(parts[0]);
            String value = parts.length > 1 ? decode(parts[1]) : "";
            params.put(key, value);
        }
        return params;
    }

    private String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private int currentPage() {
        String query = currentExchange.get().getRequestURI().getRawQuery();
        Map<String, String> params = parseQuery(query);
        try {
            return Math.max(1, Integer.parseInt(params.getOrDefault("page", "1")));
        } catch (NumberFormatException exception) {
            return 1;
        }
    }

    private Map<String, String> parseQuery(String query) {
        Map<String, String> params = new LinkedHashMap<>();
        if (query == null || query.isBlank()) {
            return params;
        }
        for (String pair : query.split("&")) {
            String[] parts = pair.split("=", 2);
            params.put(decode(parts[0]), parts.length > 1 ? decode(parts[1]) : "");
        }
        return params;
    }

    private String normalizeApiPath(String path) {
        if (path.startsWith("/api/v1/")) {
            return "/api/" + path.substring("/api/v1/".length());
        }
        return path;
    }

    private double parseMoney(String value) {
        try {
            return Double.parseDouble(value.replace(",", "").trim());
        } catch (RuntimeException exception) {
            return 0;
        }
    }

    private <T> PageSlice<T> paginate(List<T> items, int page, int pageSize) {
        int totalItems = items.size();
        int totalPages = Math.max(1, (int) Math.ceil(totalItems / (double) pageSize));
        int safePage = Math.min(Math.max(1, page), totalPages);
        int fromIndex = Math.min((safePage - 1) * pageSize, totalItems);
        int toIndex = Math.min(fromIndex + pageSize, totalItems);
        return new PageSlice<>(items.subList(fromIndex, toIndex), safePage, totalPages, pageSize, totalItems);
    }

    private String pagination(String path, PageSlice<?> slice) {
        if (slice.totalPages() <= 1) {
            return "<div class='pagination'><span>Showing " + slice.totalItems() + " item(s)</span></div>";
        }
        String previous = slice.page() > 1
                ? "<a class='button' href='" + path + "?page=" + (slice.page() - 1) + "'>Previous</a>"
                : "<span class='button disabled'>Previous</span>";
        String next = slice.page() < slice.totalPages()
                ? "<a class='button' href='" + path + "?page=" + (slice.page() + 1) + "'>Next</a>"
                : "<span class='button disabled'>Next</span>";
        return "<div class='pagination'>" + previous
                + "<span>Page " + slice.page() + " / " + slice.totalPages()
                + " | " + slice.totalItems() + " item(s), 10 per page</span>"
                + next + "</div>";
    }

    private void redirect(HttpExchange exchange, String location) throws IOException {
        exchange.getResponseHeaders().add("Location", location);
        exchange.sendResponseHeaders(303, -1);
        exchange.close();
    }

    private void render(HttpExchange exchange, String html) throws IOException {
        render(exchange, html, 200);
    }

    private void render(HttpExchange exchange, String html, int status) throws IOException {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private void renderJson(HttpExchange exchange, String json, int status) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    private String aplPolicyJson(AplPolicy policy) {
        return "{"
                + jsonField("policyNo", policy.policyNo()) + ","
                + jsonField("customerName", policy.customerName()) + ","
                + jsonField("appSource", policy.appSource()) + ","
                + jsonField("coreSystem", policy.coreSystem()) + ","
                + jsonField("productType", policy.productType()) + ","
                + jsonField("dueDate", policy.dueDate()) + ","
                + jsonField("dueDateStatus", database.evaluateDueDateStatus(policy.dueDate()).statusCode()) + ","
                + jsonField("dueDateStatusDescription", database.evaluateDueDateStatus(policy.dueDate()).description()) + ","
                + "\"aplDays\":" + policy.aplDays() + ","
                + "\"basePremium\":" + jsonNumber(policy.basePremium()) + ","
                + "\"riderPremium\":" + jsonNumber(policy.riderPremium()) + ","
                + "\"extraPremium\":" + jsonNumber(policy.extraPremium()) + ","
                + "\"topupPremium\":" + jsonNumber(policy.topupPremium()) + ","
                + "\"rspPremium\":" + jsonNumber(policy.rspPremium()) + ","
                + "\"interestAmount\":" + jsonNumber(policy.interestAmount()) + ","
                + "\"allowCreditCard\":" + policy.allowCreditCard() + ","
                + jsonField("status", policy.status())
                + "}";
    }

    private String aplQuoteJson(AplQuote quote) {
        return "{"
                + jsonField("policyNo", quote.policyNo()) + ","
                + "\"basePremium\":" + jsonNumber(quote.basePremium()) + ","
                + "\"riderPremium\":" + jsonNumber(quote.riderPremium()) + ","
                + "\"interestAmount\":" + jsonNumber(quote.interestAmount()) + ","
                + "\"totalPremium\":" + jsonNumber(quote.totalPremium()) + ","
                + "\"totalAmount\":" + jsonNumber(quote.totalAmount()) + ","
                + "\"hasInterest\":" + quote.hasInterest() + ","
                + "\"allowCreditCard\":" + quote.allowCreditCard()
                + "}";
    }

    private String paymentChannelJson(PaymentChannel channel) {
        return "{"
                + jsonField("channelCode", channel.channelCode()) + ","
                + jsonField("channelName", channel.channelName()) + ","
                + jsonField("phase", channel.phase()) + ","
                + "\"isEnabled\":" + channel.isEnabled() + ","
                + "\"allowApl\":" + channel.allowApl() + ","
                + "\"allowInterest\":" + channel.allowInterest() + ","
                + "\"creditCardRequired\":" + channel.creditCardRequired() + ","
                + jsonField("remark", channel.remark())
                + "}";
    }

    private String paymentMethodProductRuleJson(PaymentMethodProductRule rule) {
        return "{"
                + jsonField("channelCode", rule.channelCode()) + ","
                + jsonField("productType", rule.productType()) + ","
                + "\"supportMultiPeriodPayment\":" + rule.supportMultiPeriodPayment() + ","
                + "\"isSupported\":" + rule.isSupported() + ","
                + jsonField("dependencyApi", nullToBlank(rule.dependencyApi())) + ","
                + jsonField("remark", rule.remark())
                + "}";
    }

    private String dueDateStatusRuleJson(DueDateStatusRule rule) {
        return "{"
                + jsonField("statusCode", rule.statusCode()) + ","
                + jsonField("description", rule.description()) + ","
                + jsonField("expression", rule.expression()) + ","
                + "\"sortOrder\":" + rule.sortOrder()
                + "}";
    }

    private String productPremiumComponentRuleJson(ProductPremiumComponentRule rule) {
        return "{"
                + jsonField("productType", rule.productType()) + ","
                + jsonField("componentCode", rule.componentCode()) + ","
                + jsonField("componentName", rule.componentName()) + ","
                + jsonField("dataField", rule.dataField()) + ","
                + "\"sortOrder\":" + rule.sortOrder() + ","
                + "\"isEnabled\":" + rule.isEnabled()
                + "}";
    }

    private String aplEligibilityJson(AplEligibility eligibility) {
        return "{"
                + jsonField("policyNo", eligibility.policyNo()) + ","
                + "\"eligible\":" + eligibility.eligible() + ","
                + "\"validProduct\":" + eligibility.validProduct() + ","
                + "\"validPolicyStatus\":" + eligibility.validPolicyStatus() + ","
                + "\"validAplStatus\":" + eligibility.validAplStatus() + ","
                + "\"hasInterest\":" + eligibility.hasInterest() + ","
                + jsonField("message", eligibility.message())
                + "}";
    }

    private String aplPreparedPolicyJson(AplPreparedPolicy policy) {
        return "{"
                + jsonField("policyNo", policy.policyNo()) + ","
                + jsonField("customerName", policy.customerName()) + ","
                + jsonField("appSource", policy.appSource()) + ","
                + jsonField("coreSystem", policy.coreSystem()) + ","
                + jsonField("agentCode", policy.agentCode()) + ","
                + jsonField("exclusiveCode", policy.exclusiveCode()) + ","
                + "\"eligible\":" + policy.eligible() + ","
                + "\"totalAmount\":" + jsonNumber(policy.totalAmount())
                + "}";
    }

    private String aplPaymentJson(AplPayment payment) {
        return "{"
                + jsonField("paymentId", payment.paymentId()) + ","
                + jsonField("policyNo", payment.policyNo()) + ","
                + jsonField("collectionId", payment.collectionId()) + ","
                + jsonField("trxId", payment.trxId()) + ","
                + jsonField("tempRpNo", payment.tempRpNo()) + ","
                + jsonField("payPeriod", payment.payPeriod()) + ","
                + jsonField("referenceOne", payment.referenceOne()) + ","
                + jsonField("referenceTwo", payment.referenceTwo()) + ","
                + jsonField("referenceThree", payment.referenceThree()) + ","
                + jsonField("collectionMethod", payment.collectionMethod()) + ","
                + jsonField("paymentTypeDesc", payment.paymentTypeDesc()) + ","
                + jsonField("moduleType", payment.moduleType()) + ","
                + "\"basePremium\":" + jsonNumber(payment.basePremium()) + ","
                + "\"riderPremium\":" + jsonNumber(payment.riderPremium()) + ","
                + "\"interestAmount\":" + jsonNumber(payment.interestAmount()) + ","
                + "\"totalAmount\":" + jsonNumber(payment.totalAmount()) + ","
                + jsonField("receiptPremiumNo", payment.receiptPremiumNo()) + ","
                + jsonField("receiptInterestNo", nullToBlank(payment.receiptInterestNo())) + ","
                + jsonField("reconcileStatus", payment.reconcileStatus()) + ","
                + jsonField("transactionStatus", payment.transactionStatus()) + ","
                + jsonField("glStatus", payment.glStatus()) + ","
                + jsonField("smsStatus", payment.smsStatus()) + ","
                + jsonField("paymentStatus", nullToBlank(payment.paymentStatus())) + ","
                + "\"paidAmount\":" + jsonNumber(payment.paidAmount()) + ","
                + jsonField("responseCode", nullToBlank(payment.responseCode())) + ","
                + jsonField("processedAt", nullToBlank(payment.processedAt())) + ","
                + jsonField("createdAt", payment.createdAt())
                + "}";
    }

    private String aplReceiptJson(AplReceipt receipt) {
        return "{"
                + jsonField("receiptNo", receipt.receiptNo()) + ","
                + jsonField("paymentId", receipt.paymentId()) + ","
                + jsonField("policyNo", receipt.policyNo()) + ","
                + jsonField("receiptType", receipt.receiptType()) + ","
                + jsonField("printGroup", receipt.printGroup()) + ","
                + jsonField("printOwner", receipt.printOwner()) + ","
                + jsonField("printBatchNo", nullToBlank(receipt.printBatchNo())) + ","
                + jsonField("printStatus", receipt.printStatus()) + ","
                + jsonField("reconcileStatus", receipt.reconcileStatus()) + ","
                + "\"amount\":" + jsonNumber(receipt.amount()) + ","
                + jsonField("createdAt", receipt.createdAt())
                + "}";
    }

    private String aplReconcileJson(AplReconcileItem item) {
        return "{"
                + jsonField("paymentId", item.paymentId()) + ","
                + jsonField("policyNo", item.policyNo()) + ","
                + "\"expectedAmount\":" + jsonNumber(item.expectedAmount()) + ","
                + "\"paidAmount\":" + jsonNumber(item.paidAmount()) + ","
                + "\"diffAmount\":" + jsonNumber(item.diffAmount()) + ","
                + jsonField("matchKey", item.matchKey()) + ","
                + jsonField("reconcileStatus", item.reconcileStatus()) + ","
                + jsonField("reasonCode", item.reasonCode()) + ","
                + jsonField("owner", item.owner()) + ","
                + jsonField("note", item.note()) + ","
                + jsonField("createdAt", item.createdAt())
                + "}";
    }

    private String aplGlJson(AplGlTransaction item) {
        return "{"
                + jsonField("glTransactionId", item.glTransactionId()) + ","
                + jsonField("paymentId", item.paymentId()) + ","
                + jsonField("policyNo", item.policyNo()) + ","
                + jsonField("premiumType", item.premiumType()) + ","
                + jsonField("installmentNo", item.installmentNo()) + ","
                + jsonField("debitAccount", item.debitAccount()) + ","
                + jsonField("creditAccount", item.creditAccount()) + ","
                + "\"amount\":" + jsonNumber(item.amount()) + ","
                + jsonField("postingStatus", item.postingStatus()) + ","
                + jsonField("createdAt", item.createdAt())
                + "}";
    }

    private String epicJson(EpicItem epic, boolean includeChildren) {
        StringBuilder json = new StringBuilder("{")
                .append(jsonField("epicCode", epic.epicCode())).append(",")
                .append(jsonField("title", epic.title())).append(",")
                .append(jsonField("description", epic.description())).append(",")
                .append(jsonField("status", epic.status())).append(",")
                .append(jsonField("updatedAt", epic.updatedAt()));
        if (includeChildren) {
            json.append(",\"features\":[");
            List<FeatureItem> features = database.findFeatures(epic.epicCode());
            for (int i = 0; i < features.size(); i++) {
                if (i > 0) {
                    json.append(",");
                }
                json.append(featureJson(features.get(i)));
            }
            json.append("]");
        }
        json.append("}");
        return json.toString();
    }

    private String featureJson(FeatureItem feature) {
        StringBuilder json = new StringBuilder("{")
                .append(jsonField("featureCode", feature.featureCode())).append(",")
                .append(jsonField("epicCode", feature.epicCode())).append(",")
                .append("\"featureNo\":").append(feature.featureNo()).append(",")
                .append(jsonField("title", feature.title())).append(",")
                .append(jsonField("description", feature.description())).append(",")
                .append(jsonField("status", feature.status())).append(",")
                .append("\"userStories\":[");
        List<UserStoryItem> stories = database.findUserStories(feature.featureCode());
        for (int i = 0; i < stories.size(); i++) {
            if (i > 0) {
                json.append(",");
            }
            json.append(userStoryJson(stories.get(i)));
        }
        json.append("]");
        ImpactAnalysisItem impact = database.findImpactAnalysis(feature.featureCode());
        if (impact != null) {
            json.append(",\"impactAnalysis\":").append(impactJson(impact));
        }
        json.append("}");
        return json.toString();
    }

    private String userStoryJson(UserStoryItem story) {
        return "{"
                + jsonField("storyCode", story.storyCode()) + ","
                + jsonField("featureCode", story.featureCode()) + ","
                + "\"storyNo\":" + story.storyNo() + ","
                + jsonField("title", story.title()) + ","
                + jsonField("description", story.description()) + ","
                + jsonField("status", story.status())
                + "}";
    }

    private String impactJson(ImpactAnalysisItem impact) {
        return "{"
                + jsonField("iaCode", impact.iaCode()) + ","
                + jsonField("featureCode", impact.featureCode()) + ","
                + jsonField("title", impact.title()) + ","
                + jsonField("solution", impact.solution()) + ","
                + jsonField("status", impact.status())
                + "}";
    }

    private String jsonField(String key, String value) {
        return "\"" + key + "\":\"" + jsonEscape(value) + "\"";
    }

    private String jsonEscape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }

    private String jsonNumber(double value) {
        return String.format(Locale.US, "%.2f", value);
    }

    private String money(double value) {
        return String.format(Locale.US, "%,.2f", value);
    }

    private String statusClass(String status) {
        String value = status == null ? "" : status.toUpperCase(Locale.ROOT);
        if (value.contains("MATCHED") || value.contains("SUCCESS") || value.contains("READY")
                || value.contains("UPDATED") || value.contains("QUEUED")) {
            return "ok";
        }
        if (value.contains("FAILED") || value.contains("BLOCK")) {
            return "danger-soft";
        }
        if (value.contains("HOLD") || value.contains("WAIT") || value.contains("UNMATCHED")) {
            return "hold";
        }
        return "";
    }

    private String layout(String title, String body) {
        return """
                <!doctype html>
                <html lang="th">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>%s</title>
                  <style>
                    :root { color-scheme: light; --ink: #172033; --muted: #667085; --line: #d8dee8; --panel: #ffffff; --soft: #f7f9fc; --brand: #0f6b8f; --brand-dark: #0b5875; --danger: #b42318; --ok: #087443; }
                    html { scroll-behavior: smooth; }
                    * { box-sizing: border-box; }
                    body { margin: 0; font-family: Tahoma, "Leelawadee UI", "Segoe UI", Arial, sans-serif; background: #f4f7fb; color: var(--ink); }
                    a { color: var(--brand); font-weight: 600; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    header { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,.94); color: var(--ink); border-bottom: 1px solid var(--line); backdrop-filter: blur(10px); }
                    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; max-width: 1380px; margin: 0 auto; padding: 14px 22px; }
                    .brand { display: flex; align-items: center; gap: 10px; min-width: 230px; }
                    .brand-mark { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; background: #e0f2fe; color: var(--brand); font-weight: 800; }
                    header h1 { margin: 0; font-size: 18px; letter-spacing: 0; }
                    .brand small { display: block; color: var(--muted); font-size: 12px; margin-top: 2px; }
                    nav { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
                    nav a { color: #344054; padding: 8px 11px; border-radius: 8px; font-weight: 600; border: 1px solid transparent; }
                    nav a:hover { background: #f1f5f9; border-color: #e2e8f0; text-decoration: none; }
                    main { padding: 24px; max-width: 1380px; margin: 0 auto; }
                    .page-head { margin: 0 0 18px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
                    .page-head h2 { margin: 0; font-size: 26px; }
                    .page-head p { margin: 6px 0 0; color: var(--muted); }
                    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 20px; margin-bottom: 16px; box-shadow: 0 10px 24px rgba(16, 24, 40, .045); scroll-margin-top: 96px; }
                    .panel:target { outline: 3px solid #bae6fd; }
                    .panel h2 { margin: 0 0 16px; font-size: 18px; }
                    .grid { display: grid; grid-template-columns: repeat(2, minmax(240px, 1fr)); gap: 16px; }
                    .stack-form { display: grid; gap: 12px; }
                    .wide { grid-column: 1 / -1; }
                    label { display: grid; gap: 7px; font-weight: 600; color: #334155; }
                    input, select, textarea { font: inherit; padding: 11px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; color: var(--ink); }
                    input:focus, select:focus, textarea:focus { outline: 3px solid #dbeafe; border-color: #60a5fa; }
                    textarea { resize: vertical; }
                    .check { display: flex; align-items: center; gap: 8px; font-weight: 500; }
                    button, .button { font: inherit; border: 1px solid #b8c2d2; background: white; color: #172033; padding: 9px 14px; border-radius: 8px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; min-height: 38px; font-weight: 700; }
                    button:hover, .button:hover { border-color: #64748b; background: #f8fafc; }
                    .button.disabled { color: #94a3b8; background: #f8fafc; cursor: default; }
                    .primary { background: var(--brand); border-color: var(--brand); color: white; }
                    .primary:hover { background: var(--brand-dark); border-color: var(--brand-dark); }
                    .danger { background: var(--danger); border-color: var(--danger); color: white; }
                    .danger:hover { background: #991b1b; border-color: #991b1b; }
                    table { width: 100%%; border-collapse: separate; border-spacing: 0; font-size: 14px; overflow: hidden; border: 1px solid #e5eaf2; border-radius: 10px; background: white; }
                    th, td { border-bottom: 1px solid #edf1f6; padding: 12px 13px; text-align: left; vertical-align: top; }
                    tr:last-child td { border-bottom: 0; }
                    th { background: #f8fafc; color: #475467; font-size: 12px; text-transform: uppercase; letter-spacing: .02em; }
                    tbody tr:hover { background: #f7fbff; }
                    td p { margin: 6px 0 0; color: #475569; }
                    .status { background: #e0f2fe; color: #075985; padding: 4px 9px; border-radius: 999px; font-size: 12px; font-weight: 800; white-space: nowrap; }
                    .status.ok { background: #dcfce7; color: #166534; }
                    .status.hold { background: #fef3c7; color: #92400e; }
                    .status.danger-soft { background: #fee2e2; color: #991b1b; }
                    .inline-form { display: flex; gap: 8px; margin-bottom: 16px; }
                    .inline-form input { flex: 1; }
                    .section-title { display: flex; justify-content: space-between; align-items: center; }
                    .action-cell { display: flex; gap: 8px; flex-wrap: wrap; }
                    .pagination { display: flex; gap: 10px; align-items: center; justify-content: flex-end; padding-top: 14px; color: #475569; }
                    .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 12px; }
                    .detail-grid div { display: grid; gap: 5px; background: var(--soft); border: 1px solid #e2e8f0; border-radius: 10px; padding: 13px; }
                    .detail-grid strong { color: #475569; font-size: 12px; text-transform: uppercase; }
                    .messages { display: grid; gap: 10px; margin-bottom: 14px; }
                    .message { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; max-width: 760px; box-shadow: 0 4px 12px rgba(15, 23, 42, .04); }
                    .message span, .muted { color: #64748b; font-size: 13px; }
                    .message p { margin: 8px 0 0; white-space: pre-wrap; }
                    .message.customer { background: #ecfdf5; margin-left: auto; border-color: #bbf7d0; }
                    .message.agent { background: #f8fafc; }
                    .impact-box { margin-top: 14px; padding: 14px; border: 1px solid #bae6fd; border-radius: 10px; background: #f0f9ff; }
                    .impact-box p { margin: 7px 0 0; color: #475569; }
                    .detail-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; align-items: start; }
                    .side-stack { position: sticky; top: 96px; }
                    .loading-overlay { position: fixed; inset: 0; z-index: 99; display: none; align-items: center; justify-content: center; background: rgba(15, 23, 42, .36); backdrop-filter: blur(3px); }
                    .loading-overlay.active { display: flex; }
                    .loading-box { width: min(360px, calc(100vw - 40px)); background: white; border: 1px solid #dbe3ee; border-radius: 12px; padding: 22px; box-shadow: 0 24px 60px rgba(15, 23, 42, .24); }
                    .loader-row { display: flex; gap: 14px; align-items: center; }
                    .spinner { width: 38px; height: 38px; border-radius: 999px; border: 4px solid #dbeafe; border-top-color: var(--brand); animation: spin .9s linear infinite; flex: 0 0 auto; }
                    .loading-title { margin: 0; font-size: 17px; font-weight: 800; }
                    .loading-subtitle { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
                    .progress-track { height: 10px; background: #e5eaf2; border-radius: 999px; overflow: hidden; margin-top: 16px; }
                    .progress-bar { height: 100%%; width: 0%%; background: linear-gradient(90deg, var(--brand), #22c55e); border-radius: inherit; transition: width .18s ease; }
                    .progress-meta { display: flex; justify-content: space-between; margin-top: 9px; color: #475467; font-size: 13px; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    pre { white-space: pre-wrap; }
                    @media (max-width: 980px) { .detail-layout { grid-template-columns: 1fr; } .side-stack { position: static; } }
                    @media (max-width: 760px) { .topbar { align-items: flex-start; flex-direction: column; padding: 14px 16px; } nav { justify-content: flex-start; } main { padding: 14px; } .grid, .detail-grid { grid-template-columns: 1fr; } .inline-form, .section-title, .pagination, .page-head { align-items: stretch; flex-direction: column; } table { display: block; overflow-x: auto; } }
                  </style>
                </head>
                <body>
                  <header>
                    <div class="topbar">
                      <div class="brand"><div class="brand-mark">TM</div><div><h1>Ticket Management</h1><small>Monitor, route, and resolve customer issues</small></div></div>
                      <nav><a href="/">Create Ticket</a><a href="/apl">APL Payment</a><a href="/apl/receipts">Receipts</a><a href="/apl/reconcile">Reconcile</a><a href="/apl/gl">GL</a><a href="/apl/reports">Reports</a><a href="/roadmap">Roadmap</a><a href="/projects">Projects</a><a href="/tickets">List View</a><a href="/pantip">Pantip Monitor</a><a href="/social">Social Monitor</a><a href="/logout">Logout</a></nav>
                    </div>
                  </header>
                  <main><div class="page-head"><div><h2>%s</h2><p>Operational workspace for tickets and social monitoring.</p></div></div>%s</main>
                  <div class="loading-overlay" id="loadingOverlay" aria-live="polite" aria-hidden="true">
                    <div class="loading-box">
                      <div class="loader-row">
                        <div class="spinner"></div>
                        <div>
                          <p class="loading-title" id="loadingTitle">Processing request</p>
                          <p class="loading-subtitle" id="loadingSubtitle">Please wait while the application updates.</p>
                        </div>
                      </div>
                      <div class="progress-track"><div class="progress-bar" id="loadingBar"></div></div>
                      <div class="progress-meta"><span id="loadingStep">Starting</span><strong id="loadingPercent">0%%</strong></div>
                    </div>
                  </div>
                  <script>
                    (function () {
                      var overlay = document.getElementById("loadingOverlay");
                      var bar = document.getElementById("loadingBar");
                      var percentText = document.getElementById("loadingPercent");
                      var stepText = document.getElementById("loadingStep");
                      var titleText = document.getElementById("loadingTitle");
                      var subtitleText = document.getElementById("loadingSubtitle");
                      var timer = null;
                      function loadingCopy(form) {
                        var action = form.getAttribute("action") || "";
                        if (action.indexOf("/social/search") >= 0 || action.indexOf("/pantip/search") >= 0) {
                          return ["Searching and importing", "Fetching posts and skipping duplicates.", ["Connecting", "Searching", "Parsing results", "Saving new records"]];
                        }
                        if (action.indexOf("/apl/payments") >= 0) {
                          return ["Creating APL payment", "Calculating premium, receipts, reconcile, and GL.", ["Calculating", "Creating payment", "Writing receipts", "Reconciling", "Updating GL"]];
                        }
                        if (action.indexOf("/message") >= 0) {
                          return ["Sending message", "Saving the private customer conversation.", ["Validating", "Saving message", "Updating history"]];
                        }
                        if (action.indexOf("/close") >= 0) {
                          return ["Closing ticket", "Saving closure note and status.", ["Validating", "Updating status", "Writing history"]];
                        }
                        if (action.indexOf("/followup") >= 0) {
                          return ["Adding follow-up", "Saving note and ticket history.", ["Validating", "Saving note", "Refreshing ticket"]];
                        }
                        if (action.indexOf("/assign") >= 0) {
                          return ["Assigning ticket", "Updating assignee and history.", ["Validating", "Assigning owner", "Refreshing ticket"]];
                        }
                        return ["Processing request", "Please wait while the application updates.", ["Starting", "Saving", "Refreshing"]];
                      }
                      function showLoading(form) {
                        var copy = loadingCopy(form);
                        var percent = 0;
                        var steps = copy[2];
                        titleText.textContent = copy[0];
                        subtitleText.textContent = copy[1];
                        overlay.classList.add("active");
                        overlay.setAttribute("aria-hidden", "false");
                        function tick() {
                          percent = Math.min(96, percent + Math.max(1, Math.round((100 - percent) / 9)));
                          bar.style.width = percent + "%%";
                          percentText.textContent = percent + "%%";
                          var stepIndex = Math.min(steps.length - 1, Math.floor(percent / (100 / steps.length)));
                          stepText.textContent = steps[stepIndex];
                        }
                        tick();
                        timer = setInterval(tick, 260);
                      }
                      if (!location.hash) {
                        var saved = sessionStorage.getItem("ticketScrollY");
                        if (saved) {
                          requestAnimationFrame(function () { window.scrollTo(0, Number(saved)); });
                          sessionStorage.removeItem("ticketScrollY");
                        }
                      }
                      window.addEventListener("pageshow", function () {
                        if (timer) clearInterval(timer);
                        if (overlay) {
                          overlay.classList.remove("active");
                          overlay.setAttribute("aria-hidden", "true");
                          bar.style.width = "0%%";
                          percentText.textContent = "0%%";
                        }
                      });
                      document.addEventListener("submit", function (event) {
                        sessionStorage.setItem("ticketScrollY", String(window.scrollY));
                        showLoading(event.target);
                      });
                    }());
                  </script>
                </body>
                </html>
                """.formatted(escape(title), escape(title), body);
    }

    private String shortText(String value, int length) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.length() <= length ? value : value.substring(0, length).trim() + "...";
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String ticketLink(Integer ticketId) {
        if (ticketId == null) {
            return "";
        }
        return "<a href='/tickets/" + ticketId + "'>#" + ticketId + "</a>";
    }

    private String escapeAttribute(String value) {
        return escape(value).replace("\"", "&quot;");
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

record PageSlice<T>(
        List<T> items,
        int page,
        int totalPages,
        int pageSize,
        int totalItems) {
}
