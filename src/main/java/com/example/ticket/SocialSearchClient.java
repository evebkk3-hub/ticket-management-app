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

final class SocialSearchClient {
    private static final Pattern REDDIT_RESULT_PATTERN = Pattern.compile(
            "data-fullname=\"t3_([^\"]+)\".*?<a href=\"(https://old\\.reddit\\.com/r/[^\"]+/comments/[^\"]+)\" class=\"search-title[^\"]*\"\\s*>(.*?)</a>(.*?)(?=<div class=\" search-result search-result-|</div></div></div></div>)",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final PantipSearchClient pantipSearchClient = new PantipSearchClient();

    List<SocialPost> search(String source, String keyword, int limit) throws IOException, InterruptedException {
        return switch (source.toUpperCase()) {
            case "PANTIP" -> searchPantip(keyword, limit);
            case "REDDIT" -> searchReddit(keyword, limit);
            default -> throw new IllegalArgumentException("Unsupported source: " + source);
        };
    }

    private List<SocialPost> searchPantip(String keyword, int limit) throws IOException, InterruptedException {
        List<SocialPost> posts = new ArrayList<>();
        for (PantipTopic topic : pantipSearchClient.search(keyword, limit)) {
            posts.add(new SocialPost(
                    "PANTIP",
                    topic.topicId(),
                    keyword,
                    topic.title(),
                    topic.url(),
                    "",
                    pantipSearchClient.fetchTopicContent(topic.url()),
                    ""));
        }
        return posts;
    }

    private List<SocialPost> searchReddit(String keyword, int limit) throws IOException, InterruptedException {
        String encodedKeyword = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
        URI uri = URI.create("https://old.reddit.com/search?q=" + encodedKeyword + "&sort=new");
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "Mozilla/5.0 TicketManagementDemo/1.0")
                .header("Accept", "text/html")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Reddit returned HTTP " + response.statusCode());
        }

        Map<String, SocialPost> postsById = new LinkedHashMap<>();
        Matcher matcher = REDDIT_RESULT_PATTERN.matcher(response.body());
        while (matcher.find() && postsById.size() < limit) {
            String id = matcher.group(1);
            String url = matcher.group(2).replace("https://old.reddit.com", "https://www.reddit.com");
            String title = cleanHtml(matcher.group(3));
            String block = matcher.group(4);
            if (id.isBlank() || title.isBlank()) {
                continue;
            }
            String content = extractFirst(block, "<div class=\"search-result-body\"><div class=\"md\">(.*?)</div>", true);
            String author = extractFirst(block, "class=\"author[^\"]*\"\\s*>(.*?)</a>", true);
            String postedAt = extractFirst(block, "datetime=\"([^\"]+)\"", false);
            postsById.putIfAbsent(id, new SocialPost(
                    "REDDIT",
                    id,
                    keyword,
                    title,
                    url,
                    author,
                    cleanHtml(content),
                    postedAt));
        }
        return new ArrayList<>(postsById.values());
    }

    private String extractFirst(String text, String patternText, boolean clean) {
        Pattern pattern = Pattern.compile(patternText, Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
        Matcher matcher = pattern.matcher(text);
        if (!matcher.find()) {
            return "";
        }
        String value = matcher.group(1);
        return clean ? cleanHtml(value) : htmlDecode(value);
    }

    private String cleanHtml(String value) {
        return htmlDecode(value.replaceAll("<[^>]+>", " "))
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String htmlDecode(String value) {
        return value
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&apos;", "'")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&#32;", " ")
                .trim();
    }
}
