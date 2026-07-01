package com.example.ticket;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class PantipSearchClient {
    private static final Pattern TOPIC_LINK_PATTERN = Pattern.compile(
            "<a[^>]+href=[\"'](https://pantip\\.com/topic/(\\d+)|/topic/(\\d+))[^\"']*[\"'][^>]*>(.*?)</a>",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    List<PantipTopic> search(String keyword, int limit) throws IOException, InterruptedException {
        String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
        URI uri = URI.create("https://pantip.com/search?q=" + encodedKeyword);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "TicketManagementDemo/1.0")
                .header("Accept", "text/html")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Pantip returned HTTP " + response.statusCode());
        }

        Map<String, PantipTopic> topicsById = new LinkedHashMap<>();
        Matcher matcher = TOPIC_LINK_PATTERN.matcher(response.body());
        while (matcher.find() && topicsById.size() < limit) {
            String topicId = matcher.group(2) != null ? matcher.group(2) : matcher.group(3);
            String rawUrl = matcher.group(1);
            String url = rawUrl.startsWith("http") ? rawUrl : "https://pantip.com" + rawUrl;
            String title = cleanHtml(matcher.group(4));
            if (!title.isBlank()) {
                topicsById.putIfAbsent(topicId, new PantipTopic(topicId, keyword, title, url, ""));
            }
        }
        return new ArrayList<>(topicsById.values());
    }

    String fetchTopicContent(String url) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "TicketManagementDemo/1.0")
                .header("Accept", "text/html")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            return "";
        }

        String html = response.body();
        String description = extractMetaContent(html, "description");
        if (!description.isBlank()) {
            return description;
        }

        String ogDescription = extractMetaContent(html, "og:description");
        if (!ogDescription.isBlank()) {
            return ogDescription;
        }

        return trimToLength(cleanHtml(html), 1500);
    }

    private String extractMetaContent(String html, String name) {
        Pattern pattern = Pattern.compile(
                "<meta[^>]+(?:name|property)=[\"']" + Pattern.quote(name)
                        + "[\"'][^>]+content=[\"']([^\"']*)[\"'][^>]*>",
                Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher matcher = pattern.matcher(html);
        if (matcher.find()) {
            return cleanHtml(matcher.group(1));
        }
        return "";
    }

    private String trimToLength(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength).trim() + "...";
    }

    private String cleanHtml(String value) {
        return value
                .replaceAll("<[^>]+>", " ")
                .replace("&quot;", "\"")
                .replace("&amp;", "&")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
