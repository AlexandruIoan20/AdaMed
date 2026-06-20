package ro.platformamedicala.dto.quiz;

import java.util.List;
import java.util.UUID;

// Raspuns trimis DUPA submit. Aici se dezvaluie corectitudinea.
// Frontend-ul coloreaza optiunile pe baza acestor liste:
//   verde      = id in correctAnswerIds && id in selectedAnswerIds
//   rosu       = id in selectedAnswerIds && id NOT in correctAnswerIds
//   portocaliu = id in correctAnswerIds && id NOT in selectedAnswerIds (omis)
public class AnswerResultDTO {
    public UUID questionId;
    public List<UUID> correctAnswerIds;
    public List<UUID> selectedAnswerIds;
    public boolean wasCorrect; // tot-sau-nimic: exact cele corecte bifate
    public String explanation;

    public AnswerResultDTO() {
    }

    public AnswerResultDTO(UUID questionId, List<UUID> correctAnswerIds, List<UUID> selectedAnswerIds,
                           boolean wasCorrect, String explanation) {
        this.questionId = questionId;
        this.correctAnswerIds = correctAnswerIds;
        this.selectedAnswerIds = selectedAnswerIds;
        this.wasCorrect = wasCorrect;
        this.explanation = explanation;
    }
}
