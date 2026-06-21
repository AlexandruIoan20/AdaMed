package ro.platformamedicala.service.quiz.helpers;

import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.SessionMode;

import java.util.List;
import java.util.Random;

public interface QuestionOptionStrategy {
    SessionMode mode();
    List<Answer> selectOptions(List<Answer> answers, Random rng);
}
