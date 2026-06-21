package ro.platformamedicala.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.QuizSession;
import ro.platformamedicala.entities.SessionMode;
import ro.platformamedicala.entities.SessionStatus;
import ro.platformamedicala.entities.Subject;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class SubjectRepository implements PanacheRepository<Subject> {
    public Set<UUID> answeredQuestionIds(UUID sessionId) {
        return new HashSet<>(getEntityManager()
                .createQuery("select distinct ua.question.id from UserAnswer ua where ua.session.id = :sid", UUID.class)
                .setParameter("sid", sessionId)
                .getResultList());
    }

    public int countAnsweredQuestions(UUID sessionId) {
        return getEntityManager()
                .createQuery("select count(distinct ua.question.id) from UserAnswer ua where ua.session.id = :sid", Long.class)
                .setParameter("sid", sessionId)
                .getSingleResult()
                .intValue();
    }

    public long countSolvedQuestions(UUID userId, UUID subjectId, SessionMode mode) {
        return getEntityManager()
                .createQuery("select count(distinct ua.question.id) from UserAnswer ua "
                        + "where ua.user.id = :uid and ua.question.subject.id = :sid and ua.session.mode = :mode", Long.class)
                .setParameter("uid", userId)
                .setParameter("sid", subjectId)
                .setParameter("mode", mode)
                .getSingleResult();
    }

    public QuizSession findActiveSession(UUID userId, UUID subjectId, SessionMode mode) {
        return QuizSession.<QuizSession>find(
                        "user.id = ?1 and subject.id = ?2 and status = ?3 and mode = ?4",
                        userId, subjectId, SessionStatus.ACTIVE, mode)
                .firstResult();
    }
}
