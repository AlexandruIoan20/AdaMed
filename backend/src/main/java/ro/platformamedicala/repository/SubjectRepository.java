package ro.platformamedicala.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.Subject;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class SubjectRepository implements PanacheRepository<Subject> {
    public Set<UUID> answeredQuestionIds(UUID sessionId) {
        return new HashSet<>(getEntityManager()
                .createQuery("select distinct ua.question.id from UserAnswer ua where ua.quizSession.id = :sid", UUID.class)
                .setParameter("sid", sessionId)
                .getResultList());
    }

    public int countAnsweredQuestions(UUID sessionId) {
        return getEntityManager()
                .createQuery("select count(distinct ua.question.id) from UserAnswer ua where ua.quizSession.id = :sid", Long.class)
                .setParameter("sid", sessionId)
                .getSingleResult()
                .intValue();
    }

    public long countSolvedQuestions(UUID userId, UUID subjectId) {
        return getEntityManager()
                .createQuery("select count(distinct ua.question.id) from UserAnswer ua "
                        + "where ua.user.id = :uid and ua.question.subject.id = :sid", Long.class)
                .setParameter("uid", userId)
                .setParameter("sid", subjectId)
                .getSingleResult();
    }
}
