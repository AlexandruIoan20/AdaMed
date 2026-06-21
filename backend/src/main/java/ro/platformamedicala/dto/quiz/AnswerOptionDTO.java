package ro.platformamedicala.dto.quiz;

import ro.platformamedicala.entities.Answer;

import java.util.UUID;

// Optiune trimisa spre frontend INAINTE de submit.
// NU contine niciodata isCorrect — altfel raspunsul ar fi vizibil in DevTools.
public class AnswerOptionDTO {
    public UUID id;
    public String text;
    public String imageUrl;
    public Integer position;

    public static AnswerOptionDTO fromEntity(Answer answer, int position) {
        AnswerOptionDTO dto = new AnswerOptionDTO();
        dto.id = answer.getId();
        dto.text = answer.getText();
        dto.imageUrl = answer.getImageUrl();
        dto.position = position;
        return dto;
    }
}
