package ro.platformamedicala.dto.quiz;

import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class QuestionDTO {
    public UUID id;
    public String text;
    public String imageUrl; // coloana legacy, single (poate fi null)
    public List<String> images; // imaginile din question_images (R2), ordonate
    public List<AnswerOptionDTO> answers;

    public static QuestionDTO fromEntity(Question question, List<Answer> answers, List<QuestionImage> questionImages) {
        QuestionDTO dto = new QuestionDTO();
        dto.id = question.getId();
        dto.text = question.getText();
        dto.imageUrl = question.getImageUrl();

        dto.images = questionImages.stream()
                .map(img -> img.imageUrl)
                .toList();

        List<AnswerOptionDTO> options = new ArrayList<>(answers.size());
        for (int i = 0; i < answers.size(); i++) {
            options.add(AnswerOptionDTO.fromEntity(answers.get(i), i));
        }

        dto.answers = options;
        return dto;
    }
}
