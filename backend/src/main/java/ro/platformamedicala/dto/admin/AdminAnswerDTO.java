package ro.platformamedicala.dto.admin;

import ro.platformamedicala.entities.Answer;

import java.util.UUID;

public class AdminAnswerDTO {
    public UUID id;
    public String text;
    public String imageUrl;
    public Boolean isCorrect;
    public Integer position;

    public static AdminAnswerDTO fromEntity(Answer answer) {
        AdminAnswerDTO dto = new AdminAnswerDTO();
        dto.id = answer.getId();
        dto.text = answer.getText();
        dto.imageUrl = answer.getImageUrl();
        dto.isCorrect = answer.getIsCorrect();
        dto.position = answer.getPosition();
        return dto;
    }
}
