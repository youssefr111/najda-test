package com.najda.backend.user.repository;

import com.najda.backend.user.model.FirstResponderApplicationDocument;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FirstResponderApplicationDocumentRepository extends JpaRepository<FirstResponderApplicationDocument, Long> {
    List<FirstResponderApplicationDocument> findByApplicationId(Long applicationId);
}