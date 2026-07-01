FROM eclipse-temurin:21-jdk AS build

WORKDIR /app
COPY src ./src
COPY lib ./lib
RUN mkdir out && javac -encoding UTF-8 -d out src/main/java/com/example/ticket/*.java

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/out ./out
COPY --from=build /app/lib ./lib

ENV PORT=8080
ENV SQLITE_DB_FILE=/app/data/tickets.db
EXPOSE 8080

CMD ["java", "-Dfile.encoding=UTF-8", "-Dsun.jnu.encoding=UTF-8", "-cp", "out:lib/sqlite-jdbc.jar", "com.example.ticket.WebMain"]
