package ro.platformamedicala.dto.quiz;

import ro.platformamedicala.entities.QuizSession;
import ro.platformamedicala.entities.SessionMode;
import ro.platformamedicala.entities.SessionStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public class SessionResultDTO {
    public UUID sessionId;
    public UUID subjectId;
    public SessionStatus status;
    public Integer totalQuestions;
    public Integer correctAnswers;
    public Integer answeredQuestions;
    public LocalDateTime startedAt;
    public LocalDateTime finishedAt;
    public SessionMode mode;

    public static SessionResultDTO fromEntity(QuizSession session, int answeredQuestions) {
        SessionResultDTO dto = new SessionResultDTO();
        dto.sessionId = session.getId();
        dto.subjectId = session.getSubject() != null ? session.getSubject().getId() : null;
        dto.status = session.getStatus();
        dto.totalQuestions = session.getTotalQuestions();
        dto.correctAnswers = session.getCorrectAnswers();
        dto.answeredQuestions = answeredQuestions;
        dto.startedAt = session.getStartedAt();
        dto.finishedAt = session.getFinishedAt();
        dto.mode = session.getMode();
        return dto;
    }
}
