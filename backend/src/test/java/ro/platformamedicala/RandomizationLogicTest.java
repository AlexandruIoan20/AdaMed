package ro.platformamedicala;

import org.junit.jupiter.api.Test;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.service.quiz.helpers.LearningOptionStrategy;
import ro.platformamedicala.service.quiz.helpers.PracticeOptionStrategy;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test pur (fără Quarkus/DB) pe logica de randomizare a opțiunilor.
 * Demonstrează dacă strategiile chiar amestecă / subsetează.
 */
public class RandomizationLogicTest {

    private List<Answer> tenAnswers() {
        List<Answer> answers = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            Answer a = new Answer();
            a.setId(UUID.randomUUID());
            a.setText("opt " + i);
            a.setIsCorrect(i < 5); // primele 5 "corecte"
            a.setPosition(i);
            answers.add(a);
        }
        return answers;
    }

    private List<Boolean> correctnessOrder(List<Answer> opts) {
        List<Boolean> order = new ArrayList<>();
        for (Answer a : opts) order.add(a.getIsCorrect());
        return order;
    }

    @Test
    void learning_returnsAllTen_inShuffledOrder() {
        List<Answer> input = tenAnswers();
        LearningOptionStrategy strat = new LearningOptionStrategy();

        List<Answer> out = strat.selectOptions(input, new Random(123456789L));

        assertEquals(10, out.size(), "Learning trebuie să întoarcă toate cele 10");

        // Ordinea de intrare era corecte-întâi (true,true,...,false,false). După shuffle NU mai e.
        List<Boolean> inputOrder = correctnessOrder(input);
        List<Boolean> outOrder = correctnessOrder(out);
        assertNotEquals(inputOrder, outOrder, "Ordinea NU este amestecată (corecte-întâi păstrat)");
    }

    @Test
    void practice_returnsExactlyFive_withAtLeastOneCorrect() {
        List<Answer> input = tenAnswers();
        PracticeOptionStrategy strat = new PracticeOptionStrategy();

        List<Answer> out = strat.selectOptions(input, new Random(987654321L));

        assertEquals(5, out.size(), "Practice trebuie să întoarcă exact 5");
        assertTrue(out.stream().anyMatch(a -> Boolean.TRUE.equals(a.getIsCorrect())),
                "Practice trebuie să conțină minim o corectă");
    }

    @Test
    void deterministic_sameSeedSameResult() {
        List<Answer> input = tenAnswers();
        LearningOptionStrategy strat = new LearningOptionStrategy();

        List<UUID> first = strat.selectOptions(input, new Random(42L)).stream().map(Answer::getId).toList();
        List<UUID> second = strat.selectOptions(input, new Random(42L)).stream().map(Answer::getId).toList();

        assertEquals(first, second, "Aceeași sămânță trebuie să dea exact aceeași ordine");
    }
}
