package ro.platformamedicala.service.quiz.helpers;

import jakarta.enterprise.context.ApplicationScoped;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.SessionMode;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@ApplicationScoped
public class PracticeOptionStrategy extends AbstractShuffleStrategy {
    private static final int OPTIONS_COUNT = 5;

    public SessionMode mode () {
        return SessionMode.PRACTICE;
    }

    @Override
    public List<Answer> selectOptions(List<Answer> answers, Random rng) {
        List<Answer> shuffled = stableShuffle(answers, rng);

        int take = Math.min(OPTIONS_COUNT, shuffled.size());
        List<Answer> chosen = new ArrayList<>(shuffled.subList(0, take));
        if(chosen.stream().noneMatch(a -> Boolean.TRUE.equals(a.getIsCorrect()))) {
            shuffled.stream().skip(take)
                    .filter(a -> Boolean.TRUE.equals(a.getIsCorrect()))
                    .findFirst()
                    .ifPresent(c -> {
                        chosen.set(take - 1, c);
                        Collections.shuffle(chosen, rng);
                    });

        }

        return chosen;
    }
}
