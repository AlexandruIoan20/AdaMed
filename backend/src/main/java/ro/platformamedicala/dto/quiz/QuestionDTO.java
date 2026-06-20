package ro.platformamedicala.dto.quiz;

import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.Question;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public class QuestionDTO {
    public UUID id;
    public String text;
    public String imageUrl;
    public List<AnswerOptionDTO> answers;

    public static QuestionDTO fromEntity(Question question, List<Answer> answers) {
        QuestionDTO dto = new QuestionDTO();
        dto.id = question.getId();
        dto.text = question.getText();
        dto.imageUrl = question.getImageUrl();
        dto.answers = answers.stream()
                .sorted(Comparator.comparing(a -> a.getPosition() == null ? Integer.MAX_VALUE : a.getPosition()))
                .map(AnswerOptionDTO::fromEntity)
                .toList();
        return dto;
    }
}
