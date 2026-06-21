package ro.platformamedicala.service.quiz.helpers;

import ro.platformamedicala.entities.Answer;

import java.util.*;
import java.util.stream.Collectors;

public abstract class AbstractShuffleStrategy implements QuestionOptionStrategy {
    protected List<Answer> stableShuffle(List<Answer> answers, Random rng) {
        List<Answer> base = answers.stream()
                .sorted(Comparator.comparing(Answer::getId))
                .collect(Collectors.toCollection(ArrayList::new));

        Collections.shuffle(base, rng);
        return base;
    }
}
