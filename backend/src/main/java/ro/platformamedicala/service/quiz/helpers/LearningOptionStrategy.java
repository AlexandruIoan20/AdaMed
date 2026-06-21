package ro.platformamedicala.service.quiz.helpers;

import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.SessionMode;

import java.util.List;
import java.util.Random;

@ApplicationScoped
public class LearningOptionStrategy extends AbstractShuffleStrategy {
    public SessionMode mode()  {
        return SessionMode.LEARNING;
    }

    @Override
    public List<Answer> selectOptions(List<Answer> answers, Random rng) {
        return stableShuffle(answers, rng);
    }
}
