package ro.platformamedicala.dto.admin;

import ro.platformamedicala.dto.quiz.QuestionImageDTO;
import ro.platformamedicala.entities.Answer;
import ro.platformamedicala.entities.Question;
import ro.platformamedicala.entities.QuestionImage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class AdminQuestionDTO {
    public UUID id;
    public UUID facultySubjectId;
    public String text;
    public String explanation;
    public String imageUrl; // legacy (questions.image_url)
    public List<QuestionImageDTO> images;
    public List<AdminAnswerDTO> answers;
    public LocalDateTime createdAt;

    public static AdminQuestionDTO of(Question question, List<Answer> answers, List<QuestionImage> images) {
        AdminQuestionDTO dto = new AdminQuestionDTO();
        dto.id = question.getId();
        dto.facultySubjectId = question.getFacultySubject().getId();
        dto.text = question.getText();
        dto.explanation = question.getExplanation();
        dto.imageUrl = question.getImageUrl();
        dto.images = images.stream().map(QuestionImageDTO::fromEntity).toList();
        dto.answers = answers.stream().map(AdminAnswerDTO::fromEntity).toList();
        dto.createdAt = question.getCreatedAt();
        return dto;
    }
}
