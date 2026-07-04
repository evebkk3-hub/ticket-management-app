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
            statement.executeUpdate("""
                    create table if not exists projects (
                        project_code text primary key,
                        title text not null,
                        source_document text,
                        objectives text not null,
                        background text not null,
                        requirements text not null,
                        created_at text not null,
                        updated_at text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists agile_epics (
                        epic_code text primary key,
                        title text not null,
                        description text not null,
                        status text not null,
                        created_at text not null,
                        updated_at text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists agile_features (
                        feature_code text primary key,
                        epic_code text not null,
                        feature_no integer not null,
                        title text not null,
                        description text not null,
                        status text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists agile_user_stories (
                        story_code text primary key,
                        feature_code text not null,
                        story_no integer not null,
                        title text not null,
                        description text not null,
                        status text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists agile_impact_analysis (
                        ia_code text primary key,
                        feature_code text not null,
                        title text not null,
                        solution text not null,
                        status text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists apl_policies (
                        policy_no text primary key,
                        customer_name text not null,
                        app_source text not null,
                        core_system text not null,
                        apl_days integer not null,
                        base_premium real not null,
                        rider_premium real not null,
                        interest_amount real not null,
                        allow_credit_card integer not null,
                        status text not null
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists payment_channels (
                        channel_code text primary key,
                        channel_name text not null,
                        phase text not null,
                        is_enabled integer not null,
                        allow_apl integer not null,
                        allow_interest integer not null,
                        credit_card_required integer not null,
                        remark text
                    )
                    """);
            statement.executeUpdate("""
                    create table if not exists apl_payments (
                        payment_id text primary key,
                        policy_no text not null,
                        collection_id text,
                        trx_id text,
                        temp_rp_no text,
                        pay_period text,
                        reference_one text,
                        reference_two text,
                        reference_three text,
                        collection_method text not null,
                        payment_type_desc text,
                        module_type text,
                        base_premium real not null,
                        rider_premium real not null,
                        interest_amount real not null,
                        total_amount real not null,
                        receipt_premium_no text not null,
                        receipt_interest_no text,
                        reconcile_status text not null,
                        transaction_status text not null,
                        gl_status text not null,
                        sms_status text not null,
                        payment_status text not null default 'CREATED',
                        paid_amount real,
                        response_code text,
                        processed_at text,
                        created_at text not null
                    )
                    """);
            ensureColumn(connection, "pantip_topics", "content", "text");
            ensureColumn(connection, "apl_payments", "collection_id", "text");
            ensureColumn(connection, "apl_payments", "trx_id", "text");
            ensureColumn(connection, "apl_payments", "temp_rp_no", "text");
            ensureColumn(connection, "apl_payments", "pay_period", "text");
            ensureColumn(connection, "apl_payments", "reference_one", "text");
            ensureColumn(connection, "apl_payments", "reference_two", "text");
            ensureColumn(connection, "apl_payments", "reference_three", "text");
            ensureColumn(connection, "apl_payments", "payment_type_desc", "text");
            ensureColumn(connection, "apl_payments", "module_type", "text");
            ensureColumn(connection, "apl_payments", "payment_status", "text not null default 'CREATED'");
            ensureColumn(connection, "apl_payments", "paid_amount", "real");
            ensureColumn(connection, "apl_payments", "response_code", "text");
            ensureColumn(connection, "apl_payments", "processed_at", "text");
            seedAplPaymentProject(connection);
            seedR3Backlog(connection);
            seedPaymentChannels(connection);
            seedAplPolicies(connection);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to initialize SQLite database.", exception);
        }
    }

    private void seedAplPaymentProject(Connection connection) throws SQLException {
        String sql = """
                insert into projects (
                    project_code, title, source_document, objectives, background, requirements, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                on conflict(project_code) do update set
                    title = excluded.title,
                    source_document = excluded.source_document,
                    objectives = excluded.objectives,
                    background = excluded.background,
                    requirements = excluded.requirements,
                    updated_at = datetime('now')
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, "APL-RYP-PAYMENT");
            statement.setString(2, "รับชำระเบี้ยประกันภัย RYP ในช่วง APL");
            statement.setString(3, "Business Flow Receipt APL.vsdx");
            statement.setString(4, """
                    1. เพื่อพัฒนาแอปพลิเคชั่น TL Smart และ TLI App ให้สามารถรับชำระเบี้ยประกันภัย RYP ในช่วง APL ได้

                    2. เพื่อพัฒนาระบบ Core System ให้รองรับการรับชำระเบี้ยประกันภัย RYP ในช่วง APL
                    """);
            statement.setString(5, """
                    ปัจจุบันฝ่ายขายสามารถเก็บเบี้ยชำระงวดต่อจากลูกค้าได้ใน Application TL Smart เฉพาะกรมธรรม์ที่เกิด APL ไม่เกิน 90 วัน

                    จึงต้องพัฒนาฟังก์ชันการรับชำระเบี้ยประกันภัยปีต่อกรณีที่กรมธรรม์ของลูกค้าเกิด APL เกิน 90 วัน และมีดอกเบี้ย โดยสามารถชำระผ่านช่องทาง QR Code และ Credit Card เพื่อเพิ่มความสะดวกให้ฝ่ายขายในการรับชำระเบี้ยจากลูกค้าให้ครอบคลุมยิ่งขึ้น
                    """);
            statement.setString(6, """
                    1. พัฒนาเงื่อนไขการเตรียมข้อมูลให้สามารถรองรับการชำระเบี้ยประกันภัยและดอกเบี้ยเบี้ยประกันช่วง APL ผ่านแอปพลิเคชั่น TL Smart และ Thailife Application (TLI App) ได้

                    2. พัฒนาการคำนวณเบี้ยและดอกเบี้ยแบบ realtime

                    3. พัฒนาแอปพลิเคชั่น TL Smart และ Thailife Application (TLI App) ให้สามารถรองรับการชำระเบี้ยประกันภัยและดอกเบี้ยเบี้ยประกันช่วง APL ได้ทั้งกรมธรรม์ InsureMo และ Legacy

                    3.1 เงื่อนไขกรมธรรม์ที่สามารถชำระเบี้ยประกันภัยและดอกเบี้ยเบี้ยประกันช่วง APL บน TL Smart ได้
                    - กรมธรรม์ที่มีดอกเบี้ย
                    - กรมธรรม์ที่ไม่มีดอกเบี้ย

                    3.2 การแสดงข้อมูลกรมธรรม์และรายละเอียดเบี้ยประกันบนแอปพลิเคชั่น TL Smart

                    3.3 ช่องทางการชำระเบี้ย (Collection Method) ที่สามารถรับชำระเบี้ยประกันภัยและดอกเบี้ยเบี้ยประกันภัยบน TL Smart
                    Phase 1: QR และ Credit Card
                    - Credit Card เฉพาะแบบประกันที่รับบัตรเครดิตได้
                    Phase 2: Direct Debit One time (RYP) และ Cheque

                    3.4 การส่ง SMS เมื่อมีการชำระเบี้ยปีต่อสำเร็จ
                    - Content SMS สำหรับ QR และ Credit Card

                    4. พัฒนาระบบเพื่อรองรับการจัดส่งใบเสร็จเบี้ยประกันภัย และใบเสร็จดอกเบี้ยเบี้ยประกัน (ใบเสร็จทั่วไป)

                    4.1 รูปแบบใบเสร็จเบี้ยประกัน และใบเสร็จดอกเบี้ยเบี้ยประกัน (ใบเสร็จทั่วไป) ในรูปแบบกระดาษ
                    - เลขที่ใบเสร็จ
                    - ใบเสร็จเบี้ยพิมพ์ที่พี่อ๋อย โดยพี่อ๋อย running เลขที่ใบเสร็จ
                    - ใบเสร็จทั่วไปพิมพ์ที่พี่หน่า โดยพี่หน่า running เลขที่ใบเสร็จ

                    4.2 พัฒนาระบบเพื่อรองรับการพิมพ์ใบเสร็จทั่วไป (Outsource Printing)
                    - ปรับระบบพิมพ์ใบเสร็จเบี้ยให้ sorting แยกตามกลุ่มดอกเบี้ยและไม่ดอกเบี้ย
                    - เพิ่มระบบพิมพ์ใบเสร็จดอกเบี้ยเบี้ยประกันที่งานคลังเอกสาร
                    - เพิ่มใบปะหน้าสำหรับการพิมพ์ที่ centralized printing
                    - การ confirm เพื่อส่งพิมพ์ใบเสร็จ ระบบจะเช็คก่อนว่าเบี้ยตรงกันหรือไม่ ถ้าเบี้ยตรงจะส่งได้เลย ถ้าเบี้ยไม่ตรง ข้อมูลจะค้างอยู่ที่ระบบ reconcile
                    - ใบเสร็จ As is x To be: ระบุ field ที่เปลี่ยน เช่น ชื่อ ผอป, ชื่อ ผรป, หมายเหตุ
                    - ใบเสร็จทั่วไป As is x To be พร้อม field
                    - การส่งข้อมูลไประบบ Printing: แปะ flow data และระบุจุด reconcile ข้อมูลของการเงิน

                    5. การพัฒนาการ Update Transaction
                    5.2 กรมธรรม์บน Legacy ใน Master + Transaction ต่อสัญญา
                    5.3 พัฒนาการ Update transaction loan กรมธรรม์บน InsureMo

                    6. การพัฒนาการคำนวณผลประโยชน์สำหรับการชำระเบี้ย APL
                    - แยกเบี้ยชีวิต/rider
                    - แยกตามงวด
                    - ไม่ต้องการดอกเบี้ย สามารถเป็นยอดรวมได้

                    7. พัฒนาระบบ reconcile เงินของ Team Collection การชำระเบี้ย APL (Auto reconcile)
                    - ไม่ต้องแยกเบี้ยและดอกเบี้ย
                    - ไม่ต้องแยกงวด

                    8. พัฒนาระบบ GL Transaction
                    - แยกเบี้ยชีวิต/rider
                    - แยกตามงวด
                    - ไม่ต้องแยกงวดดอกเบี้ย สามารถเป็นยอดรวมได้

                    9. การออกรายงาน
                    - รายงานการต่อสัญญา
                    """);
            statement.executeUpdate();
        }
    }

    private void seedR3Backlog(Connection connection) throws SQLException {
        upsertEpic(connection, "R3", "e-RYP รองรับการชำระเบี้ย APL ผ่าน TL Smart / TLI App",
                "APL Payment for Legacy Policy: structure from Epic to Feature, User Story, and Impact Analysis.",
                "READY");

        upsertFeature(connection, "R3-F01", "R3", 1, "Policy Eligibility",
                "Validate product type, policy status, and APL status before allowing payment.", "READY");
        upsertStory(connection, "US-01", "R3-F01", 1, "Validate Product Type",
                "As TL Smart/TLI App, I want to validate product type so only eligible products can pay APL premium.", "READY");
        upsertStory(connection, "US-02", "R3-F01", 2, "Validate Policy Status",
                "As TL Smart/TLI App, I want to validate policy status before showing payment options.", "READY");
        upsertStory(connection, "US-03", "R3-F01", 3, "Validate APL Status",
                "As TL Smart/TLI App, I want to validate APL status including over 90 days and interest conditions.", "READY");
        upsertImpact(connection, "IA-01", "R3-F01", "Eligibility Impact Analysis",
                "Add eligibility service and validation rules for product, policy, and APL status. Block unsupported policies before quote/payment.", "READY");

        upsertFeature(connection, "R3-F02", "R3", 2, "Prepare Policy Data",
                "Prepare policy, agent, and exclusive information for APL payment.", "READY");
        upsertStory(connection, "US-04", "R3-F02", 4, "Prepare Policy",
                "As the payment service, I want to prepare policy data from Legacy/InsureMo before calculating payment.", "READY");
        upsertStory(connection, "US-05", "R3-F02", 5, "Prepare Agent",
                "As the system, I want to prepare agent information for sales ownership, audit, and notification.", "READY");
        upsertStory(connection, "US-06", "R3-F02", 6, "Prepare Exclusive",
                "As the system, I want to prepare exclusive campaign/condition data where applicable.", "READY");
        upsertImpact(connection, "IA-02", "R3-F02", "Policy Data Preparation Impact Analysis",
                "Map policy, agent, and exclusive data from source systems into APL payment context before quote creation.", "READY");

        upsertFeature(connection, "R3-F03", "R3", 3, "Premium & Interest",
                "Get premium, get interest, and calculate total payable amount in realtime.", "READY");
        upsertStory(connection, "US-07", "R3-F03", 7, "Get Premium",
                "As TL Smart/TLI App, I want to get life and rider premium separated by period.", "READY");
        upsertStory(connection, "US-08", "R3-F03", 8, "Get Interest",
                "As TL Smart/TLI App, I want to get APL interest where policy has interest.", "READY");
        upsertStory(connection, "US-09", "R3-F03", 9, "Calculate Total",
                "As TL Smart/TLI App, I want to calculate total premium plus interest in realtime.", "READY");
        upsertImpact(connection, "IA-03", "R3-F03", "Premium & Interest Impact Analysis",
                "Expose quote API that separates base premium, rider premium, interest, total premium, and total amount.", "READY");

        upsertFeature(connection, "R3-F04", "R3", 4, "Payment",
                "Support QR payment, credit card payment, and payment callback/result checking.", "READY");
        upsertStory(connection, "US-10", "R3-F04", 10, "QR Payment",
                "As a user, I want to pay APL premium by QR Code.", "READY");
        upsertStory(connection, "US-11", "R3-F04", 11, "Credit Card",
                "As a user, I want to pay APL premium by Credit Card when product allows cards.", "READY");
        upsertStory(connection, "US-12", "R3-F04", 12, "Payment Callback",
                "As the system, I want to process payment callback/check payment result and avoid duplicate processing.", "READY");
        upsertImpact(connection, "IA-04", "R3-F04", "Payment Impact Analysis",
                "Add payment transaction fields such as collectionId, trxId, tempRpNo, references, paymentTypeDesc, and moduleType.", "READY");

        upsertFeature(connection, "R3-F05", "R3", 5, "Receipt",
                "Generate and print premium and interest receipts.", "READY");
        upsertStory(connection, "US-13", "R3-F05", 13, "Generate Receipt",
                "As the system, I want to generate premium receipt and interest receipt numbers after successful payment.", "READY");
        upsertStory(connection, "US-14", "R3-F05", 14, "Print Receipt",
                "As operations, I want receipt printing data prepared for premium and general interest receipts.", "READY");
        upsertImpact(connection, "IA-05", "R3-F05", "Receipt Impact Analysis",
                "Add receipt generation and printing integration fields, including sorting by interest/no-interest groups.", "READY");

        upsertFeature(connection, "R3-F06", "R3", 6, "Legacy Update",
                "Update Legacy and InsureMo after successful APL payment.", "READY");
        upsertStory(connection, "US-15", "R3-F06", 15, "Update Legacy",
                "As Core System, I want to update Legacy master/transaction renewal data after payment.", "READY");
        upsertStory(connection, "US-16", "R3-F06", 16, "Update InsureMo",
                "As Core System, I want to update InsureMo loan transaction after APL payment.", "READY");
        upsertImpact(connection, "IA-06", "R3-F06", "Legacy/InsureMo Update Impact Analysis",
                "Route successful payment update to Legacy or InsureMo based on policy core system.", "READY");

        upsertFeature(connection, "R3-F07", "R3", 7, "GL & Reconcile",
                "Generate GL transaction and reconcile collection payment.", "READY");
        upsertStory(connection, "US-17", "R3-F07", 17, "GL Transaction",
                "As accounting, I want GL transaction separated by life/rider and payment period.", "READY");
        upsertStory(connection, "US-18", "R3-F07", 18, "Reconcile",
                "As Team Collection, I want auto reconcile for APL payment without separating premium/interest or period.", "READY");
        upsertImpact(connection, "IA-07", "R3-F07", "GL & Reconcile Impact Analysis",
                "Set reconcile status, GL readiness, and downstream accounting output after payment success.", "READY");

        upsertFeature(connection, "R3-F08", "R3", 8, "Notification",
                "Send APL and interest notifications after payment.", "READY");
        upsertStory(connection, "US-19", "R3-F08", 19, "APL Notification",
                "As the system, I want to notify customer/agent when APL payment succeeds.", "READY");
        upsertStory(connection, "US-20", "R3-F08", 20, "Interest Notification",
                "As the system, I want to notify customer/agent when interest receipt or interest payment applies.", "READY");
        upsertImpact(connection, "IA-08", "R3-F08", "Notification Impact Analysis",
                "Queue SMS/notification content for QR and Credit Card payment, including interest-related messages.", "READY");
    }

    private void upsertEpic(Connection connection, String epicCode, String title, String description, String status)
            throws SQLException {
        String sql = """
                insert into agile_epics (epic_code, title, description, status, created_at, updated_at)
                values (?, ?, ?, ?, datetime('now'), datetime('now'))
                on conflict(epic_code) do update set
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status,
                    updated_at = datetime('now')
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, epicCode);
            statement.setString(2, title);
            statement.setString(3, description);
            statement.setString(4, status);
            statement.executeUpdate();
        }
    }

    private void upsertFeature(Connection connection, String featureCode, String epicCode, int featureNo,
            String title, String description, String status) throws SQLException {
        String sql = """
                insert into agile_features (feature_code, epic_code, feature_no, title, description, status)
                values (?, ?, ?, ?, ?, ?)
                on conflict(feature_code) do update set
                    epic_code = excluded.epic_code,
                    feature_no = excluded.feature_no,
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, featureCode);
            statement.setString(2, epicCode);
            statement.setInt(3, featureNo);
            statement.setString(4, title);
            statement.setString(5, description);
            statement.setString(6, status);
            statement.executeUpdate();
        }
    }

    private void upsertStory(Connection connection, String storyCode, String featureCode, int storyNo,
            String title, String description, String status) throws SQLException {
        String sql = """
                insert into agile_user_stories (story_code, feature_code, story_no, title, description, status)
                values (?, ?, ?, ?, ?, ?)
                on conflict(story_code) do update set
                    feature_code = excluded.feature_code,
                    story_no = excluded.story_no,
                    title = excluded.title,
                    description = excluded.description,
                    status = excluded.status
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, storyCode);
            statement.setString(2, featureCode);
            statement.setInt(3, storyNo);
            statement.setString(4, title);
            statement.setString(5, description);
            statement.setString(6, status);
            statement.executeUpdate();
        }
    }

    private void upsertImpact(Connection connection, String iaCode, String featureCode, String title,
            String solution, String status) throws SQLException {
        String sql = """
                insert into agile_impact_analysis (ia_code, feature_code, title, solution, status)
                values (?, ?, ?, ?, ?)
                on conflict(ia_code) do update set
                    feature_code = excluded.feature_code,
                    title = excluded.title,
                    solution = excluded.solution,
                    status = excluded.status
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, iaCode);
            statement.setString(2, featureCode);
            statement.setString(3, title);
            statement.setString(4, solution);
            statement.setString(5, status);
            statement.executeUpdate();
        }
    }

    private void seedAplPolicies(Connection connection) throws SQLException {
        String sql = """
                insert into apl_policies (
                    policy_no, customer_name, app_source, core_system, apl_days,
                    base_premium, rider_premium, interest_amount, allow_credit_card, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(policy_no) do nothing
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            insertAplPolicy(statement, "APL100001", "Somchai Demo", "TL Smart", "Legacy", 120,
                    18500.00, 2500.00, 740.50, true, "APL_OVER_90");
            insertAplPolicy(statement, "APL100002", "Suda Demo", "TLI App", "InsureMo", 45,
                    12600.00, 0.00, 0.00, true, "APL_UNDER_90");
            insertAplPolicy(statement, "APL100003", "Narin Demo", "TL Smart", "InsureMo", 180,
                    22100.00, 4200.00, 1510.75, false, "APL_OVER_90_CC_NOT_ALLOWED");
        }
    }

    private void insertAplPolicy(PreparedStatement statement, String policyNo, String customerName, String appSource,
            String coreSystem, int aplDays, double basePremium, double riderPremium, double interestAmount,
            boolean allowCreditCard, String status) throws SQLException {
        statement.setString(1, policyNo);
        statement.setString(2, customerName);
        statement.setString(3, appSource);
        statement.setString(4, coreSystem);
        statement.setInt(5, aplDays);
        statement.setDouble(6, basePremium);
        statement.setDouble(7, riderPremium);
        statement.setDouble(8, interestAmount);
        statement.setInt(9, allowCreditCard ? 1 : 0);
        statement.setString(10, status);
        statement.executeUpdate();
    }

    private void seedPaymentChannels(Connection connection) throws SQLException {
        String sql = """
                insert into payment_channels (
                    channel_code, channel_name, phase, is_enabled, allow_apl, allow_interest,
                    credit_card_required, remark
                ) values (?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(channel_code) do update set
                    channel_name = excluded.channel_name,
                    phase = excluded.phase,
                    is_enabled = excluded.is_enabled,
                    allow_apl = excluded.allow_apl,
                    allow_interest = excluded.allow_interest,
                    credit_card_required = excluded.credit_card_required,
                    remark = excluded.remark
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            insertPaymentChannel(statement, "QR", "QR Code", "PHASE_1", true, true, true, false,
                    "Active for APL premium and interest payment.");
            insertPaymentChannel(statement, "CREDIT_CARD", "Credit Card", "PHASE_1", true, true, true, true,
                    "Allowed only when policy/product supports credit card.");
            insertPaymentChannel(statement, "DIRECT_DEBIT", "Direct Debit One Time (RYP)", "PHASE_2", false, true, true,
                    false, "Planned for Phase 2.");
            insertPaymentChannel(statement, "CHEQUE", "Cheque", "PHASE_2", false, true, true, false,
                    "Planned for Phase 2.");
        }
    }

    private void insertPaymentChannel(PreparedStatement statement, String channelCode, String channelName, String phase,
            boolean isEnabled, boolean allowApl, boolean allowInterest, boolean creditCardRequired, String remark)
            throws SQLException {
        statement.setString(1, channelCode);
        statement.setString(2, channelName);
        statement.setString(3, phase);
        statement.setInt(4, isEnabled ? 1 : 0);
        statement.setInt(5, allowApl ? 1 : 0);
        statement.setInt(6, allowInterest ? 1 : 0);
        statement.setInt(7, creditCardRequired ? 1 : 0);
        statement.setString(8, remark);
        statement.executeUpdate();
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

    List<ProjectItem> findProjects() {
        String sql = """
                select project_code, title, source_document, updated_at
                from projects
                order by updated_at desc
                """;
        List<ProjectItem> projects = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                projects.add(new ProjectItem(
                        resultSet.getString("project_code"),
                        resultSet.getString("title"),
                        resultSet.getString("source_document"),
                        resultSet.getString("updated_at")));
            }
            return projects;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load projects.", exception);
        }
    }

    ProjectDetail findProject(String projectCode) {
        String sql = """
                select project_code, title, source_document, objectives, background, requirements, created_at, updated_at
                from projects
                where project_code = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, projectCode);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return null;
                }
                return new ProjectDetail(
                        resultSet.getString("project_code"),
                        resultSet.getString("title"),
                        resultSet.getString("source_document"),
                        resultSet.getString("objectives"),
                        resultSet.getString("background"),
                        resultSet.getString("requirements"),
                        resultSet.getString("created_at"),
                        resultSet.getString("updated_at"));
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load project detail.", exception);
        }
    }

    List<EpicItem> findEpics() {
        String sql = """
                select epic_code, title, description, status, updated_at
                from agile_epics
                order by epic_code
                """;
        List<EpicItem> epics = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                epics.add(new EpicItem(
                        resultSet.getString("epic_code"),
                        resultSet.getString("title"),
                        resultSet.getString("description"),
                        resultSet.getString("status"),
                        resultSet.getString("updated_at")));
            }
            return epics;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load epics.", exception);
        }
    }

    EpicItem findEpic(String epicCode) {
        String sql = """
                select epic_code, title, description, status, updated_at
                from agile_epics
                where epic_code = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, epicCode);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return null;
                }
                return new EpicItem(
                        resultSet.getString("epic_code"),
                        resultSet.getString("title"),
                        resultSet.getString("description"),
                        resultSet.getString("status"),
                        resultSet.getString("updated_at"));
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load epic.", exception);
        }
    }

    List<FeatureItem> findFeatures(String epicCode) {
        String sql = """
                select feature_code, epic_code, feature_no, title, description, status
                from agile_features
                where epic_code = ?
                order by feature_no
                """;
        List<FeatureItem> features = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, epicCode);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    features.add(new FeatureItem(
                            resultSet.getString("feature_code"),
                            resultSet.getString("epic_code"),
                            resultSet.getInt("feature_no"),
                            resultSet.getString("title"),
                            resultSet.getString("description"),
                            resultSet.getString("status")));
                }
            }
            return features;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load features.", exception);
        }
    }

    List<UserStoryItem> findUserStories(String featureCode) {
        String sql = """
                select story_code, feature_code, story_no, title, description, status
                from agile_user_stories
                where feature_code = ?
                order by story_no
                """;
        List<UserStoryItem> stories = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, featureCode);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    stories.add(new UserStoryItem(
                            resultSet.getString("story_code"),
                            resultSet.getString("feature_code"),
                            resultSet.getInt("story_no"),
                            resultSet.getString("title"),
                            resultSet.getString("description"),
                            resultSet.getString("status")));
                }
            }
            return stories;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load user stories.", exception);
        }
    }

    ImpactAnalysisItem findImpactAnalysis(String featureCode) {
        String sql = """
                select ia_code, feature_code, title, solution, status
                from agile_impact_analysis
                where feature_code = ?
                order by ia_code
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, featureCode);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (!resultSet.next()) {
                    return null;
                }
                return new ImpactAnalysisItem(
                        resultSet.getString("ia_code"),
                        resultSet.getString("feature_code"),
                        resultSet.getString("title"),
                        resultSet.getString("solution"),
                        resultSet.getString("status"));
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load impact analysis.", exception);
        }
    }

    List<PaymentChannel> findPaymentChannels() {
        String sql = """
                select channel_code, channel_name, phase, is_enabled, allow_apl, allow_interest,
                       credit_card_required, remark
                from payment_channels
                order by phase, channel_code
                """;
        List<PaymentChannel> channels = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                channels.add(paymentChannel(resultSet));
            }
            return channels;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load payment channels.", exception);
        }
    }

    AplEligibility checkAplEligibility(String policyNo) {
        AplPolicy policy = findAplPolicy(policyNo);
        if (policy == null) {
            return new AplEligibility(policyNo, false, false, false, false, false,
                    "Policy not found.");
        }
        boolean validProduct = true;
        boolean validPolicyStatus = policy.status().startsWith("APL_");
        boolean validAplStatus = policy.aplDays() > 0;
        boolean hasInterest = policy.interestAmount() > 0;
        boolean eligible = validProduct && validPolicyStatus && validAplStatus;
        String message = eligible
                ? "Policy is eligible for APL/RYP payment."
                : "Policy is not eligible for APL/RYP payment.";
        return new AplEligibility(policy.policyNo(), eligible, validProduct, validPolicyStatus,
                validAplStatus, hasInterest, message);
    }

    AplPreparedPolicy prepareAplPolicy(String policyNo) {
        AplPolicy policy = findAplPolicy(policyNo);
        AplQuote quote = quoteAplPayment(policyNo);
        AplEligibility eligibility = checkAplEligibility(policyNo);
        if (policy == null || quote == null) {
            return null;
        }
        String agentCode = "AGT-" + policy.policyNo().substring(Math.max(0, policy.policyNo().length() - 4));
        String exclusiveCode = policy.aplDays() > 90 ? "APL_OVER_90_INTEREST" : "APL_STANDARD";
        return new AplPreparedPolicy(policy.policyNo(), policy.customerName(), policy.appSource(),
                policy.coreSystem(), agentCode, exclusiveCode, eligibility.eligible(), quote.totalAmount());
    }

    List<AplPolicy> findAplPolicies() {
        String sql = """
                select policy_no, customer_name, app_source, core_system, apl_days,
                       base_premium, rider_premium, interest_amount, allow_credit_card, status
                from apl_policies
                order by policy_no
                """;
        List<AplPolicy> policies = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                policies.add(aplPolicy(resultSet));
            }
            return policies;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load APL policies.", exception);
        }
    }

    AplPolicy findAplPolicy(String policyNo) {
        String sql = """
                select policy_no, customer_name, app_source, core_system, apl_days,
                       base_premium, rider_premium, interest_amount, allow_credit_card, status
                from apl_policies
                where policy_no = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, policyNo);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? aplPolicy(resultSet) : null;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load APL policy.", exception);
        }
    }

    AplQuote quoteAplPayment(String policyNo) {
        AplPolicy policy = findAplPolicy(policyNo);
        if (policy == null) {
            return null;
        }
        double totalPremium = policy.basePremium() + policy.riderPremium();
        double totalAmount = totalPremium + policy.interestAmount();
        return new AplQuote(
                policy.policyNo(),
                policy.basePremium(),
                policy.riderPremium(),
                policy.interestAmount(),
                totalPremium,
                totalAmount,
                policy.interestAmount() > 0,
                policy.allowCreditCard());
    }

    AplPayment createAplPayment(String policyNo, String collectionMethod) {
        AplPolicy policy = findAplPolicy(policyNo);
        if (policy == null) {
            throw new IllegalArgumentException("APL policy not found: " + policyNo);
        }
        if ("CREDIT_CARD".equals(collectionMethod) && !policy.allowCreditCard()) {
            throw new IllegalArgumentException("Credit Card is not allowed for policy: " + policyNo);
        }
        if (!List.of("QR", "CREDIT_CARD", "DIRECT_DEBIT", "CHEQUE").contains(collectionMethod)) {
            throw new IllegalArgumentException("Unsupported collection method: " + collectionMethod);
        }

        AplQuote quote = quoteAplPayment(policyNo);
        String paymentId = "APL" + System.currentTimeMillis();
        String collectionId = "COL" + paymentId.substring(3);
        String trxId = "TRX" + paymentId.substring(3);
        String tempRpNo = "TMP" + paymentId.substring(3);
        String payPeriod = policy.aplDays() > 90 ? "APL_OVER_90" : "APL_UNDER_90";
        String referenceOne = tempRpNo;
        String referenceTwo = policy.policyNo();
        String referenceThree = "Legacy".equalsIgnoreCase(policy.coreSystem()) ? "LH001" : "H001";
        String receiptPremiumNo = "RYP-" + paymentId;
        String receiptInterestNo = quote.hasInterest() ? "INT-" + paymentId : null;
        String paymentTypeDesc = switch (collectionMethod) {
            case "QR" -> "QR_CODE";
            case "CREDIT_CARD" -> "CREDIT_CARD";
            case "DIRECT_DEBIT" -> "DIRECT_DEBIT_ONE_TIME";
            case "CHEQUE" -> "CHEQUE";
            default -> collectionMethod;
        };
        String moduleType = "RYP_APL";
        String reconcileStatus = "MATCHED";
        String transactionStatus = policy.coreSystem() + "_UPDATED";
        String glStatus = "GL_READY";
        String smsStatus = ("QR".equals(collectionMethod) || "CREDIT_CARD".equals(collectionMethod))
                ? "SMS_QUEUED"
                : "SMS_NOT_REQUIRED";

        String sql = """
                insert into apl_payments (
                    payment_id, policy_no, collection_id, trx_id, temp_rp_no, pay_period,
                    reference_one, reference_two, reference_three, collection_method,
                    payment_type_desc, module_type, base_premium, rider_premium,
                    interest_amount, total_amount, receipt_premium_no, receipt_interest_no,
                    reconcile_status, transaction_status, gl_status, sms_status, created_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, paymentId);
            statement.setString(2, policyNo);
            statement.setString(3, collectionId);
            statement.setString(4, trxId);
            statement.setString(5, tempRpNo);
            statement.setString(6, payPeriod);
            statement.setString(7, referenceOne);
            statement.setString(8, referenceTwo);
            statement.setString(9, referenceThree);
            statement.setString(10, collectionMethod);
            statement.setString(11, paymentTypeDesc);
            statement.setString(12, moduleType);
            statement.setDouble(13, quote.basePremium());
            statement.setDouble(14, quote.riderPremium());
            statement.setDouble(15, quote.interestAmount());
            statement.setDouble(16, quote.totalAmount());
            statement.setString(17, receiptPremiumNo);
            statement.setString(18, receiptInterestNo);
            statement.setString(19, reconcileStatus);
            statement.setString(20, transactionStatus);
            statement.setString(21, glStatus);
            statement.setString(22, smsStatus);
            statement.executeUpdate();
            return findAplPayment(paymentId);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to create APL payment.", exception);
        }
    }

    AplPayment findAplPayment(String paymentId) {
        String sql = """
                select payment_id, policy_no, collection_id, trx_id, temp_rp_no, pay_period,
                       reference_one, reference_two, reference_three, collection_method,
                       payment_type_desc, module_type, base_premium, rider_premium,
                       interest_amount, total_amount, receipt_premium_no, receipt_interest_no,
                       reconcile_status, transaction_status, gl_status, sms_status,
                       payment_status, paid_amount, response_code, processed_at, created_at
                from apl_payments
                where payment_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, paymentId);
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next() ? aplPayment(resultSet) : null;
            }
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load APL payment.", exception);
        }
    }

    List<AplPayment> findAplPayments() {
        String sql = """
                select payment_id, policy_no, collection_id, trx_id, temp_rp_no, pay_period,
                       reference_one, reference_two, reference_three, collection_method,
                       payment_type_desc, module_type, base_premium, rider_premium,
                       interest_amount, total_amount, receipt_premium_no, receipt_interest_no,
                       reconcile_status, transaction_status, gl_status, sms_status,
                       payment_status, paid_amount, response_code, processed_at, created_at
                from apl_payments
                order by created_at desc
                """;
        List<AplPayment> payments = new ArrayList<>();
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql);
                ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                payments.add(aplPayment(resultSet));
            }
            return payments;
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to load APL payments.", exception);
        }
    }

    AplPayment updateAplPaymentStatus(String paymentId, String paymentResult, String responseCode, double paidAmount) {
        AplPayment payment = findAplPayment(paymentId);
        if (payment == null) {
            throw new IllegalArgumentException("APL payment not found: " + paymentId);
        }
        if ("SUCCESS".equals(payment.paymentStatus())) {
            return payment;
        }

        boolean successResult = "SUCCESS".equalsIgnoreCase(paymentResult) || "0".equals(responseCode);
        boolean amountMatched = Math.abs(payment.totalAmount() - paidAmount) < 0.01;
        String paymentStatus = successResult ? "SUCCESS" : "FAILED";
        String reconcileStatus = successResult && amountMatched ? "MATCHED" : successResult ? "UNMATCHED" : "FAILED";
        String transactionStatus = successResult && amountMatched ? payment.transactionStatus() : "WAIT_RECONCILE";
        String glStatus = successResult && amountMatched ? "GL_READY" : "GL_HOLD";
        String smsStatus = successResult && amountMatched
                && ("QR".equals(payment.collectionMethod()) || "CREDIT_CARD".equals(payment.collectionMethod()))
                        ? "SMS_QUEUED"
                        : "SMS_NOT_REQUIRED";

        String sql = """
                update apl_payments
                set payment_status = ?,
                    paid_amount = ?,
                    response_code = ?,
                    reconcile_status = ?,
                    transaction_status = ?,
                    gl_status = ?,
                    sms_status = ?,
                    processed_at = datetime('now')
                where payment_id = ?
                """;
        try (Connection connection = connect();
                PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, paymentStatus);
            statement.setDouble(2, paidAmount);
            statement.setString(3, responseCode);
            statement.setString(4, reconcileStatus);
            statement.setString(5, transactionStatus);
            statement.setString(6, glStatus);
            statement.setString(7, smsStatus);
            statement.setString(8, paymentId);
            statement.executeUpdate();
            return findAplPayment(paymentId);
        } catch (SQLException exception) {
            throw new IllegalStateException("Unable to update APL payment status.", exception);
        }
    }

    private PaymentChannel paymentChannel(ResultSet resultSet) throws SQLException {
        return new PaymentChannel(
                resultSet.getString("channel_code"),
                resultSet.getString("channel_name"),
                resultSet.getString("phase"),
                resultSet.getInt("is_enabled") == 1,
                resultSet.getInt("allow_apl") == 1,
                resultSet.getInt("allow_interest") == 1,
                resultSet.getInt("credit_card_required") == 1,
                resultSet.getString("remark"));
    }

    private AplPolicy aplPolicy(ResultSet resultSet) throws SQLException {
        return new AplPolicy(
                resultSet.getString("policy_no"),
                resultSet.getString("customer_name"),
                resultSet.getString("app_source"),
                resultSet.getString("core_system"),
                resultSet.getInt("apl_days"),
                resultSet.getDouble("base_premium"),
                resultSet.getDouble("rider_premium"),
                resultSet.getDouble("interest_amount"),
                resultSet.getInt("allow_credit_card") == 1,
                resultSet.getString("status"));
    }

    private AplPayment aplPayment(ResultSet resultSet) throws SQLException {
        return new AplPayment(
                resultSet.getString("payment_id"),
                resultSet.getString("policy_no"),
                resultSet.getString("collection_id"),
                resultSet.getString("trx_id"),
                resultSet.getString("temp_rp_no"),
                resultSet.getString("pay_period"),
                resultSet.getString("reference_one"),
                resultSet.getString("reference_two"),
                resultSet.getString("reference_three"),
                resultSet.getString("collection_method"),
                resultSet.getString("payment_type_desc"),
                resultSet.getString("module_type"),
                resultSet.getDouble("base_premium"),
                resultSet.getDouble("rider_premium"),
                resultSet.getDouble("interest_amount"),
                resultSet.getDouble("total_amount"),
                resultSet.getString("receipt_premium_no"),
                resultSet.getString("receipt_interest_no"),
                resultSet.getString("reconcile_status"),
                resultSet.getString("transaction_status"),
                resultSet.getString("gl_status"),
                resultSet.getString("sms_status"),
                resultSet.getString("payment_status"),
                resultSet.getDouble("paid_amount"),
                resultSet.getString("response_code"),
                resultSet.getString("processed_at"),
                resultSet.getString("created_at"));
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

record ProjectItem(
        String projectCode,
        String title,
        String sourceDocument,
        String updatedAt) {
}

record ProjectDetail(
        String projectCode,
        String title,
        String sourceDocument,
        String objectives,
        String background,
        String requirements,
        String createdAt,
        String updatedAt) {
}

record EpicItem(
        String epicCode,
        String title,
        String description,
        String status,
        String updatedAt) {
}

record FeatureItem(
        String featureCode,
        String epicCode,
        int featureNo,
        String title,
        String description,
        String status) {
}

record UserStoryItem(
        String storyCode,
        String featureCode,
        int storyNo,
        String title,
        String description,
        String status) {
}

record ImpactAnalysisItem(
        String iaCode,
        String featureCode,
        String title,
        String solution,
        String status) {
}

record PaymentChannel(
        String channelCode,
        String channelName,
        String phase,
        boolean isEnabled,
        boolean allowApl,
        boolean allowInterest,
        boolean creditCardRequired,
        String remark) {
}

record AplEligibility(
        String policyNo,
        boolean eligible,
        boolean validProduct,
        boolean validPolicyStatus,
        boolean validAplStatus,
        boolean hasInterest,
        String message) {
}

record AplPreparedPolicy(
        String policyNo,
        String customerName,
        String appSource,
        String coreSystem,
        String agentCode,
        String exclusiveCode,
        boolean eligible,
        double totalAmount) {
}

record AplPolicy(
        String policyNo,
        String customerName,
        String appSource,
        String coreSystem,
        int aplDays,
        double basePremium,
        double riderPremium,
        double interestAmount,
        boolean allowCreditCard,
        String status) {
}

record AplQuote(
        String policyNo,
        double basePremium,
        double riderPremium,
        double interestAmount,
        double totalPremium,
        double totalAmount,
        boolean hasInterest,
        boolean allowCreditCard) {
}

record AplPayment(
        String paymentId,
        String policyNo,
        String collectionId,
        String trxId,
        String tempRpNo,
        String payPeriod,
        String referenceOne,
        String referenceTwo,
        String referenceThree,
        String collectionMethod,
        String paymentTypeDesc,
        String moduleType,
        double basePremium,
        double riderPremium,
        double interestAmount,
        double totalAmount,
        String receiptPremiumNo,
        String receiptInterestNo,
        String reconcileStatus,
        String transactionStatus,
        String glStatus,
        String smsStatus,
        String paymentStatus,
        double paidAmount,
        String responseCode,
        String processedAt,
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
