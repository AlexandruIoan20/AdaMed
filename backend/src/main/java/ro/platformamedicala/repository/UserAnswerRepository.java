package ro.platformamedicala.repository;

import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.UserAnswer;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class UserAnswerRepository implements PanacheRepository<UserAnswer> {
    public Set<UUID> answeredQuestionIds(UUID sessionId) {
        List<UUID> ids = getEntityManager()
                .createQuery("select distinct ua.question.id from UserAnswer ua where ua.session.id = :sid", UUID.class)
                .setParameter("sid", sessionId)
                .getResultList();
        return new HashSet<>(ids);
    }

    public int countAnsweredQuestions(UUID sessionId) {
        Long count = getEntityManager()
                .createQuery("select count(distinct ua.question.id) from UserAnswer ua where ua.session.id = :sid", Long.class)
                .setParameter("sid", sessionId)
                .getSingleResult();
        return count.intValue();
    }
}
