package com.najda.backend.legal.repository;

import com.najda.backend.legal.model.ConsentSource;
import com.najda.backend.legal.model.LegalDocumentType;
import com.najda.backend.legal.model.LegalVersion;
import java.time.OffsetDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import javax.sql.DataSource;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Versions are append-only (the database refuses to change or delete them) and acceptances are
 * evidence rows, so this is explicit SQL: no entity lifecycle, no accidental updates.
 */
@Repository
public class LegalRepository {

    private static final String VERSION_COLUMNS = "id, document_type, version, CAST(content AS text) AS content, "
            + "CAST(change_summary AS text) AS change_summary, requires_acceptance, published_at, published_by";

    private static final RowMapper<LegalVersion> VERSION = (rs, rowNum) -> new LegalVersion(
            rs.getLong("id"),
            LegalDocumentType.valueOf(rs.getString("document_type")),
            rs.getInt("version"),
            rs.getString("content"),
            rs.getString("change_summary"),
            rs.getBoolean("requires_acceptance"),
            rs.getObject("published_at", OffsetDateTime.class).toInstant(),
            rs.getObject("published_by", Long.class));

    private final JdbcClient jdbc;

    public LegalRepository(DataSource dataSource) {
        this.jdbc = JdbcClient.create(dataSource);
    }

    public Optional<LegalVersion> findLatest(LegalDocumentType type) {
        return jdbc.sql("SELECT " + VERSION_COLUMNS + " FROM legal_document_versions "
                        + "WHERE document_type = :type ORDER BY version DESC LIMIT 1")
                .param("type", type.name())
                .query(VERSION)
                .optional();
    }

    public Optional<LegalVersion> findVersion(LegalDocumentType type, int version) {
        return jdbc.sql("SELECT " + VERSION_COLUMNS + " FROM legal_document_versions "
                        + "WHERE document_type = :type AND version = :version")
                .param("type", type.name())
                .param("version", version)
                .query(VERSION)
                .optional();
    }

    /** Newest first. */
    public List<LegalVersion> findAll(LegalDocumentType type) {
        return jdbc.sql("SELECT " + VERSION_COLUMNS + " FROM legal_document_versions "
                        + "WHERE document_type = :type ORDER BY version DESC")
                .param("type", type.name())
                .query(VERSION)
                .list();
    }

    /**
     * Appends the next version in one statement. Two admins publishing at once can't both get the
     * same number: the unique key makes the loser fail with a DuplicateKeyException.
     */
    public LegalVersion insertNext(LegalDocumentType type, String contentJson, String changeSummaryJson,
                                   boolean requiresAcceptance, Long publishedBy) {
        return jdbc.sql("INSERT INTO legal_document_versions "
                        + "(document_type, version, content, change_summary, requires_acceptance, published_by) "
                        + "SELECT :type, COALESCE(MAX(version), 0) + 1, CAST(:content AS jsonb), "
                        + "CAST(:summary AS jsonb), :requires, :publishedBy "
                        + "FROM legal_document_versions WHERE document_type = :type "
                        + "RETURNING " + VERSION_COLUMNS)
                .param("type", type.name())
                .param("content", contentJson)
                .param("summary", changeSummaryJson)
                .param("requires", requiresAcceptance)
                .param("publishedBy", publishedBy)
                .query(VERSION)
                .single();
    }

    /** The newest version that everyone has to accept; empty if the document has none. */
    public Optional<Integer> findLatestMaterialVersion(LegalDocumentType type) {
        return jdbc.sql("SELECT MAX(version) FROM legal_document_versions "
                        + "WHERE document_type = :type AND requires_acceptance")
                .param("type", type.name())
                .query(Integer.class)
                .optional();
    }

    /** For each document, the highest version this user has accepted. */
    public Map<LegalDocumentType, Integer> findHighestAcceptedVersions(long userId) {
        Map<LegalDocumentType, Integer> result = new EnumMap<>(LegalDocumentType.class);
        jdbc.sql("SELECT v.document_type, MAX(v.version) AS version FROM legal_acceptances a "
                        + "JOIN legal_document_versions v ON v.id = a.version_id "
                        + "WHERE a.user_id = :userId GROUP BY v.document_type")
                .param("userId", userId)
                .query((rs, rowNum) -> {
                    result.put(LegalDocumentType.valueOf(rs.getString("document_type")), rs.getInt("version"));
                    return null;
                })
                .list();
        return result;
    }

    /** Records acceptances; accepting the same version twice is harmless. */
    public void insertAcceptances(long userId, List<Long> versionIds, ConsentSource source) {
        for (Long versionId : versionIds) {
            jdbc.sql("INSERT INTO legal_acceptances (user_id, version_id, source) "
                            + "VALUES (:userId, :versionId, :source) ON CONFLICT (user_id, version_id) DO NOTHING")
                    .param("userId", userId)
                    .param("versionId", versionId)
                    .param("source", source.name())
                    .update();
        }
    }
}
