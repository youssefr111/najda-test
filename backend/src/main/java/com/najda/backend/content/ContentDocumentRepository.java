package com.najda.backend.content;

import java.time.OffsetDateTime;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Plain JDBC on purpose: a document is always read and replaced as one unit, and a
 * single compare-and-set {@code UPDATE ... WHERE version = ?} is the clearest, most
 * dependable way to write a {@code jsonb} column without ORM type mapping. It still
 * joins the surrounding Spring transaction.
 */
@Repository
public class ContentDocumentRepository {

    private static final String COLUMNS = "doc_key, CAST(content AS text) AS content, version, updated_at, updated_by";

    private static final RowMapper<ContentDocument> ROW = (rs, rowNum) -> new ContentDocument(
            rs.getString("doc_key"),
            rs.getString("content"),
            rs.getLong("version"),
            rs.getObject("updated_at", OffsetDateTime.class).toInstant(),
            rs.getObject("updated_by", Long.class));

    private final JdbcClient jdbc;

    public ContentDocumentRepository(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public Optional<ContentDocument> find(String key) {
        return jdbc.sql("SELECT " + COLUMNS + " FROM content_documents WHERE doc_key = :key")
                .param("key", key)
                .query(ROW)
                .optional();
    }

    /**
     * Replaces the document only if it is still at {@code expectedVersion}.
     *
     * @return the stored document, or empty when someone else saved first
     */
    public Optional<ContentDocument> replace(String key, String json, long expectedVersion, Long updatedBy) {
        return jdbc.sql("UPDATE content_documents "
                        + "SET content = CAST(:content AS jsonb), version = version + 1, "
                        + "updated_at = now(), updated_by = :updatedBy "
                        + "WHERE doc_key = :key AND version = :expectedVersion "
                        + "RETURNING " + COLUMNS)
                .param("content", json)
                .param("updatedBy", updatedBy)
                .param("key", key)
                .param("expectedVersion", expectedVersion)
                .query(ROW)
                .optional();
    }

    /** Creates the document only if the key is not taken; never touches an existing (possibly edited) one. */
    public boolean insertIfAbsent(String key, String json) {
        return jdbc.sql("INSERT INTO content_documents (doc_key, content) VALUES (:key, CAST(:content AS jsonb)) "
                        + "ON CONFLICT (doc_key) DO NOTHING")
                .param("key", key)
                .param("content", json)
                .update() > 0;
    }
}
