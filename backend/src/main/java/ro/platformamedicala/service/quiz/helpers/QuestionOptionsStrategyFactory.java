package ro.platformamedicala.service.quiz.helpers;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Instance;
import ro.platformamedicala.entities.SessionMode;

import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class QuestionOptionsStrategyFactory {
    private final Map<SessionMode, QuestionOptionStrategy> byMode;

    public QuestionOptionsStrategyFactory(Instance<QuestionOptionStrategy> strategies) {
        this.byMode = strategies.stream()
                .collect(Collectors.toMap(QuestionOptionStrategy::mode, s -> s));
    }

    public QuestionOptionStrategy forMode(SessionMode mode) {
        QuestionOptionStrategy strategy = byMode.get(mode);
        if(strategy == null) throw new IllegalStateException("Nicio strategie disponibila pentru: " + mode);

        return strategy;
    }
}
