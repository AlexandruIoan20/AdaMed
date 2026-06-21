package ro.platformamedicala.service.quiz;

import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.SessionMode;
import ro.platformamedicala.service.quiz.helpers.QuestionOptionsStrategyFactory;

import java.util.List;
import java.util.Random;
import java.util.UUID;

@ApplicationScoped
public class QuestionOptionsService {
    private final QuestionOptionsStrategyFactory factory;

    public QuestionOptionsService(QuestionOptionsStrategyFactory factory) {
        this.factory = factory;
    }

    public List<Answer> optionsFor(UUID sessionId, UUID questionId, SessionMode mode, List<Answer> answers) {
        Random rng = new Random(mix(sessionId, questionId));
        return factory.forMode(mode).selectOptions(answers, rng);
    }

    private static long mix(UUID a, UUID b) {
        long h = a.getMostSignificantBits();
        h = h * 31 + a.getLeastSignificantBits();
        h = h * 31 + b.getMostSignificantBits();
        h = h * 31 + b.getLeastSignificantBits();

        return h;
    }
}
